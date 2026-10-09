// client/src/components/PhoneCard.jsx
import React from 'react';
import { Coins, Check, Tag } from 'lucide-react';

export const RARITIES_CONFIG = {
  common: { name: 'Обычный', badgeClass: 'rarity-common' },
  uncommon: { name: 'Необычный', badgeClass: 'rarity-uncommon' },
  rare: { name: 'Редкий', badgeClass: 'rarity-rare' },
  epic: { name: 'Эпический', badgeClass: 'rarity-epic' },
  legendary: { name: 'Легендарный', badgeClass: 'rarity-legendary' },
  mythic: { name: 'Мифический', badgeClass: 'rarity-mythic' }
};

const COUNTRY_FLAGS = {
  RU: '🇷🇺',
  UA: '🇺🇦',
  US: '🇺🇸',
  TR: '🇹🇷',
  CN: '🇨🇳'
};

export default function PhoneCard({
  phone,
  isEquipped = false,
  isSelected = false,
  selectable = false,
  onClick,
  actionSlot = null
}) {
  const rarity = phone?.rarity || 'common';
  const rConfig = RARITIES_CONFIG[rarity] || RARITIES_CONFIG.common;
  const flag = COUNTRY_FLAGS[phone?.country] || '🌐';

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer rounded-xl border transition-all duration-150 active:scale-[0.98] p-3 ${
        isSelected
          ? 'bg-sky-500/10 border-sky-400'
          : 'bg-[#1f2937]/70 hover:bg-[#1f2937] border-white/5'
      }`}
    >
      {/* Верхняя строка: флаг, страна, редкость, очки */}
      <div className="flex items-center justify-between text-xs mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{flag}</span>
          <span className="text-[11px] font-medium text-slate-400">{phone.country}</span>
          <span className="text-[10px] text-slate-500 font-mono">#{phone.id}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${rConfig.badgeClass}`}>
            {rConfig.name}
          </span>
          <span className="text-[10px] font-mono font-medium text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
            {phone.score} очков
          </span>
        </div>
      </div>

      {/* Номер телефона */}
      <div className="flex items-center justify-between my-1">
        <div className="font-number text-base sm:text-lg font-bold text-slate-100 tracking-tight">
          {phone.formatted_number}
        </div>

        {selectable && (
          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
            isSelected
              ? 'bg-sky-500 border-sky-400 text-slate-950 font-bold'
              : 'border-slate-600 bg-slate-800/60'
          }`}>
            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </div>
        )}
      </div>

      {/* Нижняя строка: категория, статус, стоимость */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-white/5 mt-1">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-slate-300">
            <Tag className="w-3 h-3 text-slate-400" />
            {phone.category}
          </span>
          {isEquipped && (
            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5">
              <Check className="w-3 h-3" /> В профиле
            </span>
          )}
          {phone.status === 'listed' && (
            <span className="text-[10px] text-amber-400 font-medium">
              На рынке
            </span>
          )}
        </div>

        <div className="font-number font-semibold text-amber-400 flex items-center gap-1">
          <Coins className="w-3 h-3" />
          {Number(phone.base_price || 0).toLocaleString()} C
        </div>
      </div>

      {actionSlot && <div className="mt-2 pt-2 border-t border-white/5">{actionSlot}</div>}
    </div>
  );
}
