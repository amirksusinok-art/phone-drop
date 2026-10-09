// client/src/views/InventoryView.jsx
import React, { useState, useEffect } from 'react';
import { Package, Search, Filter, PackagePlus, Sparkles, SlidersHorizontal } from 'lucide-react';
import { api } from '../api';
import PhoneCard from '../components/PhoneCard';

const COUNTRIES = [
  { key: '', label: 'Все' },
  { key: 'RU', label: '🇷🇺 RU' },
  { key: 'UA', label: '🇺🇦 UA' },
  { key: 'US', label: '🇺🇸 US' },
  { key: 'TR', label: '🇹🇷 TR' },
  { key: 'CN', label: '🇨🇳 CN' }
];

const RARITIES = [
  { key: '', label: 'Все' },
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
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#111726] to-[#151c2e] border border-slate-800 shadow-md">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-cyan-400" />
            Вместимость коллекции
          </span>
          <span className="font-mono font-bold text-white">
            {count} / {maxSlots}
          </span>
        </div>

        {/* Шкала заполненности */}
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              percentFilled >= 90 ? 'bg-red-500' : percentFilled >= 70 ? 'bg-amber-400' : 'bg-cyan-400'
            }`}
            style={{ width: `${percentFilled}%` }}
          />
        </div>

        <button
          onClick={onOpenExpandInventory}
          className="w-full py-2 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
        >
          <PackagePlus className="w-3.5 h-3.5" />
          Расширить хранилище (+25 слотов)
        </button>
      </div>

      {/* Поиск и фильтры */}
      <div className="space-y-2">
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по цифрам (например 777)..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </form>

        {/* Фильтры стран */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {COUNTRIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setSelectedCountry(c.key)}
              className={`py-1 px-2.5 rounded-lg border whitespace-nowrap transition text-xs font-medium ${
                selectedCountry === c.key
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
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
            onChange={(e) => setSelectedRarity(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            {RARITIES.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="newest">Сначала новые</option>
            <option value="score_desc">По очкам узора</option>
            <option value="price_desc">Самые дорогие</option>
            <option value="price_asc">Самые дешевые</option>
          </select>
        </div>
      </div>

      {/* Список номеров коллекции */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 text-xs">
          Загрузка коллекции...
        </div>
      ) : inventory.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800 p-6 space-y-2">
          <div className="text-3xl">📭</div>
          <div className="text-sm font-bold text-slate-300">В коллекции пока нет номеров</div>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Перейдите в раздел «Дроп», чтобы выбить свой первый уникальный номер, или купите его на Рынке!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
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
