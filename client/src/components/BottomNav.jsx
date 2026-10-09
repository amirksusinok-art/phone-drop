// client/src/components/BottomNav.jsx
import React from 'react';
import { Sparkles, Library, ShoppingCart, Trophy, User } from 'lucide-react';

export default function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'drop', label: 'Дроп', icon: Sparkles },
    { id: 'inventory', label: 'Коллекция', icon: Library },
    { id: 'market', label: 'Рынок', icon: ShoppingCart },
    { id: 'top', label: 'Топ', icon: Trophy },
    { id: 'profile', label: 'Профиль', icon: User }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0b0f1d]/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 safe-area-pb">
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition duration-150 active:scale-95 ${
                isActive
                  ? 'text-cyan-400 bg-cyan-500/10 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                )}
              </div>
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
