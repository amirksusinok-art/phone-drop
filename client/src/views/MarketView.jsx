// client/src/views/MarketView.jsx
import React, { useState, useEffect } from 'react';
import { ShoppingCart, Coins, Percent, Tag, Search, ArrowUpDown, X, Check } from 'lucide-react';
import { api } from '../api';
import PhoneCard, { RARITY_STYLES } from '../components/PhoneCard';

export default function MarketView({ user, onUpdateUser, onOpenDetails }) {
  const [tab, setTab] = useState('all'); // 'all' | 'my'
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRarity, setSelectedRarity] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [statusMsg, setStatusMsg] = useState('');
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
      setStatusMsg(`Недостаточно Coins! Нужно ${listing.price.toLocaleString()}, у вас ${Number(user?.coins || 0).toLocaleString()}`);
      return;
    }
    setBuyingId(listing.listing_id);
    try {
      await api.buyMarket(listing.listing_id);
      setStatusMsg('🎉 Номер успешно куплен и добавлен в вашу коллекцию!');
      onUpdateUser();
      loadMarket();
    } catch (err) {
      setStatusMsg(`Ошибка покупки: ${err.message}`);
    } finally {
      setBuyingId(null);
    }
  };

  const handleCancelListing = async (listingId) => {
    try {
      await api.cancelMarket(listingId);
      setStatusMsg('Объявление отменено. Номер возвращен в вашу коллекцию.');
      onUpdateUser();
      loadMarket();
    } catch (err) {
      setStatusMsg(`Ошибка: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto px-4">
      
      {/* Шапка рынка и баннер комиссии 5% */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/70 to-slate-900 border border-indigo-500/30 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Рынок номеров</h2>
              <p className="text-[11px] text-slate-400">Торгуйте коллекциями между игроками</p>
            </div>
          </div>

          <div className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-[11px] font-bold text-indigo-300 flex items-center gap-1">
            <Percent className="w-3.5 h-3.5" />
            Комиссия 5%
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-200 flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg('')} className="p-1 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Вкладки: Все лоты / Мои объявления */}
      <div className="grid grid-cols-2 p-1 bg-slate-900 rounded-2xl border border-slate-800 text-xs">
        <button
          onClick={() => setTab('all')}
          className={`py-2 rounded-xl font-bold transition ${
            tab === 'all'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Все предложения
        </button>
        <button
          onClick={() => setTab('my')}
          className={`py-2 rounded-xl font-bold transition ${
            tab === 'my'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Мои объявления
        </button>
      </div>

      {/* Поиск и фильтры */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по цифрам на рынке..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center justify-between gap-2">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
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
            onChange={(e) => setSortBy(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="newest">Новые объявления</option>
            <option value="price_asc">Сначала дешевле</option>
            <option value="price_desc">Сначала дороже</option>
            <option value="score_desc">По очкам узора</option>
          </select>
        </div>
      </div>

      {/* Список предложений */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 text-xs">
          Загрузка предложений рынка...
        </div>
      ) : listings.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800 p-6 space-y-2">
          <div className="text-3xl">🛒</div>
          <div className="text-sm font-bold text-slate-300">
            {tab === 'my' ? 'У вас нет активных объявлений' : 'Объявлений пока нет'}
          </div>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {tab === 'my'
              ? 'Вы можете выставить любой номер из своей коллекции на продажу.'
              : 'Будьте первым, кто выставит редкий номер на продажу другим игрокам!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((item) => {
            const isMyListing = Number(item.seller_id) === Number(user?.id);

            return (
              <div
                key={item.listing_id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-3"
              >
                {/* Карточка номера */}
                <PhoneCard
                  phone={item}
                  onClick={() => onOpenDetails(item.id)}
                />

                {/* Информация о продавце и цене сделки */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">
                      Продавец: <strong className="text-slate-200">{item.seller_name || 'Игрок'}</strong>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Размещено: {new Date(item.listed_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Цена покупки:</span>
                    <span className="font-mono-numbers font-extrabold text-amber-300 text-base flex items-center gap-1 justify-end">
                      <Coins className="w-4 h-4 text-amber-400" />
                      {Number(item.price).toLocaleString()} C
                    </span>
                  </div>
                </div>

                {/* Кнопка действия */}
                {isMyListing ? (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-emerald-400 font-medium">
                      Доход (после 5%): +{Number(item.seller_revenue).toLocaleString()} Coins
                    </span>
                    <button
                      onClick={() => handleCancelListing(item.listing_id)}
                      className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                    >
                      Снять с продажи
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={buyingId === item.listing_id || Number(user?.coins || 0) < item.price}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Coins className="w-4 h-4" />
                    {buyingId === item.listing_id ? 'Оформление покупки...' : `Купить за ${item.price.toLocaleString()} Coins`}
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
