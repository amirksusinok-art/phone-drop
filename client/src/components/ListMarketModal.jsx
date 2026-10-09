// client/src/components/ListMarketModal.jsx
import React, { useState } from 'react';
import { ShoppingCart, Coins, X, Percent, Check } from 'lucide-react';
import { RARITIES_CONFIG } from './PhoneCard';
import { haptic } from '../haptic';

export default function ListMarketModal({ phone, isOpen, onClose, onConfirm }) {
  const [price, setPrice] = useState(phone?.base_price ? String(phone.base_price * 2) : '500');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !phone) return null;

  const numPrice = Math.max(0, parseInt(price, 10) || 0);
  const feeAmount = Math.round(numPrice * 0.05);
  const sellerRevenue = numPrice - feeAmount;
  const rConfig = RARITIES_CONFIG[phone.rarity] || RARITIES_CONFIG.common;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (numPrice < 100) {
      setError('Минимальная цена выставления — 100 Coins');
      return;
    }
    setError('');
    setSubmitting(true);
    haptic.impact('medium');
    try {
      await onConfirm(phone.id, numPrice);
      onClose();
    } catch (err) {
      setError(err.message || 'Ошибка выставления на рынок');
    } finally {
      setSubmitting(false);
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
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Выставить на рынок</h3>
            <p className="text-[11px] text-[var(--tg-theme-hint-color,#94a3b8)]">Торговля с игроками (5% сбор)</p>
          </div>
        </div>

        {/* Инфо о номере */}
        <div className="p-3 rounded-xl border border-white/5 bg-[var(--tg-theme-secondary-bg-color,#1e293b)] mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${rConfig.badgeClass}`}>
              {rConfig.name}
            </span>
            <span className="text-[11px] text-[var(--tg-theme-hint-color,#94a3b8)] font-mono">
              Оценка: {phone.score}
            </span>
          </div>
          <div className="font-number text-base font-bold text-white truncate">
            {phone.formatted_number}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-medium text-[var(--tg-theme-hint-color,#94a3b8)] mb-1">
              Цена продажи (Coins):
            </label>
            <div className="relative">
              <input
                type="number"
                min="100"
                step="10"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/10 rounded-xl px-3.5 py-2.5 text-base font-number font-bold text-amber-300 focus:outline-none focus:border-sky-500"
                placeholder="Мин. 100"
                required
              />
              <Coins className="w-4 h-4 text-amber-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
            <p className="text-[10px] text-[var(--tg-theme-hint-color,#94a3b8)] mt-1">
              Укажи адекватную цену, чтобы быстрее найти покупателя.
            </p>
            {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
          </div>

          {/* Расчет комиссии */}
          <div className="p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 space-y-1.5 text-xs">
            <div className="flex justify-between text-[var(--tg-theme-hint-color,#94a3b8)]">
              <span>Сбор рынка (5%):</span>
              <span className="font-number text-rose-400">-{feeAmount.toLocaleString()} C</span>
            </div>
            <div className="border-t border-white/5 pt-1.5 flex justify-between font-semibold text-emerald-400">
              <span>Ты получишь:</span>
              <span className="font-number">{sellerRevenue.toLocaleString()} C</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                haptic.selection();
                onClose();
              }}
              className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-xs transition active:scale-[0.98]"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting || numPrice < 100}
              className="py-2.5 rounded-xl bg-[var(--tg-theme-button-color,#0284c7)] text-[var(--tg-theme-button-text-color,#ffffff)] font-medium text-xs transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Публикация...' : 'Опубликовать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
