// client/src/components/SellSystemModal.jsx
import React, { useState } from 'react';
import { AlertTriangle, Coins, X } from 'lucide-react';
import { RARITY_STYLES } from './PhoneCard';

export default function SellSystemModal({ phone, isOpen, onClose, onConfirm }) {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !phone) return null;

  const isHighRarity = ['rare', 'epic', 'legendary', 'mythic'].includes(phone.rarity);
  const rStyle = RARITY_STYLES[phone.rarity] || RARITY_STYLES.common;

  const handleSell = async () => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#111726] border border-red-500/40 rounded-3xl p-6 shadow-2xl text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 text-red-400 mb-4">
          <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/30">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Продажа системе</h3>
            <p className="text-xs text-red-400">Возврат в свободный пул</p>
          </div>
        </div>

        {/* Карточка продаваемого предмета */}
        <div className={`p-4 rounded-2xl border ${rStyle.border} bg-slate-900/80 mb-4`}>
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${rStyle.badge}`}>
              {rStyle.name}
            </span>
            <span className="text-xs text-slate-400 font-mono">Очки: {phone.score}</span>
          </div>
          <div className="font-mono-numbers text-lg font-bold text-white">
            {phone.formatted_number}
          </div>
        </div>

        {isHighRarity && (
          <div className="p-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Внимание!</strong> Вы продаете редкий предмет ({rStyle.name}). После продажи он вернется в общий пул, восстановить владение будет невозможно!
            </div>
          </div>
        )}

        <div className="text-center p-3 rounded-xl bg-slate-900/60 border border-slate-800 mb-5">
          <span className="text-xs text-slate-400">Вы получите:</span>
          <div className="font-mono-numbers text-2xl font-black text-amber-300 flex items-center justify-center gap-1.5 mt-0.5">
            <Coins className="w-5 h-5 text-amber-400" />
            +{Number(phone.base_price).toLocaleString()} Coins
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
          >
            Отмена
          </button>
          <button
            onClick={handleSell}
            disabled={submitting}
            className="py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition shadow-lg shadow-red-600/30 disabled:opacity-50"
          >
            {submitting ? 'Продажа...' : 'Подтвердить'}
          </button>
        </div>
      </div>
    </div>
  );
}
