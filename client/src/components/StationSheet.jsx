// client/src/components/StationSheet.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Radio, Zap, X, Sparkles, PhoneCall } from 'lucide-react';
import { api } from '../api';
import { haptic } from '../haptic';

export default function StationSheet({
  isOpen,
  onClose,
  onUpdateUser,
  showToast
}) {
  const [energy, setEnergy] = useState(250);
  const [maxEnergy, setMaxEnergy] = useState(250);
  const [floatingTexts, setFloatingTexts] = useState([]);
  const [isLuckyBurst, setIsLuckyBurst] = useState(false);
  const [tapScale, setTapScale] = useState(false);

  // Очередь накопленных тапов для отправки на сервер батчем
  const pendingTapsRef = useRef({ count: 0, luckyHits: 0 });
  const syncTimeoutRef = useRef(null);

  // Скрываем нативную MainButton Telegram, чтобы она не перекрывала шторку!
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.MainButton) return;
    if (isOpen) {
      tg.MainButton.hide();
    }
  }, [isOpen]);

  // Загрузка начального статуса энергии
  useEffect(() => {
    if (!isOpen) return;

    api.getSignalStatus()
      .then(res => {
        setEnergy(res.currentEnergy);
        setMaxEnergy(res.maxEnergy || 250);
      })
      .catch(err => console.error(err));
  }, [isOpen]);

  // Периодическая мягкая регенерация энергии в UI (1 ед. в 3 сек)
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setEnergy(prev => Math.min(250, prev + 1));
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Синхронизация тапов с бэкендом
  const flushTapsToServer = async () => {
    const { count, luckyHits } = pendingTapsRef.current;
    if (count <= 0) return;

    pendingTapsRef.current = { count: 0, luckyHits: 0 };
    try {
      const res = await api.tapStation(count, luckyHits);
      setEnergy(res.remainingEnergy);
      onUpdateUser();
    } catch (err) {
      console.error('[Tap Sync Error]:', err);
    }
  };

  const scheduleFlush = () => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(flushTapsToServer, 1200);
  };

  const handleClose = () => {
    flushTapsToServer();
    onClose();
  };

  const handleTap = (e) => {
    if (energy <= 0) {
      haptic.notification('error');
      showToast('Энергия исчерпана! Восстанавливается со временем.', 'info');
      return;
    }

    // 1% шанс на "Счастливый сигнал" (+25 Coins)
    const isLucky = Math.random() < 0.01;
    const coinsToAdd = isLucky ? 25 : 1;

    if (isLucky) {
      haptic.notification('success');
      setIsLuckyBurst(true);
      setTimeout(() => setIsLuckyBurst(false), 900);
      showToast('🍀 Счастливый сигнал! +25 Coins', 'success');
    } else {
      haptic.impact('light');
    }

    // Микро-анимация сжатия кнопки
    setTapScale(true);
    setTimeout(() => setTapScale(false), 90);

    // Списание энергии и добавление в очередь
    setEnergy(prev => Math.max(0, prev - 1));
    pendingTapsRef.current.count += 1;
    if (isLucky) pendingTapsRef.current.luckyHits += 1;

    // Всплывающий текст с координатами клика
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX ? e.clientX - rect.left : rect.width / 2;
    const y = e.clientY ? e.clientY - rect.top : rect.height / 2;
    const newId = Date.now() + Math.random();

    setFloatingTexts(prev => [
      ...prev.slice(-6),
      { id: newId, text: `+${coinsToAdd}`, isLucky, x, y }
    ]);

    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(item => item.id !== newId));
    }, 700);

    scheduleFlush();
  };

  if (!isOpen) return null;

  const energyPercent = Math.round((energy / maxEnergy) * 100);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-md mx-auto bg-[var(--tg-theme-bg-color,#0f172a)] border-t border-white/10 rounded-t-3xl p-5 shadow-2xl flex flex-col space-y-4 animate-in slide-in-from-bottom duration-200">
        
        {/* Ручка свайпа и заголовок */}
        <div className="flex flex-col items-center">
          <div className="w-10 h-1 rounded-full bg-white/20 mb-3" />
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Станция связи</h3>
                <p className="text-[11px] text-[var(--tg-theme-hint-color,#94a3b8)]">
                  Пингуй частоты и собирай Coins
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl bg-white/5 text-[var(--tg-theme-hint-color,#94a3b8)] hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Шкала энергии */}
        <div className="p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--tg-theme-hint-color,#94a3b8)] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Энергия сигнала
            </span>
            <span className="font-number font-bold text-white text-xs">
              {energy} / {maxEnergy}
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full transition-all duration-150 rounded-full ${
                energy < 30 ? 'bg-rose-500' : 'bg-sky-400'
              }`}
              style={{ width: `${energyPercent}%` }}
            />
          </div>
          <div className="text-[10px] text-[var(--tg-theme-hint-color,#94a3b8)] text-right">
            Восстановление: +1 в 3 сек.
          </div>
        </div>

        {/* Интерактивный винтажный телефонный коммуникатор */}
        <div className="py-4 flex flex-col items-center justify-center relative select-none">
          {/* Концентрические кольца сигнала */}
          <div
            className="absolute w-60 h-60 rounded-full border border-sky-500/10 animate-ping pointer-events-none"
            style={{ animationDuration: '3s' }}
          />
          <div className="absolute w-48 h-48 rounded-full border border-sky-500/15 pointer-events-none" />

          {/* Интерактивная круглая кнопка с 3D-артом коммуникатора */}
          <button
            onClick={handleTap}
            disabled={energy <= 0}
            className={`relative w-44 h-44 rounded-3xl overflow-hidden border-2 transition-transform duration-100 shadow-2xl flex items-center justify-center ${
              isLuckyBurst
                ? 'border-amber-400 ring-4 ring-amber-400/40 shadow-[0_0_25px_rgba(251,191,36,0.6)]'
                : 'border-sky-500/40 ring-2 ring-sky-500/20'
            } ${tapScale ? 'scale-90' : 'scale-100'} active:scale-90`}
          >
            {/* Изображение спутникового коммуникатора */}
            <img
              src="/station_dial.jpg"
              alt="Станция связи"
              className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-200"
              style={{ filter: energy <= 0 ? 'grayscale(80%) brightness(0.6)' : 'none' }}
            />

            {/* Внутренняя легкая градиентная маска */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

            {/* Центральный бейдж ПИНГ */}
            <div className="absolute bottom-2.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5 shadow-md">
              <span className="text-[10px] font-bold text-white tracking-wider uppercase">ПИНГ</span>
              <span className="text-[9px] font-mono font-semibold text-amber-300">-1 ⚡</span>
            </div>

            {/* Оверлей при 0 энергии */}
            {energy <= 0 && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center text-center p-2">
                <Zap className="w-6 h-6 text-slate-500 mb-1" />
                <span className="text-xs font-semibold text-slate-300">Зарядка...</span>
                <span className="text-[10px] text-slate-400">+1 в 3 сек</span>
              </div>
            )}

            {/* Всплывающие цифры при кликах */}
            {floatingTexts.map(item => (
              <span
                key={item.id}
                className={`absolute pointer-events-none font-number font-extrabold text-base animate-out fade-out slide-out-to-top duration-700 ${
                  item.isLucky
                    ? 'text-amber-300 text-lg scale-125 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                    : 'text-sky-300 drop-shadow-md'
                }`}
                style={{ top: `${item.y - 15}px`, left: `${item.x}px` }}
              >
                {item.text}
              </span>
            ))}
          </button>

          <p className="text-[11px] text-[var(--tg-theme-hint-color,#94a3b8)] mt-4 text-center max-w-xs">
            Тапай по станции связи. Шанс 1% поймать <strong className="text-amber-300">«Счастливый сигнал» (+25 C)</strong>.
          </p>
        </div>

        {/* Кнопка закрытия */}
        <button
          onClick={handleClose}
          className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition active:scale-[0.98]"
        >
          Готово
        </button>
      </div>
    </div>
  );
}
