// client/src/components/BottomNav.jsx
import React from 'react';
import { Smartphone, Sparkles, Store, Layers, User } from 'lucide-react';
import { haptic } from '../haptic';

export default function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'inventory', label: 'Номера', icon: Smartphone },
    { id: 'drop', label: 'Дроп', icon: Sparkles },
    { id: 'market', label: 'Рынок', icon: Store },
    { id: 'craft', label: 'Крафт', icon: Layers },
    { id: 'profile', label: 'Профиль', icon: User }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--tg-theme-bg-color,#0f172a)]/95 backdrop-blur-md border-t border-white/5 px-2 py-1.5 safe-area-pb">
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                haptic.selection();
                onTabChange(tab.id);
              }}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 active:scale-[0.95] ${
                isActive
                  ? 'text-[var(--tg-theme-button-color,#38bdf8)] font-semibold'
                  : 'text-[var(--tg-theme-hint-color,#94a3b8)] hover:text-white font-normal'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.2px]' : 'stroke-[1.6px]'}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current" />
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
