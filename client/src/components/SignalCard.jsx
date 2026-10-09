// client/src/components/SignalCard.jsx
import React, { useState, useEffect } from 'react';
import { Radio, Zap, Coins, ArrowRight } from 'lucide-react';
import { api } from '../api';
import { haptic } from '../haptic';

export default function SignalCard({
  onOpenStation,
  onUpdateUser,
  showToast
}) {
  const [signal, setSignal] = useState(null);
  const [claiming, setClaiming] = useState(false);

  const loadSignal = () => {
    api.getSignalStatus()
      .then(res => setSignal(res))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    loadSignal();
    const interval = setInterval(loadSignal, 15000); // авто-обновление каждые 15 сек
    return () => clearInterval(interval);
  }, []);

  const handleClaim = async () => {
    if (!signal || signal.uncollectedCoins <= 0 || claiming) return;

    setClaiming(true);
    haptic.impact('medium');
    try {
      const res = await api.claimSignal();
      haptic.notification('success');
      showToast(`Собрано +${res.claimedCoins} Coins с вышки связи!`, 'success');
      onUpdateUser();
      loadSignal();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setClaiming(false);
    }
  };

  const uncollected = signal?.uncollectedCoins || 0;
  const rate = signal?.ratePerHour || 3;
  const progress = signal?.progressPercent || 0;

  return (
    <div className="p-3.5 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <Radio className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white">Вышка связи</span>
              <span className="text-[10px] text-[var(--tg-theme-hint-color,#94a3b8)] font-number">
                (+{rate} C/ч)
              </span>
            </div>
            <div className="text-[11px] font-number font-medium text-amber-300">
              +{uncollected} Coins накоплено
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Кнопка "Забрать" */}
          <button
            onClick={handleClaim}
            disabled={uncollected <= 0 || claiming}
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition duration-150 active:scale-[0.98] ${
              uncollected > 0
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold'
                : 'bg-white/5 text-[var(--tg-theme-hint-color,#94a3b8)] cursor-not-allowed opacity-50'
            }`}
          >
            {claiming ? '...' : 'Забрать'}
          </button>

          {/* Кнопка быстрого перехода в кликер */}
          <button
            onClick={() => {
              haptic.selection();
              onOpenStation();
            }}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-sky-400 transition active:scale-[0.98]"
            title="Открыть станцию связи (кликер)"
          >
            <Zap className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Тонкий 2px прогресс-бар накопления за 8 часов */}
      <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-sky-400 to-amber-400 transition-all duration-300 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
