// client/src/components/ExpandInventoryModal.jsx
import React, { useState } from 'react';
import { PackagePlus, Coins, X, Check } from 'lucide-react';

const TIERS = {
  50: { next: 75, price: 2000 },
  75: { next: 100, price: 5000 },
  100: { next: 125, price: 10000 },
  125: { next: 150, price: 20000 }
};

export default function ExpandInventoryModal({ currentCapacity, currentCoins, isOpen, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const tier = TIERS[currentCapacity];
  const isMax = !tier;

  const handleUpgrade = async () => {
    if (isMax) return;
    if (currentCoins < tier.price) {
      setError(`Недостаточно Coins! Требуется ${tier.price.toLocaleString()}, у вас ${currentCoins.toLocaleString()}`);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err.message || 'Ошибка расширения коллекции');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#111726] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 text-cyan-400 mb-4">
          <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/30">
            <PackagePlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Вместимость коллекции</h3>
            <p className="text-xs text-cyan-400/80">Хранение большего числа номеров</p>
          </div>
        </div>

        {isMax ? (
          <div className="text-center py-6 bg-slate-900/60 rounded-2xl border border-slate-800 text-sm text-slate-300">
            Достигнута максимальная вместимость: <strong>150 слотов</strong>!
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-sm">
              <div>
                <span className="text-slate-400 block text-xs">Текущая:</span>
                <span className="font-bold text-white text-base">{currentCapacity} слотов</span>
              </div>
              <span className="text-cyan-400 font-bold text-lg">➔</span>
              <div>
                <span className="text-slate-400 block text-xs">После улучшения:</span>
                <span className="font-bold text-cyan-300 text-base">{tier.next} слотов (+25)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <span className="text-xs text-slate-400">Стоимость улучшения:</span>
              <div className="font-mono-numbers text-xl font-bold text-amber-300 flex items-center justify-center gap-1.5 mt-0.5">
                <Coins className="w-4 h-4 text-amber-400" />
                {tier.price.toLocaleString()} Coins
              </div>
            </div>

            {error && <p className="text-xs text-red-400 text-center">{error}</p>}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={onClose}
                className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                Отмена
              </button>
              <button
                onClick={handleUpgrade}
                disabled={loading || currentCoins < tier.price}
                className="py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition shadow-lg shadow-cyan-600/30 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {loading ? 'Улучшение...' : 'Улучшить'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
