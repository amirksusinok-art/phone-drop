// client/src/App.jsx
import React, { useState, useEffect } from 'react';
import { api } from './api';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import WarningModal from './components/WarningModal';
import PhoneDetailModal from './components/PhoneDetailModal';
import SellSystemModal from './components/SellSystemModal';
import ListMarketModal from './components/ListMarketModal';
import ExpandInventoryModal from './components/ExpandInventoryModal';

import DropView from './views/DropView';
import InventoryView from './views/InventoryView';
import MarketView from './views/MarketView';
import LeaderboardView from './views/LeaderboardView';
import ProfileView from './views/ProfileView';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('drop');

  // Модальные окна
  const [warningOpen, setWarningOpen] = useState(false);
  const [detailPhoneId, setDetailPhoneId] = useState(null);
  const [sellModalPhone, setSellModalPhone] = useState(null);
  const [listModalPhone, setListModalPhone] = useState(null);
  const [expandModalOpen, setExpandModalOpen] = useState(false);

  // Инициализация Telegram Mini App и пользователя
  const initApp = async () => {
    try {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
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
      await reloadUser();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleConfirmSellSystem = async (phoneId) => {
    await api.sellSystem(phoneId);
    await reloadUser();
  };

  const handleConfirmListMarket = async (phoneId, price) => {
    await api.listMarket(phoneId, price);
    await reloadUser();
  };

  const handleConfirmExpandInventory = async () => {
    await api.expandInventory();
    await reloadUser();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c15] flex flex-col items-center justify-center text-slate-400 space-y-4">
        <div className="text-4xl animate-bounce">📱</div>
        <div className="text-sm font-semibold tracking-wide text-cyan-400">
          Загрузка Phone Drop...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c15] text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      {/* Верхняя навигация */}
      <Navbar
        user={user}
        onWarningClick={() => setWarningOpen(true)}
        onReloadUser={reloadUser}
      />

      {/* Основной контент активной вкладки */}
      <main className="flex-1 pt-4 pb-12">
        {activeTab === 'drop' && (
          <DropView
            user={user}
            onUpdateUser={reloadUser}
            onEquipPhone={handleEquipPhone}
            onOpenDetails={(id) => setDetailPhoneId(id)}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            user={user}
            equippedPhoneId={user?.equipped_phone_id}
            onOpenDetails={(id) => setDetailPhoneId(id)}
            onOpenExpandInventory={() => setExpandModalOpen(true)}
          />
        )}

        {activeTab === 'market' && (
          <MarketView
            user={user}
            onUpdateUser={reloadUser}
            onOpenDetails={(id) => setDetailPhoneId(id)}
          />
        )}

        {activeTab === 'top' && (
          <LeaderboardView
            onOpenDetails={(id) => setDetailPhoneId(id)}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            user={user}
            onUpdateUser={reloadUser}
            onWarningClick={() => setWarningOpen(true)}
            onOpenDetails={(id) => setDetailPhoneId(id)}
          />
        )}
      </main>

      {/* Нижняя панель навигации */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
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
    </div>
  );
}
