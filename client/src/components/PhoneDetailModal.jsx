// client/src/components/PhoneDetailModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Sparkles, Coins, Tag, History, Check } from 'lucide-react';
import { RARITIES_CONFIG } from './PhoneCard';
import { api } from '../api';
import { haptic } from '../haptic';

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
  const rConfig = RARITIES_CONFIG[rarity] || RARITIES_CONFIG.common;
  const isOwner = phone && Number(phone.owner_id) === Number(currentUserId);
  const isEquipped = phone && Number(phone.id) === Number(equippedPhoneId);

  let tags = [];
  try {
    tags = typeof phone?.tags === 'string' ? JSON.parse(phone.tags) : (phone?.tags || []);
  } catch {
    tags = [];
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md max-h-[85vh] flex flex-col bg-[var(--tg-theme-bg-color,#0f172a)] border border-white/10 rounded-2xl overflow-hidden shadow-xl text-[var(--tg-theme-text-color,#f8fafc)]">
        
        {/* Шапка модалки */}
        <div className="p-4 bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border-b border-white/5 relative">
          <button
            onClick={() => {
              haptic.selection();
              onClose();
            }}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-lg bg-white/5 text-[var(--tg-theme-hint-color,#94a3b8)] hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${rConfig.badgeClass}`}>
              {rConfig.name}
            </span>
            <span className="text-xs text-[var(--tg-theme-hint-color,#94a3b8)]">Серия {phone?.series || '2026'}</span>
          </div>

          <div className="font-number text-xl font-bold text-white tracking-tight my-1">
            {phone?.formatted_number}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-300 mt-2">
            <span className="flex items-center gap-1 font-medium text-sky-400">
              <Sparkles className="w-3.5 h-3.5" />
              Оценка: {phone?.score} / 100
            </span>
            <span className="flex items-center gap-1 font-number font-semibold text-amber-300">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              {Number(phone?.base_price || 0).toLocaleString()} C
            </span>
          </div>
        </div>

        {/* Прокручиваемый контент */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Теги узоров */}
          <div>
            <div className="text-[11px] font-medium text-[var(--tg-theme-hint-color,#94a3b8)] mb-1.5 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Распознанные категории
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className={`text-xs px-2 py-0.5 rounded-md border font-medium ${
                    tag === phone?.category
                      ? 'bg-sky-500/10 text-sky-300 border-sky-400/30'
                      : 'bg-white/5 text-slate-300 border-white/5'
                  }`}
                >
                  {tag} {tag === phone?.category && '★'}
                </span>
              ))}
            </div>
          </div>

          {/* Владельцы */}
          <div className="bg-[var(--tg-theme-secondary-bg-color,#1e293b)] rounded-xl p-3 border border-white/5 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[var(--tg-theme-hint-color,#94a3b8)]">Текущий владелец:</span>
              <span className="font-medium text-white">
                {isOwner ? 'Вы' : (details?.owner?.first_name || 'Свободный пул (система)')}
              </span>
            </div>

            {phone?.first_discovered_at && (
              <div className="flex justify-between items-center">
                <span className="text-[var(--tg-theme-hint-color,#94a3b8)]">Первая находка:</span>
                <span className="font-number text-slate-300 text-[11px]">
                  {new Date(phone.first_discovered_at).toLocaleDateString()}
                </span>
              </div>
            )}

            {details?.firstOwner && (
              <div className="flex justify-between items-center">
                <span className="text-[var(--tg-theme-hint-color,#94a3b8)]">Первооткрыватель:</span>
                <span className="font-medium text-slate-300">
                  {details.firstOwner.first_name}
                </span>
              </div>
            )}
          </div>

          {/* История передач */}
          <div>
            <div className="text-[11px] font-medium text-[var(--tg-theme-hint-color,#94a3b8)] mb-1.5 flex items-center gap-1">
              <History className="w-3 h-3" />
              История владения
            </div>

            {details?.history && details.history.length > 0 ? (
              <div className="space-y-1.5">
                {details.history.map((h) => {
                  let text = '';
                  if (h.event_type === 'drop') text = 'Выбит из кейса';
                  else if (h.event_type === 'sell_system') text = `Сдан системе за ${h.price} C`;
                  else if (h.event_type === 'list_market') text = `Выставлен на рынок за ${h.price} C`;
                  else if (h.event_type === 'buy_market') text = `Куплен на рынке за ${h.price} C`;
                  else if (h.event_type === 'cancel_market') text = 'Снят с продажи';
                  else if (h.event_type === 'craft_result') text = 'Создан через синтез 5в1';
                  else if (h.event_type === 'craft_burn') text = 'Сожжен в контракте 5в1';

                  return (
                    <div
                      key={h.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 text-xs"
                    >
                      <div>
                        <div className="font-medium text-slate-200 text-[11px]">{text}</div>
                        <div className="text-[10px] text-[var(--tg-theme-hint-color,#94a3b8)] font-number mt-0.5">
                          {new Date(h.created_at).toLocaleString()}
                        </div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-white/5 text-slate-400">
                        {h.event_type}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-[var(--tg-theme-hint-color,#94a3b8)] text-center py-3 bg-[var(--tg-theme-secondary-bg-color,#1e293b)] rounded-xl">
                История пуста
              </div>
            )}
          </div>
        </div>

        {/* Панель действий владельца */}
        {isOwner && phone?.status === 'owned' && (
          <div className="p-3 bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border-t border-white/5 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  haptic.selection();
                  onClose();
                  onEquip(isEquipped ? null : phone.id);
                }}
                className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs transition active:scale-[0.98] flex items-center justify-center gap-1.5 border border-white/5"
              >
                <Check className={`w-3.5 h-3.5 ${isEquipped ? 'text-emerald-400' : 'text-slate-400'}`} />
                {isEquipped ? 'Снять с профиля' : 'В профиль'}
              </button>

              <button
                onClick={() => {
                  haptic.selection();
                  onClose();
                  onListMarket(phone);
                }}
                className="py-2 px-3 rounded-xl bg-[var(--tg-theme-button-color,#0284c7)] text-[var(--tg-theme-button-text-color,#ffffff)] font-medium text-xs transition active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                На рынок (5%)
              </button>
            </div>

            <button
              onClick={() => {
                haptic.selection();
                onClose();
                onSellSystem(phone);
              }}
              className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-rose-400 border border-rose-500/20 font-medium text-xs transition active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <Coins className="w-3.5 h-3.5" />
              Сдать системе (+{Number(phone.base_price).toLocaleString()} C)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
