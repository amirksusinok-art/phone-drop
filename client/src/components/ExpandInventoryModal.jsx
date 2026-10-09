// client/src/components/ExpandInventoryModal.jsx
import React, { useState } from 'react';
import { PackagePlus, Coins, X, Check } from 'lucide-react';
import { haptic } from '../haptic';

const TIERS = {
  50: { next: 75, price: 2000 },
  75: { next: 100, price: 5000 },
  100: { next: 125, price: 10000 },
  125: { next: 150, price: 20000 }
};

export default function ExpandInventoryModal({
  currentCapacity,
  currentCoins,
  isOpen,
  onClose,
  onConfirm
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const tier = TIERS[currentCapacity];
  const isMax = !tier;

  const handleUpgrade = async () => {
    if (isMax) return;
    if (currentCoins < tier.price) {
      setError(`Недостаточно Coins! Требуется ${tier.price.toLocaleString()} C`);
      return;
    }
    setError('');
    setLoading(true);
    haptic.impact('heavy');
    try {
      await onConfirm();
      haptic.notification('success');
      onClose();
    } catch (err) {
      haptic.notification('error');
      setError(err.message || 'Ошибка улучшения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm bg-[var(--tg-theme-bg-color,#0f172a)] border border-white/10 rounded-2xl p-5 shadow-xl text-[var(--tg-theme-text-color,#f8fafc)]">
        <button
          onClick={() => {
            haptic.selection();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 text-[var(--tg-theme-hint-color,#94a3b8)] hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-3.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <PackagePlus className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Вместимость коллекции</h3>
            <p className="text-[11px] text-[var(--tg-theme-hint-color,#94a3b8)]">Храни больше уникальных номеров</p>
          </div>
        </div>

        {isMax ? (
          <div className="text-center py-5 bg-[var(--tg-theme-secondary-bg-color,#1e293b)] rounded-xl border border-white/5 text-xs text-slate-300">
            Достигнут максимум: <strong>150 слотов</strong>!
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 flex items-center justify-between text-xs">
              <div>
                <span className="text-[var(--tg-theme-hint-color,#94a3b8)] block text-[10px]">Сейчас:</span>
                <span className="font-number font-bold text-white text-sm">{currentCapacity} слотов</span>
              </div>
              <span className="text-sky-400 font-bold">➔</span>
              <div>
                <span className="text-[var(--tg-theme-hint-color,#94a3b8)] block text-[10px]">Будет:</span>
                <span className="font-number font-bold text-sky-300 text-sm">{tier.next} слотов (+25)</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-center">
              <span className="text-[10px] text-[var(--tg-theme-hint-color,#94a3b8)]">Стоимость расширения:</span>
              <div className="font-number text-lg font-bold text-amber-300 flex items-center justify-center gap-1.5 mt-0.5">
                <Coins className="w-4 h-4 text-amber-400" />
                {tier.price.toLocaleString()} Coins
              </div>
            </div>

            {error && <p className="text-xs text-rose-400 text-center">{error}</p>}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  haptic.selection();
                  onClose();
                }}
                className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-xs transition active:scale-[0.98]"
              >
                Отмена
              </button>
              <button
                onClick={handleUpgrade}
                disabled={loading || currentCoins < tier.price}
                className="py-2.5 rounded-xl bg-[var(--tg-theme-button-color,#0284c7)] text-[var(--tg-theme-button-text-color,#ffffff)] font-medium text-xs transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {loading ? 'Улучшение...' : 'Расширить'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
