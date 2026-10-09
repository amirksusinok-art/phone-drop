// client/src/components/ListMarketModal.jsx
import React, { useState } from 'react';
import { ShoppingCart, Coins, X, Percent, Check } from 'lucide-react';
import { RARITY_STYLES } from './PhoneCard';

export default function ListMarketModal({ phone, isOpen, onClose, onConfirm }) {
  const [price, setPrice] = useState(phone?.base_price ? String(phone.base_price * 2) : '500');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !phone) return null;

  const numPrice = Math.max(0, parseInt(price, 10) || 0);
  const feeAmount = Math.round(numPrice * 0.05);
  const sellerRevenue = numPrice - feeAmount;
  const rStyle = RARITY_STYLES[phone.rarity] || RARITY_STYLES.common;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (numPrice < 100) {
      setError('Минимальная цена выставления — 100 Coins');
      return;
    }
    setError('');
    setSubmitting(true);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#111726] border border-indigo-500/40 rounded-3xl p-6 shadow-2xl text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 text-indigo-400 mb-4">
          <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/30">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Выставить на рынок</h3>
            <p className="text-xs text-indigo-400/90">Торговля с игроками (комиссия 5%)</p>
          </div>
        </div>

        {/* Инфо о номере */}
        <div className={`p-3.5 rounded-2xl border ${rStyle.border} bg-slate-900/80 mb-4`}>
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${rStyle.badge}`}>
              {rStyle.name}
            </span>
            <span className="text-xs text-slate-400 font-mono">Оценка: {phone.score}</span>
          </div>
          <div className="font-mono-numbers text-base font-bold text-white truncate">
            {phone.formatted_number}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Укажите цену продажи (Coins):
            </label>
            <div className="relative">
              <input
                type="number"
                min="100"
                step="10"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono font-bold text-amber-300 focus:outline-none focus:border-indigo-500"
                placeholder="Минимум 100"
                required
              />
              <Coins className="w-5 h-5 text-amber-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>

          {/* Расчет комиссии и выплат */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Цена для покупателя:</span>
              <span className="font-mono font-bold text-white">{numPrice.toLocaleString()} Coins</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span className="flex items-center gap-1">
                <Percent className="w-3 h-3 text-indigo-400" /> Комиссия рынка (5%):
              </span>
              <span className="font-mono text-red-400">-{feeAmount.toLocaleString()} Coins</span>
            </div>
            <div className="border-t border-slate-800 pt-1.5 flex justify-between font-bold text-emerald-400">
              <span>Вы получите после сделки:</span>
              <span className="font-mono text-sm">{sellerRevenue.toLocaleString()} Coins</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting || numPrice < 100}
              className="py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30 disabled:opacity-50 flex items-center justify-center gap-1.5"
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
