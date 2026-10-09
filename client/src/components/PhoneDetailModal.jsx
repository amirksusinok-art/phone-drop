// client/src/components/PhoneDetailModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Sparkles, Coins, Tag, History, Check, ShieldCheck, Share2, ArrowRight } from 'lucide-react';
import { RARITY_STYLES } from './PhoneCard';
import { api } from '../api';

export default function PhoneDetailModal({
  phoneId,
  currentUserId,
  equippedPhoneId,
  isOpen,
  onClose,
  onEquip,
  onSellSystem,
  onListMarket
}) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!phoneId || !isOpen) return;
    setLoading(true);
    api.getPhoneDetails(phoneId)
      .then(res => setDetails(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [phoneId, isOpen]);

  if (!isOpen || !phoneId) return null;

  const phone = details?.phone;
  const rarity = phone?.rarity || 'common';
  const rStyle = RARITY_STYLES[rarity] || RARITY_STYLES.common;
  const isOwner = phone && Number(phone.owner_id) === Number(currentUserId);
  const isEquipped = phone && Number(phone.id) === Number(equippedPhoneId);

  let tags = [];
  try {
    tags = typeof phone?.tags === 'string' ? JSON.parse(phone.tags) : (phone?.tags || []);
  } catch {
    tags = [];
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-[#111726] border border-slate-700 rounded-3xl overflow-hidden shadow-2xl text-slate-200">
        
        {/* Шапка модалки */}
        <div className={`p-5 bg-gradient-to-br ${rStyle.bg} border-b border-slate-800 relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${rStyle.badge}`}>
              {rStyle.name}
            </span>
            <span className="text-xs text-slate-400">Серия {phone?.series || '2026'}</span>
          </div>

          <div className="font-mono-numbers text-2xl font-black text-white tracking-tight my-1 drop-shadow-md">
            {phone?.formatted_number}
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-300 mt-2">
            <span className="flex items-center gap-1 font-semibold text-cyan-300">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Оценка: {phone?.score} / 100
            </span>
            <span className="flex items-center gap-1 font-semibold text-amber-300">
              <Coins className="w-4 h-4 text-amber-400" />
              {Number(phone?.base_price || 0).toLocaleString()} Coins
            </span>
          </div>
        </div>

        {/* Прокручиваемый контент */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Теги узоров */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-cyan-400" />
              Распознанные категории узора
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${
                    tag === phone?.category
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700'
                  }`}
                >
                  {tag} {tag === phone?.category && '★'}
                </span>
              ))}
            </div>
          </div>

          {/* Информация о владельцах и первой находке */}
          <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Текущий владелец:</span>
              <span className="font-semibold text-white">
                {isOwner ? 'Вы' : (details?.owner?.first_name || 'Свободный пул (система)')}
              </span>
            </div>

            {phone?.first_discovered_at && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Первая находка:</span>
                <span className="font-mono text-cyan-300">
                  {new Date(phone.first_discovered_at).toLocaleDateString()}
                </span>
              </div>
            )}

            {details?.firstOwner && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Первооткрыватель:</span>
                <span className="font-semibold text-slate-200">
                  {details.firstOwner.first_name}
                </span>
              </div>
            )}
          </div>

          {/* История передач и сделок */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
              <History className="w-3.5 h-3.5 text-indigo-400" />
              История предмета
            </div>

            {details?.history && details.history.length > 0 ? (
              <div className="space-y-2">
                {details.history.map((h) => {
                  let text = '';
                  let badge = '';

                  if (h.event_type === 'drop') {
                    text = 'Выбит из контейнера';
                    badge = 'bg-cyan-500/20 text-cyan-300';
                  } else if (h.event_type === 'sell_system') {
                    text = `Продан системе за ${h.price} Coins`;
                    badge = 'bg-amber-500/20 text-amber-300';
                  } else if (h.event_type === 'list_market') {
                    text = `Выставлен на рынок за ${h.price} Coins`;
                    badge = 'bg-indigo-500/20 text-indigo-300';
                  } else if (h.event_type === 'buy_market') {
                    text = `Куплен на рынке за ${h.price} Coins`;
                    badge = 'bg-green-500/20 text-green-300';
                  } else if (h.event_type === 'cancel_market') {
                    text = 'Снят с продажи';
                    badge = 'bg-slate-700 text-slate-300';
                  }

                  return (
                    <div
                      key={h.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
                    >
                      <div>
                        <div className="font-medium text-slate-200">{text}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {new Date(h.created_at).toLocaleString()}
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${badge}`}>
                        {h.event_type}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-500 text-center py-3 bg-slate-900/40 rounded-xl">
                История операций пуста
              </div>
            )}
          </div>
        </div>

        {/* Панель действий владельца */}
        {isOwner && phone?.status === 'owned' && (
          <div className="p-4 bg-[#0d121f] border-t border-slate-800 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onClose();
                  onEquip(isEquipped ? null : phone.id);
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <Check className={`w-4 h-4 ${isEquipped ? 'text-emerald-400' : 'text-slate-400'}`} />
                {isEquipped ? 'Снять с профиля' : 'В профиль'}
              </button>

              <button
                onClick={() => {
                  onClose();
                  onListMarket(phone);
                }}
                className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20"
              >
                На рынок (5%)
              </button>
            </div>

            <button
              onClick={() => {
                onClose();
                onSellSystem(phone);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold text-xs transition active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Coins className="w-3.5 h-3.5" />
              Продать системе (+{Number(phone.base_price).toLocaleString()} Coins)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
