// client/src/components/Navbar.jsx
import React from 'react';
import { Coins, ShieldAlert, Users, Radio } from 'lucide-react';
import { getDemoUser, setDemoUser } from '../api';
import { haptic } from '../haptic';

export default function Navbar({ user, onWarningClick, onReloadUser, onOpenStation }) {
  const isInsideTelegram = Boolean(window.Telegram?.WebApp?.initData);

  const toggleDemoAccount = () => {
    haptic.selection();
    const current = getDemoUser();
    if (current.id === 'demo_user_1') {
      setDemoUser({ id: 'demo_user_2', name: 'Мария Трейдер', username: 'maria_trade' });
    } else {
      setDemoUser({ id: 'demo_user_1', name: 'Алекс Коллекционер', username: 'alex_collector' });
    }
    onReloadUser();
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--tg-theme-bg-color,#0f172a)]/95 backdrop-blur-md border-b border-white/5 px-4 py-2.5">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Логотип и имя пользователя */}
        <div className="flex items-center gap-2.5">
          <img
            src="/app_icon.jpg"
            alt="Phone Drop"
            className="w-8 h-8 rounded-xl object-cover border border-white/10 shadow-sm"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-[var(--tg-theme-text-color,#f8fafc)] text-sm">
                Phone Drop
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/5 text-[var(--tg-theme-hint-color,#94a3b8)] font-medium">
                2026
              </span>
            </div>
            <div className="text-[11px] text-[var(--tg-theme-hint-color,#94a3b8)] truncate max-w-[120px]">
              {user?.first_name || 'Игрок'}
            </div>
          </div>
        </div>

        {/* Баланс Coins и кнопки */}
        <div className="flex items-center gap-2">
          {/* Баланс Coins */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-400/10 border border-amber-400/20 rounded-xl">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-number font-bold text-amber-300 text-xs">
              {Number(user?.coins || 0).toLocaleString()}
            </span>
          </div>

          {/* Кнопка станции связи (кликер) */}
          <button
            onClick={() => {
              haptic.selection();
              onOpenStation?.();
            }}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-sky-400 border border-white/5 transition active:scale-[0.95]"
            title="Станция связи"
          >
            <Radio className="w-4 h-4" />
          </button>

          {/* Предупреждение о правилах */}
          <button
            onClick={() => {
              haptic.selection();
              onWarningClick();
            }}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--tg-theme-hint-color,#94a3b8)] border border-white/5 transition active:scale-[0.95]"
            title="Правила и безопасность"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </button>

          {/* Демо-переключатель для браузера */}
          {!isInsideTelegram && (
            <button
              onClick={toggleDemoAccount}
              className="px-2 py-1 text-[11px] font-medium rounded-lg bg-white/5 text-[var(--tg-theme-hint-color,#94a3b8)] border border-white/10 hover:bg-white/10 transition flex items-center gap-1"
              title="Переключить тестового игрока"
            >
              <Users className="w-3 h-3" />
              Dev
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
