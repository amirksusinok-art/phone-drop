// client/src/components/PhoneCard.jsx
import React from 'react';
import { Sparkles, Coins, Tag, Check, Award } from 'lucide-react';

export const RARITY_STYLES = {
  common: {
    name: 'Обычный',
    border: 'border-slate-700/80',
    bg: 'from-slate-900/90 to-slate-800/40',
    badge: 'bg-slate-700/50 text-slate-300 border-slate-600',
    glow: 'glow-common',
    textColor: 'text-slate-300'
  },
  uncommon: {
    name: 'Необычный',
    border: 'border-green-500/60',
    bg: 'from-green-950/40 to-slate-900/80',
    badge: 'bg-green-500/20 text-green-300 border-green-500/40',
    glow: 'glow-uncommon',
    textColor: 'text-green-400'
  },
  rare: {
    name: 'Редкий',
    border: 'border-blue-500/70',
    bg: 'from-blue-950/40 to-slate-900/80',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    glow: 'glow-rare',
    textColor: 'text-blue-400'
  },
  epic: {
    name: 'Эпический',
    border: 'border-purple-500/80',
    bg: 'from-purple-950/40 to-slate-900/80',
    badge: 'bg-purple-500/25 text-purple-300 border-purple-500/50',
    glow: 'glow-epic',
    textColor: 'text-purple-400'
  },
  legendary: {
    name: 'Легендарный',
    border: 'border-amber-400/90',
    bg: 'from-amber-950/50 to-slate-900/80',
    badge: 'bg-amber-500/25 text-amber-300 border-amber-500/50',
    glow: 'glow-legendary',
    textColor: 'text-amber-400'
  },
  mythic: {
    name: 'Мифический',
    border: 'border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.4)]',
    bg: 'from-pink-950/60 via-purple-950/40 to-slate-900/90',
    badge: 'bg-gradient-to-r from-pink-500/30 to-purple-500/30 text-pink-200 border-pink-500/50',
    glow: 'glow-mythic',
    textColor: 'text-pink-300'
  }
};

const COUNTRY_FLAGS = {
  RU: '🇷🇺',
  UA: '🇺🇦',
  US: '🇺🇸',
  TR: '🇹🇷',
  CN: '🇨🇳'
};

export default function PhoneCard({ phone, isEquipped, onClick, showActions = false, actionSlot = null }) {
  const rarity = phone?.rarity || 'common';
  const rStyle = RARITY_STYLES[rarity] || RARITY_STYLES.common;
  const flag = COUNTRY_FLAGS[phone?.country] || '🌐';

  let tags = [];
  try {
    tags = typeof phone?.tags === 'string' ? JSON.parse(phone.tags) : (phone?.tags || []);
  } catch {
    tags = [];
  }

  return (
    <div
      onClick={onClick}
      className={`relative group cursor-pointer overflow-hidden rounded-2xl border ${rStyle.border} bg-gradient-to-br ${rStyle.bg} p-4 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-lg`}
    >
      {/* Верхняя строка: флаг, бейдж редкости, очки */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xl" title={phone.country}>{flag}</span>
          <span className="text-xs font-semibold text-slate-400">{phone.country}</span>
          <span className="text-[10px] text-slate-500 font-mono">#{phone.id}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${rStyle.badge}`}>
            {rStyle.name}
          </span>
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[10px] font-bold text-cyan-300">
            <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
            {phone.score}
          </div>
        </div>
      </div>

      {/* Сам номер телефона */}
      <div className="my-2 py-1">
        <div className="font-mono-numbers text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-sm truncate">
          {phone.formatted_number}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-medium text-slate-300 flex items-center gap-1">
            <Tag className="w-3 h-3 text-cyan-400" />
            {phone.category}
          </span>
          {phone.status === 'listed' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              На рынке
            </span>
          )}
          {isEquipped && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
              <Check className="w-2.5 h-2.5" /> В профиле
            </span>
          )}
        </div>
      </div>

      {/* Нижняя часть: Оценочная стоимость */}
      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <div className="text-slate-400 flex items-center gap-1">
          <span>Оценка:</span>
          <span className="font-mono-numbers font-bold text-amber-300 flex items-center gap-0.5">
            <Coins className="w-3 h-3 text-amber-400" />
            {Number(phone.base_price || 0).toLocaleString()}
          </span>
        </div>

        {tags.length > 1 && (
          <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
            +{tags.length - 1} метки
          </div>
        )}
      </div>

      {/* Дополнительный слот действий (если передан) */}
      {actionSlot && <div className="mt-3 pt-2 border-t border-slate-800/80">{actionSlot}</div>}
    </div>
  );
}
