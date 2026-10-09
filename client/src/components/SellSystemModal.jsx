// client/src/components/SellSystemModal.jsx
import React, { useState } from 'react';
import { AlertTriangle, Coins, X } from 'lucide-react';
import { RARITIES_CONFIG } from './PhoneCard';
import { haptic } from '../haptic';

export default function SellSystemModal({ phone, isOpen, onClose, onConfirm }) {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !phone) return null;

  const isHighRarity = ['rare', 'epic', 'legendary', 'mythic'].includes(phone.rarity);
  const rConfig = RARITIES_CONFIG[phone.rarity] || RARITIES_CONFIG.common;

  const handleSell = async () => {
    haptic.impact('medium');
    setSubmitting(true);
    try {
      await onConfirm(phone.id);
      onClose();
    } catch (err) {
      console.error(err);
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
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Продажа системе</h3>
            <p className="text-[11px] text-[var(--tg-theme-hint-color,#94a3b8)]">Возврат в общий пул</p>
          </div>
        </div>

        {/* Инфо о номере */}
        <div className="p-3 rounded-xl border border-white/5 bg-[var(--tg-theme-secondary-bg-color,#1e293b)] mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${rConfig.badgeClass}`}>
              {rConfig.name}
            </span>
            <span className="text-[11px] text-[var(--tg-theme-hint-color,#94a3b8)] font-mono">
              Очки: {phone.score}
            </span>
          </div>
          <div className="font-number text-base font-bold text-white">
            {phone.formatted_number}
          </div>
        </div>

        {isHighRarity && (
          <div className="p-2.5 mb-3 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-start gap-2 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              Внимание! Редкий номер ({rConfig.name}) вернется в общий пул.
            </div>
          </div>
        )}

        <div className="text-center p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 mb-4">
          <span className="text-[11px] text-[var(--tg-theme-hint-color,#94a3b8)]">Ты получишь:</span>
          <div className="font-number text-xl font-bold text-amber-300 flex items-center justify-center gap-1.5 mt-0.5">
            <Coins className="w-4 h-4 text-amber-400" />
            +{Number(phone.base_price).toLocaleString()} C
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
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
            onClick={handleSell}
            disabled={submitting}
            className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? 'Продажа...' : 'Подтвердить'}
          </button>
        </div>
      </div>
    </div>
  );
}
