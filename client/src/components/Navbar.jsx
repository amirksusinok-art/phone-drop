// client/src/components/Navbar.jsx
import React from 'react';
import { Coins, ShieldAlert, Users, Sparkles } from 'lucide-react';
import { getDemoUser, setDemoUser } from '../api';

export default function Navbar({ user, onWarningClick, onReloadUser }) {
  const isInsideTelegram = Boolean(window.Telegram?.WebApp?.initData);

  const toggleDemoAccount = () => {
    const current = getDemoUser();
    if (current.id === 'demo_user_1') {
      setDemoUser({ id: 'demo_user_2', name: 'Мария Трейдер', username: 'maria_trade' });
    } else {
      setDemoUser({ id: 'demo_user_1', name: 'Алекс Коллекционер', username: 'alex_collector' });
    }
    onReloadUser();
  };

  return (
    <header className="sticky top-0 z-40 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Логотип */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-lg">📱</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight text-white text-base">Phone Drop</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/30">
                2026
              </span>
            </div>
            <div className="text-[11px] text-slate-400 truncate max-w-[120px]">
              {user?.first_name || 'Игрок'}
            </div>
          </div>
        </div>

        {/* Баланс Coins и переключатели */}
        <div className="flex items-center gap-2">
          {/* Баланс Coins */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 rounded-xl shadow-inner">
            <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="font-mono-numbers font-bold text-amber-300 text-sm">
              {Number(user?.coins || 0).toLocaleString()}
            </span>
          </div>

          {/* Предупреждение */}
          <button
            onClick={onWarningClick}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50 transition active:scale-95"
            title="Правила и безопасность"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </button>

          {/* Демо-переключатель, если запущен в обычном браузере */}
          {!isInsideTelegram && (
            <button
              onClick={toggleDemoAccount}
              className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 transition flex items-center gap-1"
              title="Переключить тестового игрока для проверки рынка"
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
