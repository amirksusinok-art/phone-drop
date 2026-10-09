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
      showToast('Энергия исчерпана! Она восстанавливается со временем.', 'info');
      return;
    }

    // 1% шанс на "Счастливый сигнал"
    const isLucky = Math.random() < 0.01;
    const coinsToAdd = isLucky ? 25 : 1;

    if (isLucky) {
      haptic.notification('success');
      setIsLuckyBurst(true);
      setTimeout(() => setIsLuckyBurst(false), 800);
      showToast('🍀 Счастливый сигнал! +25 Coins', 'success');
    } else {
      haptic.impact('light');
    }

    // Микро-анимация сжатия кнопки
    setTapScale(true);
    setTimeout(() => setTapScale(false), 80);

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
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md mx-auto bg-[var(--tg-theme-bg-color,#0f172a)] border-t border-white/10 rounded-t-3xl p-5 shadow-2xl flex flex-col space-y-4 animate-in slide-in-from-bottom duration-200">
        
        {/* Ручка свайпа и заголовок */}
        <div className="flex flex-col items-center">
          <div className="w-10 h-1 rounded-full bg-white/20 mb-3" />
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
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

        {/* Интерактивный телефонный диск / центральная станция пинга */}
        <div className="py-6 flex flex-col items-center justify-center relative select-none">
          {/* Концентрические кольца сигнала */}
          <div className="absolute w-56 h-56 rounded-full border border-sky-500/10 animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
          <div className="absolute w-44 h-44 rounded-full border border-sky-500/15 pointer-events-none" />

          {/* Интерактивная круглая кнопка диска */}
          <button
            onClick={handleTap}
            disabled={energy <= 0}
            className={`relative w-36 h-36 rounded-full bg-gradient-to-b from-[var(--tg-theme-secondary-bg-color,#1e293b)] to-[#090d16] border-2 flex flex-col items-center justify-center transition-transform shadow-xl ${
              isLuckyBurst ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)]' : 'border-sky-500/30'
            } ${tapScale ? 'scale-95' : 'scale-100'} active:scale-95`}
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400 mb-1">
              <PhoneCall className="w-6 h-6 stroke-[1.8]" />
            </div>
            <span className="text-xs font-bold text-white tracking-wide">
              ПИНГ
            </span>
            <span className="text-[10px] text-[var(--tg-theme-hint-color,#94a3b8)] font-mono">
              -1 ⚡
            </span>

            {/* Всплывающие цифры при кликах */}
            {floatingTexts.map(item => (
              <span
                key={item.id}
                className={`absolute pointer-events-none font-number font-extrabold text-sm animate-out fade-out slide-out-to-top duration-700 ${
                  item.isLucky ? 'text-amber-300 text-base scale-110 drop-shadow-md' : 'text-sky-300'
                }`}
                style={{ top: `${item.y - 20}px`, left: `${item.x}px` }}
              >
                {item.text}
              </span>
            ))}
          </button>

          <p className="text-[11px] text-[var(--tg-theme-hint-color,#94a3b8)] mt-5 text-center max-w-xs">
            Тапай по диску связи. Шанс 1% поймать <strong className="text-amber-300">«Счастливый сигнал» (+25 C)</strong>.
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
