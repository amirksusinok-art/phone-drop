// client/src/views/ProfileView.jsx
import React, { useState, useEffect } from 'react';
import {
  User, Sparkles, Coins, Users, Star, Trophy, ShieldAlert,
  Copy, Share2, Check, ExternalLink, Globe, Palette
} from 'lucide-react';
import { api } from '../api';
import PhoneCard from '../components/PhoneCard';
import { haptic } from '../haptic';

export default function ProfileView({
  user,
  onUpdateUser,
  onWarningClick,
  onOpenDetails,
  onOpenLeaderboard,
  showToast
}) {
  const [profileData, setProfileData] = useState(null);
  const [referralsData, setReferralsData] = useState(null);
  const [starsPackages, setStarsPackages] = useState([]);
  const [albums, setAlbums] = useState({});
  const [cosmetics, setCosmetics] = useState([]);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'stars' | 'stats' | 'shop'
  const [loading, setLoading] = useState(true);
  const [buyingStarId, setBuyingStarId] = useState(null);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      api.getProfile(),
      api.getReferrals(),
      api.getStarsPackages(),
      api.getAlbums(),
      api.getCosmetics()
    ])
      .then(([pRes, rRes, sRes, aRes, cRes]) => {
        setProfileData(pRes);
        setReferralsData(rRes);
        setStarsPackages(sRes.packages || []);
        setAlbums(aRes.albums || {});
        setCosmetics(cRes.cosmetics || []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCopyRefLink = () => {
    haptic.notification('success');
    const link = referralsData?.referralLink || `https://t.me/phonedrop_bot?start=ref_${user?.telegram_id}`;
    navigator.clipboard.writeText(link);
    showToast('Реферальная ссылка скопирована', 'success');
  };

  const handleShareRefLink = () => {
    haptic.impact('medium');
    const link = referralsData?.referralLink || `https://t.me/phonedrop_bot?start=ref_${user?.telegram_id}`;
    const shareText = 'Выбивай редкие телефонные номера в Phone Drop! Получи 100 Coins при старте.';
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`;

    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(tgUrl);
    } else {
      window.open(tgUrl, '_blank');
    }
  };

  const handleBuyStars = async (pkg) => {
    haptic.impact('heavy');
    setBuyingStarId(pkg.id);

    try {
      const res = await api.buyStars(pkg.id);
      
      if (res.invoiceLink && window.Telegram?.WebApp?.openInvoice) {
        window.Telegram.WebApp.openInvoice(res.invoiceLink, (status) => {
          if (status === 'paid') {
            haptic.notification('success');
            showToast(`Успешно начислено +${pkg.coins.toLocaleString()} Coins!`, 'success');
            onUpdateUser();
            loadAll();
          } else if (status === 'cancelled') {
            showToast('Оплата отменена', 'info');
          }
        });
      } else {
        // Демо-режим или прямое начисление
        haptic.notification('success');
        showToast(`Успешно получено +${pkg.coins.toLocaleString()} Coins!`, 'success');
        onUpdateUser();
        loadAll();
      }
    } catch (err) {
      haptic.notification('error');
      showToast(err.message || 'Ошибка покупки Stars', 'error');
    } finally {
      setBuyingStarId(null);
    }
  };

  const handleBuyCosmetic = async (itemId) => {
    haptic.impact('medium');
    try {
      await api.buyCosmetic(itemId);
      showToast('Предмет приобретен!', 'success');
      onUpdateUser();
      loadAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEquipCosmetic = async (type, itemId) => {
    haptic.selection();
    try {
      await api.equipCosmetic(type, itemId);
      onUpdateUser();
      loadAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const equippedPhone = profileData?.equippedPhone;
  const stats = profileData?.stats || { totalPhones: 0, totalValue: 0, completedSales: 0 };

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto px-4">
      {/* Профиль пользователя */}
      <div className="p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-bold text-white">
            {user?.first_name?.[0] || '📱'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-[var(--tg-theme-text-color,#f8fafc)] truncate">
              {user?.first_name || 'Игрок'}
            </h1>
            <p className="text-xs text-[var(--tg-theme-hint-color,#94a3b8)] truncate">
              @{user?.username || `id${user?.telegram_id}`}
            </p>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-400/10 border border-amber-400/20 rounded-xl">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-number font-bold text-amber-300 text-xs">
              {Number(user?.coins || 0).toLocaleString()} C
            </span>
          </div>
        </div>

        {/* Выбранный номер профиля */}
        <div className="pt-2 border-t border-white/5">
          <div className="text-[11px] font-medium text-[var(--tg-theme-hint-color,#94a3b8)] mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-sky-400" />
            Главный номер профиля
          </div>
          {equippedPhone ? (
            <PhoneCard
              phone={equippedPhone}
              isEquipped={true}
              onClick={() => onOpenDetails(equippedPhone.id)}
            />
          ) : (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-[var(--tg-theme-hint-color,#94a3b8)]">
              Номер не выбран. Надень лучший номер в своей коллекции!
            </div>
          )}
        </div>
      </div>

      {/* Навигационные табы профиля */}
      <div className="grid grid-cols-4 p-1 bg-[var(--tg-theme-secondary-bg-color,#1e293b)] rounded-xl border border-white/5 text-xs">
        {[
          { id: 'friends', label: 'Друзья', icon: Users },
          { id: 'stars', label: 'Звёзды', icon: Star },
          { id: 'stats', label: 'Инфо', icon: Trophy },
          { id: 'shop', label: 'Стиль', icon: Palette }
        ].map(t => {
          const Icon = t.icon;
          const isSel = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                haptic.selection();
                setActiveTab(t.id);
              }}
              className={`py-1.5 rounded-lg font-medium transition duration-150 active:scale-[0.98] flex items-center justify-center gap-1 ${
                isSel
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'text-[var(--tg-theme-hint-color,#94a3b8)] hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. ВКЛАДКА ДРУЗЬЯ (РЕФЕРАЛЫ) */}
      {activeTab === 'friends' && (
        <div className="space-y-3">
          {/* Реферальная карточка */}
          <div className="p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 space-y-3">
            <div>
              <h2 className="text-sm font-bold text-white">Зови друзей — получай Coins</h2>
              <p className="text-xs text-[var(--tg-theme-hint-color,#94a3b8)] mt-0.5">
                Бонусы за каждого активного игрока
              </p>
            </div>

            {/* Сетка условий */}
            <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-[var(--tg-theme-hint-color,#94a3b8)] block">Тебе</span>
                <span className="font-number font-bold text-amber-300">+150 C</span>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-[var(--tg-theme-hint-color,#94a3b8)] block">Другу</span>
                <span className="font-number font-bold text-sky-300">+100 C</span>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-[var(--tg-theme-hint-color,#94a3b8)] block">С продаж</span>
                <span className="font-number font-bold text-emerald-300">10%</span>
              </div>
            </div>

            {/* Кнопки ссылки */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleCopyRefLink}
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white border border-white/5 transition active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                Скопировать
              </button>
              <button
                onClick={handleShareRefLink}
                className="py-2.5 px-3 rounded-xl bg-[var(--tg-theme-button-color,#0284c7)] text-[var(--tg-theme-button-text-color,#ffffff)] text-xs font-semibold transition active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                Пригласить
              </button>
            </div>
          </div>

          {/* Статистика рефералов */}
          <div className="p-3.5 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 flex items-center justify-between text-xs">
            <div>
              <span className="text-[11px] text-[var(--tg-theme-hint-color,#94a3b8)]">Приглашено друзей</span>
              <div className="text-sm font-bold text-white font-number">
                {referralsData?.friendsCount || 0} чел.
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[var(--tg-theme-hint-color,#94a3b8)]">Заработано пассивно</span>
              <div className="text-sm font-bold text-amber-300 font-number flex items-center justify-end gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                {Number(referralsData?.totalEarnings || 0).toLocaleString()} C
              </div>
            </div>
          </div>

          {/* Список друзей */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-[var(--tg-theme-hint-color,#94a3b8)] px-1">
              Список приглашенных ({referralsData?.friends?.length || 0})
            </span>

            {referralsData?.friends?.length === 0 ? (
              <div className="p-5 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 text-center text-xs text-[var(--tg-theme-hint-color,#94a3b8)]">
                Ты пока никого не пригласил. Отправь ссылку друзьям!
              </div>
            ) : (
              referralsData?.friends?.map((f) => (
                <div
                  key={f.id}
                  className="p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-white">
                      {f.first_name?.[0] || 'U'}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{f.first_name || 'Друг'}</div>
                      <div className="text-[10px] text-[var(--tg-theme-hint-color,#94a3b8)]">
                        @{f.username || 'user'}
                      </div>
                    </div>
                  </div>
                  <span className="font-number font-semibold text-amber-300">
                    +{f.bonus_coins} C
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. ВКЛАДКА TELEGRAM STARS */}
      {activeTab === 'stars' && (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 space-y-1">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <h2 className="text-sm font-bold text-white">Покупка Coins за Telegram Stars</h2>
            </div>
            <p className="text-xs text-[var(--tg-theme-hint-color,#94a3b8)]">
              Официальная валюта Telegram для моментального пополнения баланса
            </p>
          </div>

          <div className="space-y-2">
            {starsPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="p-3.5 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-white text-sm flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    {pkg.title}
                  </div>
                  <div className="text-[11px] text-[var(--tg-theme-hint-color,#94a3b8)]">
                    {pkg.description}
                  </div>
                </div>

                <button
                  onClick={() => handleBuyStars(pkg)}
                  disabled={buyingStarId === pkg.id}
                  className="py-2 px-3.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 font-semibold transition active:scale-[0.98] flex items-center gap-1.5"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {pkg.stars} Stars
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. ВКЛАДКА СТАТИСТИКА И АЛЬБОМЫ */}
      {activeTab === 'stats' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5">
              <span className="text-[10px] text-[var(--tg-theme-hint-color,#94a3b8)] block">Номеров</span>
              <span className="font-number font-bold text-white text-sm">
                {stats.totalPhones}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5">
              <span className="text-[10px] text-[var(--tg-theme-hint-color,#94a3b8)] block">Ценность</span>
              <span className="font-number font-bold text-amber-300 text-xs">
                {stats.totalValue.toLocaleString()} C
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5">
              <span className="text-[10px] text-[var(--tg-theme-hint-color,#94a3b8)] block">Сделок</span>
              <span className="font-number font-bold text-emerald-400 text-sm">
                {stats.completedSales}
              </span>
            </div>
          </div>

          {/* Альбомы стран */}
          <div className="space-y-2 pt-1">
            <div className="text-xs font-medium text-[var(--tg-theme-hint-color,#94a3b8)] px-1">
              Коллекции стран (12 узоров в каждой)
            </div>
            {Object.values(albums).map((a) => {
              const count = a.foundCategories?.length || 0;
              const pct = Math.round((count / 12) * 100);

              return (
                <div
                  key={a.country}
                  className="p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white flex items-center gap-1.5">
                      <span>{a.flag}</span> {a.name}
                    </span>
                    <span className="font-number text-sky-400 font-semibold text-[11px]">
                      {count} / 12
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-sky-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Зал славы */}
          <button
            onClick={() => {
              haptic.selection();
              onOpenLeaderboard?.();
            }}
            className="w-full p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 hover:border-white/10 text-xs font-semibold text-white flex items-center justify-between transition active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Зал славы (Топ номеров и игроков)</span>
            </div>
            <span className="text-[var(--tg-theme-hint-color,#94a3b8)]">➔</span>
          </button>

          {/* Ссылки на правила и политику */}
          <button
            onClick={() => {
              haptic.selection();
              onWarningClick();
            }}
            className="w-full p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-amber-400/20 text-xs font-medium text-amber-200 flex items-center justify-between transition active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Правила и безопасность номеров</span>
            </div>
            <span>➔</span>
          </button>

          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 text-xs font-medium text-[var(--tg-theme-hint-color,#94a3b8)] flex items-center justify-between transition"
          >
            <div className="flex items-center gap-2">
              <span>📜</span>
              <span>Политика конфиденциальности (RU / EN)</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* 4. ВКЛАДКА КАСТОМИЗАЦИЯ */}
      {activeTab === 'shop' && (
        <div className="space-y-2">
          {cosmetics.map((item) => {
            const isEquipped = user?.avatar_frame === item.id || user?.profile_bg === item.id;

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-white text-xs">{item.name}</div>
                  <div className="text-[10px] text-[var(--tg-theme-hint-color,#94a3b8)] mt-0.5">
                    {item.type === 'frame' ? 'Рамка аватара' : 'Фон профиля'}
                  </div>
                </div>

                <div>
                  {item.isOwned ? (
                    <button
                      onClick={() => handleEquipCosmetic(item.type, isEquipped ? 'default' : item.id)}
                      className={`py-1.5 px-3 rounded-xl font-semibold transition active:scale-[0.98] ${
                        isEquipped
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      {isEquipped ? 'Надето' : 'Надеть'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuyCosmetic(item.id)}
                      disabled={Number(user?.coins || 0) < item.price}
                      className="py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold transition active:scale-[0.98] disabled:opacity-50 flex items-center gap-1"
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
      )}
    </div>
  );
}
