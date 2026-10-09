// client/src/views/MarketView.jsx
import React, { useState, useEffect } from 'react';
import { ShoppingCart, Coins, Percent, Search, X, Check } from 'lucide-react';
import { api } from '../api';
import PhoneCard from '../components/PhoneCard';
import { haptic } from '../haptic';

export default function MarketView({
  user,
  onUpdateUser,
  onOpenDetails,
  showToast
}) {
  const [tab, setTab] = useState('all'); // 'all' | 'my'
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRarity, setSelectedRarity] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [buyingId, setBuyingId] = useState(null);

  const loadMarket = () => {
    setLoading(true);
    api.getMarket({
      country: selectedCountry,
      rarity: selectedRarity,
      search,
      sortBy,
      myOnly: tab === 'my'
    })
      .then(res => setListings(res.listings || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMarket();
  }, [tab, selectedCountry, selectedRarity, sortBy]);

  const handleBuy = async (listing) => {
    if (Number(user?.coins || 0) < listing.price) {
      showToast(`Недостаточно Coins! Нужно ${listing.price.toLocaleString()} C`, 'error');
      return;
    }
    setBuyingId(listing.listing_id);
    haptic.impact('medium');

    try {
      await api.buyMarket(listing.listing_id);
      haptic.notification('success');
      showToast('Номер куплен и добавлен в твою коллекцию', 'success');
      onUpdateUser();
      loadMarket();
    } catch (err) {
      haptic.notification('error');
      showToast(err.message || 'Ошибка покупки', 'error');
    } finally {
      setBuyingId(null);
    }
  };

  const handleCancelListing = async (listingId) => {
    haptic.selection();
    try {
      await api.cancelMarket(listingId);
      showToast('Лот снят с продажи и возвращен в коллекцию', 'info');
      onUpdateUser();
      loadMarket();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto px-4">
      {/* Шапка рынка и комиссия */}
      <div className="p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[var(--tg-theme-text-color,#f8fafc)]">
              Рынок номеров
            </h1>
            <p className="text-xs text-[var(--tg-theme-hint-color,#94a3b8)]">
              Торгуй напрямую с игроками
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-white/5 text-[var(--tg-theme-hint-color,#94a3b8)] flex items-center gap-1">
          <Percent className="w-3 h-3" /> 5% сбор
        </span>
      </div>

      {/* Вкладки: Все лоты / Мои объявления */}
      <div className="grid grid-cols-2 p-1 bg-[var(--tg-theme-secondary-bg-color,#1e293b)] rounded-xl border border-white/5 text-xs">
        <button
          onClick={() => {
            haptic.selection();
            setTab('all');
          }}
          className={`py-2 rounded-lg font-medium transition duration-150 active:scale-[0.98] ${
            tab === 'all'
              ? 'bg-sky-500 text-slate-950 font-semibold'
              : 'text-[var(--tg-theme-hint-color,#94a3b8)] hover:text-white'
          }`}
        >
          Все предложения
        </button>
        <button
          onClick={() => {
            haptic.selection();
            setTab('my');
          }}
          className={`py-2 rounded-lg font-medium transition duration-150 active:scale-[0.98] ${
            tab === 'my'
              ? 'bg-sky-500 text-slate-950 font-semibold'
              : 'text-[var(--tg-theme-hint-color,#94a3b8)] hover:text-white'
          }`}
        >
          Мои лоты
        </button>
      </div>

      {/* Поиск и фильтры */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по номеру на рынке..."
            className="w-full bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[var(--tg-theme-text-color,#f8fafc)] placeholder-[var(--tg-theme-hint-color,#94a3b8)] focus:outline-none focus:border-sky-500"
          />
          <Search className="w-4 h-4 text-[var(--tg-theme-hint-color,#94a3b8)] absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center justify-between gap-2">
          <select
            value={selectedCountry}
            onChange={(e) => {
              haptic.selection();
              setSelectedCountry(e.target.value);
            }}
            className="flex-1 bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="">Все страны</option>
            <option value="RU">🇷🇺 Россия</option>
            <option value="UA">🇺🇦 Украина</option>
            <option value="US">🇺🇸 США</option>
            <option value="TR">🇹🇷 Турция</option>
            <option value="CN">🇨🇳 Китай</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => {
              haptic.selection();
              setSortBy(e.target.value);
            }}
            className="flex-1 bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="newest">Сначала новые</option>
            <option value="price_asc">Сначала дешевле</option>
            <option value="price_desc">Сначала дороже</option>
            <option value="score_desc">По очкам узора</option>
          </select>
        </div>
      </div>

      {/* Список лотов */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 skeleton rounded-xl" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="py-14 text-center rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 p-6 space-y-2">
          <div className="text-3xl">🛒</div>
          <div className="text-sm font-semibold text-white">
            {tab === 'my' ? 'У тебя пока нет активных лотов' : 'На рынке пока нет таких номеров'}
          </div>
          <p className="text-xs text-[var(--tg-theme-hint-color,#94a3b8)] max-w-xs mx-auto">
            {tab === 'my'
              ? 'Выбери любой номер в своей коллекции и нажми «Продать на рынке».'
              : 'Стань первым продавцом или измени фильтры поиска!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((item) => {
            const isMyListing = Number(item.seller_id) === Number(user?.id);

            return (
              <div
                key={item.listing_id}
                className="p-3.5 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 space-y-2.5"
              >
                <PhoneCard
                  phone={item}
                  onClick={() => onOpenDetails(item.id)}
                />

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[11px] text-[var(--tg-theme-hint-color,#94a3b8)]">
                      Продавец: <strong className="text-slate-200">{item.seller_name || 'Игрок'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1 font-number font-bold text-amber-300 text-sm">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    {Number(item.price).toLocaleString()} C
                  </div>
                </div>

                {isMyListing ? (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-emerald-400 font-medium">
                      К выплате (после сбора): +{Number(item.seller_revenue).toLocaleString()} C
                    </span>
                    <button
                      onClick={() => handleCancelListing(item.listing_id)}
                      className="py-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition active:scale-[0.98]"
                    >
                      Снять лот
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={buyingId === item.listing_id || Number(user?.coins || 0) < item.price}
                    className="w-full py-2.5 px-3 rounded-xl bg-[var(--tg-theme-button-color,#0284c7)] text-[var(--tg-theme-button-text-color,#ffffff)] font-semibold text-xs transition duration-150 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    {buyingId === item.listing_id ? 'Оформление сделки...' : `Купить за ${item.price.toLocaleString()} C`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
