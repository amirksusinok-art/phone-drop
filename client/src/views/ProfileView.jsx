// client/src/views/ProfileView.jsx
import React, { useState, useEffect } from 'react';
import { User, Sparkles, Coins, ShoppingBag, Globe, Award, ShieldAlert, Check, Palette } from 'lucide-react';
import { api } from '../api';
import PhoneCard from '../components/PhoneCard';

export default function ProfileView({
  user,
  onUpdateUser,
  onWarningClick,
  onOpenDetails
}) {
  const [profileData, setProfileData] = useState(null);
  const [albums, setAlbums] = useState(null);
  const [cosmetics, setCosmetics] = useState([]);
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'albums' | 'shop'
  const [loading, setLoading] = useState(true);

  const loadProfile = () => {
    setLoading(true);
    Promise.all([
      api.getProfile(),
      api.getAlbums(),
      api.getCosmetics()
    ])
      .then(([pRes, aRes, cRes]) => {
        setProfileData(pRes);
        setAlbums(aRes.albums || {});
        setCosmetics(cRes.cosmetics || []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleBuyCosmetic = async (itemId) => {
    try {
      await api.buyCosmetic(itemId);
      onUpdateUser();
      loadProfile();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEquipCosmetic = async (type, itemId) => {
    try {
      await api.equipCosmetic(type, itemId);
      onUpdateUser();
      loadProfile();
    } catch (err) {
      alert(err.message);
    }
  };

  const equippedPhone = profileData?.equippedPhone;
  const stats = profileData?.stats || { totalPhones: 0, totalValue: 0, completedSales: 0 };

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto px-4">
      
      {/* Карточка пользователя с аватаром и оформлением */}
      <div className={`p-5 rounded-3xl border border-slate-700/80 bg-gradient-to-br from-[#111726] to-[#0c101c] shadow-xl text-center relative overflow-hidden`}>
        <div className="relative z-10 flex flex-col items-center">
          
          {/* Аватар с рамкой */}
          <div className="relative mb-3">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-3xl text-white font-black shadow-lg border-2 border-slate-700`}>
              {user?.first_name?.[0] || '📱'}
            </div>
          </div>

          <h1 className="text-xl font-black text-white tracking-tight">
            {user?.first_name || 'Игрок'}
          </h1>
          <p className="text-xs text-slate-400">
            @{user?.username || `id${user?.telegram_id}`}
          </p>

          {/* Баланс */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 font-mono-numbers text-sm font-bold text-amber-300">
            <Coins className="w-4 h-4 text-amber-400" />
            {Number(user?.coins || 0).toLocaleString()} Coins
          </div>
        </div>

        {/* Надетый номер профиля */}
        <div className="mt-5 pt-4 border-t border-slate-800 text-left">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Выбранный номер профиля
          </div>
          {equippedPhone ? (
            <PhoneCard
              phone={equippedPhone}
              isEquipped={true}
              onClick={() => onOpenDetails(equippedPhone.id)}
            />
          ) : (
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
              Номер не выбран. Откройте свою «Коллекцию» и выберите лучший номер для показа в профиле!
            </div>
          )}
        </div>
      </div>

      {/* Вкладки: Статистика / Альбомы / Магазин */}
      <div className="grid grid-cols-3 p-1 bg-slate-900 rounded-2xl border border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('stats')}
          className={`py-2 rounded-xl font-bold transition ${
            activeTab === 'stats' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Статистика
        </button>
        <button
          onClick={() => setActiveTab('albums')}
          className={`py-2 rounded-xl font-bold transition ${
            activeTab === 'albums' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Альбомы
        </button>
        <button
          onClick={() => setActiveTab('shop')}
          className={`py-2 rounded-xl font-bold transition ${
            activeTab === 'shop' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Магазин
        </button>
      </div>

      {/* Контент активной вкладки */}
      {activeTab === 'stats' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">Номеров</span>
              <span className="font-mono-numbers text-base font-extrabold text-white">
                {stats.totalPhones}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">Ценность</span>
              <span className="font-mono-numbers text-xs font-extrabold text-amber-300">
                {stats.totalValue.toLocaleString()} C
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">Сделок</span>
              <span className="font-mono-numbers text-base font-extrabold text-emerald-400">
                {stats.completedSales}
              </span>
            </div>
          </div>

          <button
            onClick={onWarningClick}
            className="w-full p-3.5 rounded-2xl bg-slate-900/80 border border-amber-500/30 hover:border-amber-500/50 text-slate-200 text-xs font-semibold flex items-center justify-between transition"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Официальные правила и безопасность</span>
            </div>
            <span className="text-amber-400">➔</span>
          </button>

          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-between transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">📜</span>
              <span>Политика конфиденциальности (RU / EN)</span>
            </div>
            <span className="text-slate-400">➔</span>
          </a>
        </div>
      )}

      {activeTab === 'albums' && (
        <div className="space-y-3">
          <div className="text-xs text-slate-400">
            Собирайте уникальные узоры (12 категорий) для каждой из поддерживаемых стран:
          </div>
          {Object.values(albums).map((a) => {
            const count = a.foundCategories?.length || 0;
            const pct = Math.round((count / 12) * 100);

            return (
              <div
                key={a.country}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{a.flag}</span>
                    <span className="font-bold text-white">{a.name}</span>
                  </div>
                  <span className="font-mono text-cyan-300 font-bold">
                    {count} / 12 категорий
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {count > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {a.foundCategories.map((cat, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'shop' && (
        <div className="space-y-3">
          <div className="text-xs text-slate-400">
            Кастомизируйте свой профиль за Coins (предметы остаются навсегда):
          </div>

          <div className="space-y-2">
            {cosmetics.map((item) => {
              const isEquipped = user?.avatar_frame === item.id || user?.profile_bg === item.id;

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white text-sm">{item.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {item.type === 'frame' ? 'Рамка аватара' : 'Фон профиля'}
                    </div>
                  </div>

                  <div>
                    {item.isOwned ? (
                      <button
                        onClick={() => handleEquipCosmetic(item.type, isEquipped ? 'default' : item.id)}
                        className={`py-1.5 px-3 rounded-xl font-bold transition flex items-center gap-1 ${
                          isEquipped
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isEquipped ? 'Надето' : 'Надеть'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuyCosmetic(item.id)}
                        disabled={Number(user?.coins || 0) < item.price}
                        className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center gap-1 disabled:opacity-50"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        {item.price.toLocaleString()} C
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
