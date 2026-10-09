// client/src/components/StationSheet.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Radio, Zap, X, Sparkles, Activity, ShieldCheck, Wifi } from 'lucide-react';
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
  const [ripples, setRipples] = useState([]);
  const [isLuckyBurst, setIsLuckyBurst] = useState(false);
  const [tapScale, setTapScale] = useState(false);
  const [dialRotation, setDialRotation] = useState(0);
  const [sessionEarned, setSessionEarned] = useState(0);

  // Очередь накопленных тапов для отправки на сервер батчем
  const pendingTapsRef = useRef({ count: 0, luckyHits: 0 });
  const syncTimeoutRef = useRef(null);

  // Скрываем нативную MainButton Telegram, чтобы она не перекрывала шторку
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
      showToast('Энергия исчерпана! Восстанавливается +1 в 3 сек.', 'info');
      return;
    }

    // 1% шанс на "Счастливый сигнал" (+25 Coins)
    const isLucky = Math.random() < 0.01;
    const coinsToAdd = isLucky ? 25 : 1;

    if (isLucky) {
      haptic.notification('success');
      setIsLuckyBurst(true);
      setTimeout(() => setIsLuckyBurst(false), 1000);
      showToast('🍀 Счастливый сигнал! +25 Coins', 'success');
    } else {
      haptic.impact('light');
    }

    // Микро-вращение и тактильный отклик диска
    setDialRotation(prev => prev + 15);
    setTapScale(true);
    setTimeout(() => setTapScale(false), 80);

    // Списание энергии, начисление в сессию и очередь
    setEnergy(prev => Math.max(0, prev - 1));
    setSessionEarned(prev => prev + coinsToAdd);
    pendingTapsRef.current.count += 1;
    if (isLucky) pendingTapsRef.current.luckyHits += 1;

    // Координаты клика для вылетающего числа и волны ripple
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX ? e.clientX - rect.left : rect.width / 2;
    const y = e.clientY ? e.clientY - rect.top : rect.height / 2;
    const newId = Date.now() + Math.random();

    // Добавляем ripple
    setRipples(prev => [...prev.slice(-3), { id: newId, x, y }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newId));
    }, 600);

    // Добавляем вылетающий текст
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
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-md mx-auto bg-[var(--tg-theme-bg-color,#0f172a)] border-t border-white/10 rounded-t-3xl p-5 shadow-2xl flex flex-col space-y-4 animate-in slide-in-from-bottom duration-200">
        
        {/* Ручка шторки и заголовок */}
        <div className="flex flex-col items-center">
          <div className="w-10 h-1 rounded-full bg-white/20 mb-3" />
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-tight">Станция связи</h3>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    433.92 MHz
                  </span>
                </div>
                <p className="text-[11px] text-[var(--tg-theme-hint-color,#94a3b8)]">
                  Пингуй частоты радиоэфира и собирай Coins
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl bg-white/5 text-[var(--tg-theme-hint-color,#94a3b8)] hover:text-white transition active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Шкала энергии сигнала */}
        <div className="p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--tg-theme-hint-color,#94a3b8)] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Энергия частоты
            </span>
            <span className="font-number font-bold text-white text-xs">
              {energy} / {maxEnergy}
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full transition-all duration-150 rounded-full ${
                energy < 40 ? 'bg-rose-500' : 'bg-gradient-to-r from-sky-400 to-emerald-400'
              }`}
              style={{ width: `${energyPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-[var(--tg-theme-hint-color,#94a3b8)]">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-sky-400" /> Стабильный канал
            </span>
            <span>+1 заряд в 3 сек</span>
          </div>
        </div>

        {/* 🎛️ Интерактивный тактильный радар-коммуникатор (векторный, без «ИИ-картинок в рамке») */}
        <div className="py-2 flex flex-col items-center justify-center relative select-none">
          
          {/* Пульсирующие концентрические кольца сканирования эфира */}
          <div className="absolute w-56 h-56 rounded-full border border-sky-500/10 pointer-events-none animate-ping" style={{ animationDuration: '4s' }} />
          <div className="absolute w-48 h-48 rounded-full border border-sky-500/15 pointer-events-none" />

          {/* Главная круглая сенсорная станция */}
          <button
            onClick={handleTap}
            disabled={energy <= 0}
            className={`relative w-48 h-48 sm:w-52 sm:h-52 rounded-full overflow-hidden transition-all duration-100 flex items-center justify-center cursor-pointer touch-manipulation shadow-xl ${
              isLuckyBurst
                ? 'ring-4 ring-amber-400/80 shadow-[0_0_35px_rgba(251,191,36,0.6)]'
                : 'ring-2 ring-sky-500/30 shadow-[0_0_20px_rgba(56,189,248,0.15)]'
            } ${tapScale ? 'scale-95' : 'scale-100'} active:scale-95`}
            style={{
              background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 70%, #020617 100%)'
            }}
          >
            {/* Вращающийся луч радара */}
            <div
              className="absolute inset-0 pointer-events-none animate-radar"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0deg, rgba(56, 189, 248, 0.18) 60deg, transparent 65deg)'
              }}
            />

            {/* Внешний безель с рисками частот (SVG) */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none transition-transform duration-200"
              style={{ transform: `rotate(${dialRotation}deg)` }}
              viewBox="0 0 200 200"
            >
              {/* Кольца сетки радара */}
              <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="62" fill="none" stroke="rgba(56,189,248,0.15)" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="100" cy="100" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

              {/* Засечки по кругу (12 делений) */}
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
                <line
                  key={deg}
                  x1="100"
                  y1="14"
                  x2="100"
                  y2={deg % 90 === 0 ? "24" : "19"}
                  stroke={deg % 90 === 0 ? "rgba(56,189,248,0.7)" : "rgba(255,255,255,0.2)"}
                  strokeWidth={deg % 90 === 0 ? "2" : "1"}
                  transform={`rotate(${deg} 100 100)`}
                />
              ))}

              {/* 6 тактильных отверстий телефонного диска */}
              {[30, 90, 150, 210, 270, 330].map(deg => {
                const rad = (deg * Math.PI) / 180;
                const cx = 100 + 48 * Math.cos(rad);
                const cy = 100 + 48 * Math.sin(rad);
                return (
                  <circle
                    key={deg}
                    cx={cx}
                    cy={cy}
                    r="8.5"
                    fill="rgba(15,23,42,0.85)"
                    stroke="rgba(56,189,248,0.3)"
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>

            {/* Центральная сердцевина передатчика */}
            <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-sky-400/40 shadow-inner flex flex-col items-center justify-center pointer-events-none">
              <Radio className={`w-7 h-7 text-sky-400 transition-transform ${isLuckyBurst ? 'text-amber-300 scale-125' : ''}`} />
              <span className="text-[9px] font-mono font-bold tracking-wider text-sky-200 mt-1 uppercase">
                PING
              </span>
            </div>

            {/* Всплывающие ripple-волны при тапе */}
            {ripples.map(r => (
              <span
                key={r.id}
                className="absolute w-24 h-24 rounded-full border border-sky-400/50 animate-ping pointer-events-none"
                style={{ top: `${r.y - 48}px`, left: `${r.x - 48}px`, animationDuration: '0.6s' }}
              />
            ))}

            {/* Оверлей при полной разрядке */}
            {energy <= 0 && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center text-center p-3 z-20">
                <Zap className="w-7 h-7 text-amber-400 animate-pulse mb-1.5" />
                <span className="text-xs font-bold text-white">Разряжено</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Восстановление +1 в 3с</span>
              </div>
            )}

            {/* Всплывающие числа Coins */}
            {floatingTexts.map(item => (
              <span
                key={item.id}
                className={`absolute pointer-events-none font-number font-extrabold z-30 transition-all ${
                  item.isLucky
                    ? 'text-amber-300 text-lg scale-125 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-out fade-out slide-out-to-top duration-700'
                    : 'text-sky-300 text-sm drop-shadow-md animate-out fade-out slide-out-to-top duration-500'
                }`}
                style={{ top: `${item.y - 20}px`, left: `${item.x - 10}px` }}
              >
                {item.text}
              </span>
            ))}
          </button>

          {/* Телеметрия сессии под диском */}
          <div className="flex items-center gap-3 mt-4 text-[11px]">
            <div className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/5 text-slate-300 flex items-center gap-1.5">
              <span>Сессия:</span>
              <strong className="font-number font-bold text-amber-300">+{sessionEarned} C</strong>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/5 text-[var(--tg-theme-hint-color,#94a3b8)] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Шанс x25:</span>
              <strong className="text-slate-200">1%</strong>
            </div>
          </div>
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
