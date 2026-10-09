// client/src/views/InventoryView.jsx
import React, { useState, useEffect } from 'react';
import { Package, Search, Filter, Plus, Smartphone } from 'lucide-react';
import { api } from '../api';
import PhoneCard from '../components/PhoneCard';
import { haptic } from '../haptic';

const COUNTRIES = [
  { key: '', label: 'Все' },
  { key: 'RU', label: '🇷🇺 RU' },
  { key: 'UA', label: '🇺🇦 UA' },
  { key: 'US', label: '🇺🇸 US' },
  { key: 'TR', label: '🇹🇷 TR' },
  { key: 'CN', label: '🇨🇳 CN' }
];

const RARITIES = [
  { key: '', label: 'Все редкости' },
  { key: 'common', label: 'Обычные' },
  { key: 'uncommon', label: 'Необычные' },
  { key: 'rare', label: 'Редкие' },
  { key: 'epic', label: 'Эпические' },
  { key: 'legendary', label: 'Легендарные' },
  { key: 'mythic', label: 'Мифические' }
];

export default function InventoryView({
  user,
  onOpenDetails,
  onOpenExpandInventory,
  equippedPhoneId
}) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRarity, setSelectedRarity] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const loadInventory = () => {
    setLoading(true);
    api.getInventory({
      country: selectedCountry,
      rarity: selectedRarity,
      search,
      sortBy
    })
      .then(res => setInventory(res.inventory || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInventory();
  }, [selectedCountry, selectedRarity, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadInventory();
  };

  const count = inventory.length;
  const maxSlots = user?.max_inventory || 50;
  const percentFilled = Math.min(100, Math.round((count / maxSlots) * 100));

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto px-4">
      {/* Панель вместимости хранилища */}
      <div className="p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[var(--tg-theme-text-color,#f8fafc)] flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-sky-400" />
            Вместимость коллекции
          </span>
          <span className="font-number font-medium text-[var(--tg-theme-hint-color,#94a3b8)]">
            {count} / {maxSlots} слотов
          </span>
        </div>

        {/* Шкала заполненности */}
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              percentFilled >= 90 ? 'bg-rose-500' : percentFilled >= 70 ? 'bg-amber-400' : 'bg-sky-400'
            }`}
            style={{ width: `${percentFilled}%` }}
          />
        </div>

        <button
          onClick={() => {
            haptic.selection();
            onOpenExpandInventory();
          }}
          className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--tg-theme-text-color,#f8fafc)] border border-white/5 text-xs font-semibold transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          Расширить коллекцию (+25 слотов)
        </button>
      </div>

      {/* Поиск и фильтры */}
      <div className="space-y-2">
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по цифрам (например, 777)..."
            className="w-full bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[var(--tg-theme-text-color,#f8fafc)] placeholder-[var(--tg-theme-hint-color,#94a3b8)] focus:outline-none focus:border-sky-500"
          />
          <Search className="w-4 h-4 text-[var(--tg-theme-hint-color,#94a3b8)] absolute left-3 top-1/2 -translate-y-1/2" />
        </form>

        {/* Фильтры стран */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
          {COUNTRIES.map((c) => (
            <button
              key={c.key}
              onClick={() => {
                haptic.selection();
                setSelectedCountry(c.key);
              }}
              className={`py-1 px-2.5 rounded-lg border whitespace-nowrap transition text-xs font-medium active:scale-[0.98] ${
                selectedCountry === c.key
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400/40 font-semibold'
                  : 'bg-[var(--tg-theme-secondary-bg-color,#1e293b)] text-[var(--tg-theme-hint-color,#94a3b8)] border-white/5 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Фильтры редкостей и сортировка */}
        <div className="flex items-center justify-between gap-2">
          <select
            value={selectedRarity}
            onChange={(e) => {
              haptic.selection();
              setSelectedRarity(e.target.value);
            }}
            className="flex-1 bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            {RARITIES.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => {
              haptic.selection();
              setSortBy(e.target.value);
            }}
            className="flex-1 bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="newest">Новые</option>
            <option value="score_desc">По очкам узора</option>
            <option value="price_desc">Самые дорогие</option>
            <option value="price_asc">Самые дешевые</option>
          </select>
        </div>
      </div>

      {/* Список номеров коллекции */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
      ) : inventory.length === 0 ? (
        <div className="py-14 text-center rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 p-6 space-y-2">
          <div className="text-3xl">📭</div>
          <div className="text-sm font-semibold text-white">В коллекции пока нет номеров</div>
          <p className="text-xs text-[var(--tg-theme-hint-color,#94a3b8)] max-w-xs mx-auto">
            Открой свой первый кейс во вкладке «Дроп» или купи редкий экземпляр на «Рынке».
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {inventory.map((phone) => (
            <PhoneCard
              key={phone.id}
              phone={phone}
              isEquipped={Number(phone.id) === Number(equippedPhoneId)}
              onClick={() => onOpenDetails(phone.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
