// client/src/App.jsx
import React, { useState, useEffect } from 'react';
import { api } from './api';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
import WarningModal from './components/WarningModal';
import PhoneDetailModal from './components/PhoneDetailModal';
import SellSystemModal from './components/SellSystemModal';
import ListMarketModal from './components/ListMarketModal';
import ExpandInventoryModal from './components/ExpandInventoryModal';
import StationSheet from './components/StationSheet';

import InventoryView from './views/InventoryView';
import DropView from './views/DropView';
import MarketView from './views/MarketView';
import CraftView from './views/CraftView';
import ProfileView from './views/ProfileView';
import LeaderboardView from './views/LeaderboardView';

import { haptic } from './haptic';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [stationOpen, setStationOpen] = useState(false);

  // Тост-уведомления
  const [toast, setToast] = useState(null);

  // Модальные окна
  const [warningOpen, setWarningOpen] = useState(false);
  const [detailPhoneId, setDetailPhoneId] = useState(null);
  const [sellModalPhone, setSellModalPhone] = useState(null);
  const [listModalPhone, setListModalPhone] = useState(null);
  const [expandModalOpen, setExpandModalOpen] = useState(false);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 2800);
  };

  // Инициализация Telegram Mini App и пользователя
  const initApp = async () => {
    try {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor?.('#0f172a');
        tg.setBackgroundColor?.('#0f172a');
        tg.enableClosingConfirmation?.();
      }

      // Проверка первого запуска (предупреждение)
      const hasSeenWarning = localStorage.getItem('phone_drop_warning_seen');
      if (!hasSeenWarning) {
        setWarningOpen(true);
      }

      const res = await api.auth();
      setUser(res.user);
    } catch (err) {
      console.error('[App Init Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

  const handleCloseWarning = () => {
    localStorage.setItem('phone_drop_warning_seen', 'true');
    setWarningOpen(false);
  };

  const reloadUser = async () => {
    try {
      const res = await api.auth();
      setUser(res.user);
    } catch (err) {
      console.error(err);
    }
  };

  // Действия с номерами
  const handleEquipPhone = async (phoneId) => {
    try {
      await api.equipPhone(phoneId);
      haptic.notification('success');
      showToast(phoneId ? 'Номер надет в профиль' : 'Номер снят с профиля', 'success');
      await reloadUser();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleConfirmSellSystem = async (phoneId) => {
    try {
      await api.sellSystem(phoneId);
      haptic.notification('success');
      showToast('Номер успешно сдан системе', 'success');
      await reloadUser();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleConfirmListMarket = async (phoneId, price) => {
    try {
      await api.listMarket(phoneId, price);
      haptic.notification('success');
      showToast(`Номер выставлен на рынок за ${price.toLocaleString()} C`, 'success');
      await reloadUser();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleConfirmExpandInventory = async () => {
    try {
      await api.expandInventory();
      showToast('Вместимость увеличена на +25 слотов', 'success');
      await reloadUser();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--tg-theme-bg-color,#0f172a)] flex flex-col items-center justify-center p-4 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl">
          📱
        </div>
        <div className="text-xs font-medium text-[var(--tg-theme-hint-color,#94a3b8)]">
          Загрузка Phone Drop...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--tg-theme-bg-color,#0f172a)] text-[var(--tg-theme-text-color,#f8fafc)] flex flex-col justify-between">
      {/* Всплывающий тост */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Верхняя панель */}
      <Navbar
        user={user}
        onWarningClick={() => setWarningOpen(true)}
        onReloadUser={reloadUser}
        onOpenStation={() => setStationOpen(true)}
      />

      {/* Основной контент вкладки */}
      <main className="flex-1 pt-3 pb-8">
        {showLeaderboard ? (
          <LeaderboardView
            onBack={() => setShowLeaderboard(false)}
            onOpenDetails={(id) => setDetailPhoneId(id)}
          />
        ) : (
          <>
            {activeTab === 'inventory' && (
              <InventoryView
                user={user}
                equippedPhoneId={user?.equipped_phone_id}
                onOpenDetails={(id) => setDetailPhoneId(id)}
                onOpenExpandInventory={() => setExpandModalOpen(true)}
              />
            )}

            {activeTab === 'drop' && (
              <DropView
                user={user}
                onUpdateUser={reloadUser}
                onEquipPhone={handleEquipPhone}
                onOpenDetails={(id) => setDetailPhoneId(id)}
                onOpenStation={() => setStationOpen(true)}
                showToast={showToast}
              />
            )}

            {activeTab === 'market' && (
              <MarketView
                user={user}
                onUpdateUser={reloadUser}
                onOpenDetails={(id) => setDetailPhoneId(id)}
                showToast={showToast}
              />
            )}

            {activeTab === 'craft' && (
              <CraftView
                user={user}
                onUpdateUser={reloadUser}
                onOpenDetails={(id) => setDetailPhoneId(id)}
                showToast={showToast}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                user={user}
                onUpdateUser={reloadUser}
                onWarningClick={() => setWarningOpen(true)}
                onOpenDetails={(id) => setDetailPhoneId(id)}
                onOpenLeaderboard={() => setShowLeaderboard(true)}
                showToast={showToast}
              />
            )}
          </>
        )}
      </main>

      {/* Нижняя навигация */}
      <BottomNav
        activeTab={showLeaderboard ? '' : activeTab}
        onTabChange={(tab) => {
          setShowLeaderboard(false);
          setActiveTab(tab);
        }}
      />

      {/* Модальные окна */}
      <WarningModal
        isOpen={warningOpen}
        onClose={handleCloseWarning}
      />

      <PhoneDetailModal
        phoneId={detailPhoneId}
        currentUserId={user?.id}
        equippedPhoneId={user?.equipped_phone_id}
        isOpen={Boolean(detailPhoneId)}
        onClose={() => setDetailPhoneId(null)}
        onEquip={handleEquipPhone}
        onSellSystem={(phone) => setSellModalPhone(phone)}
        onListMarket={(phone) => setListModalPhone(phone)}
      />

      <SellSystemModal
        phone={sellModalPhone}
        isOpen={Boolean(sellModalPhone)}
        onClose={() => setSellModalPhone(null)}
        onConfirm={handleConfirmSellSystem}
      />

      <ListMarketModal
        phone={listModalPhone}
        isOpen={Boolean(listModalPhone)}
        onClose={() => setListModalPhone(null)}
        onConfirm={handleConfirmListMarket}
      />

      <ExpandInventoryModal
        currentCapacity={user?.max_inventory || 50}
        currentCoins={user?.coins || 0}
        isOpen={expandModalOpen}
        onClose={() => setExpandModalOpen(false)}
        onConfirm={handleConfirmExpandInventory}
      />

      {/* Шторка станции связи (кликер) */}
      <StationSheet
        isOpen={stationOpen}
        onClose={() => setStationOpen(false)}
        onUpdateUser={reloadUser}
        showToast={showToast}
      />
    </div>
  );
}
