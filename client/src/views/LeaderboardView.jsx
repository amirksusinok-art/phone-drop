// client/src/views/LeaderboardView.jsx
import React, { useState, useEffect } from 'react';
import { Trophy, Coins, Sparkles, User, ArrowLeft } from 'lucide-react';
import { api } from '../api';
import PhoneCard from '../components/PhoneCard';
import { haptic } from '../haptic';

export default function LeaderboardView({ onOpenDetails, onBack }) {
  const [mainTab, setMainTab] = useState('phones'); // 'phones' | 'players'
  const [subTab, setSubTab] = useState('most_expensive');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (mainTab === 'phones') {
      api.getPhoneLeaderboard({ tab: subTab })
        .then(res => setData(res.phones || []))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    } else {
      api.getPlayerLeaderboard(subTab)
        .then(res => setData(res.players || []))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [mainTab, subTab]);

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto px-4">
      {/* Шапка рейтинга */}
      <div className="p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              onClick={() => {
                haptic.selection();
                onBack();
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white mr-1 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[var(--tg-theme-text-color,#f8fafc)]">
              Зал славы
            </h1>
            <p className="text-xs text-[var(--tg-theme-hint-color,#94a3b8)]">
              Лучшие находки и коллекционеры
            </p>
          </div>
        </div>
      </div>

      {/* Переключение Топ Номеров / Топ Игроков */}
      <div className="grid grid-cols-2 p-1 bg-[var(--tg-theme-secondary-bg-color,#1e293b)] rounded-xl border border-white/5 text-xs">
        <button
          onClick={() => {
            haptic.selection();
            setMainTab('phones');
            setSubTab('most_expensive');
          }}
          className={`py-2 rounded-lg font-medium transition duration-150 active:scale-[0.98] flex items-center justify-center gap-1.5 ${
            mainTab === 'phones'
              ? 'bg-sky-500 text-slate-950 font-semibold'
              : 'text-[var(--tg-theme-hint-color,#94a3b8)] hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Топ номеров
        </button>
        <button
          onClick={() => {
            haptic.selection();
            setMainTab('players');
            setSubTab('richest');
          }}
          className={`py-2 rounded-lg font-medium transition duration-150 active:scale-[0.98] flex items-center justify-center gap-1.5 ${
            mainTab === 'players'
              ? 'bg-sky-500 text-slate-950 font-semibold'
              : 'text-[var(--tg-theme-hint-color,#94a3b8)] hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Топ игроков
        </button>
      </div>

      {/* Подвкладки */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
        {mainTab === 'phones' ? (
          <>
            {[
              { id: 'most_expensive', label: 'Дорогие' },
              { id: 'rarest', label: 'Редкие' },
              { id: 'monoliths', label: 'Монолиты' },
              { id: 'mirrors', label: 'Зеркальные' },
              { id: 'sequences', label: 'Последовательности' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  haptic.selection();
                  setSubTab(tab.id);
                }}
                className={`py-1 px-2.5 rounded-lg border whitespace-nowrap transition text-xs font-medium ${
                  subTab === tab.id
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400/40 font-semibold'
                    : 'bg-[var(--tg-theme-secondary-bg-color,#1e293b)] text-[var(--tg-theme-hint-color,#94a3b8)] border-white/5 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </>
        ) : (
          <>
            {[
              { id: 'richest', label: 'Богатейшие' },
              { id: 'best_collections', label: 'Лучшие коллекции' },
              { id: 'top_traders', label: 'Топ торговцы' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  haptic.selection();
                  setSubTab(tab.id);
                }}
                className={`py-1 px-2.5 rounded-lg border whitespace-nowrap transition text-xs font-medium ${
                  subTab === tab.id
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400/40 font-semibold'
                    : 'bg-[var(--tg-theme-secondary-bg-color,#1e293b)] text-[var(--tg-theme-hint-color,#94a3b8)] border-white/5 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Список позиций рейтинга */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 skeleton rounded-xl" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="py-12 text-center text-xs text-[var(--tg-theme-hint-color,#94a3b8)] bg-[var(--tg-theme-secondary-bg-color,#1e293b)] rounded-2xl border border-white/5">
          Записей пока нет
        </div>
      ) : mainTab === 'phones' ? (
        <div className="space-y-2.5">
          {data.map((phone, idx) => (
            <div key={phone.id} className="relative">
              <div className="absolute top-2 left-2 z-10 w-5 h-5 rounded-md bg-slate-900/90 border border-white/10 flex items-center justify-center text-[10px] font-bold text-amber-300 font-mono">
                {idx === 0 ? '1' : idx === 1 ? '2' : idx === 2 ? '3' : idx + 1}
              </div>
              <PhoneCard
                phone={phone}
                onClick={() => onOpenDetails(phone.id)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((player, idx) => (
            <div
              key={player.id}
              className="p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-4 text-center font-bold text-[var(--tg-theme-hint-color,#94a3b8)] font-mono text-[11px]">
                  {idx + 1}
                </span>

                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white font-bold text-xs">
                  {player.first_name?.[0] || 'U'}
                </div>

                <div>
                  <div className="font-semibold text-white">
                    {player.first_name || 'Игрок'}
                  </div>
                  <div className="text-[10px] text-[var(--tg-theme-hint-color,#94a3b8)]">
                    @{player.username || `id${player.id}`}
                  </div>
                </div>
              </div>

              <div className="text-right">
                {subTab === 'richest' && (
                  <div className="font-number font-bold text-amber-300 text-xs flex items-center justify-end gap-1">
                    <Coins className="w-3 h-3 text-amber-400" />
                    {Number(player.coins).toLocaleString()} C
                  </div>
                )}
                {subTab === 'best_collections' && (
                  <div>
                    <div className="font-number font-bold text-sky-300 text-xs">
                      {Number(player.total_value).toLocaleString()} C
                    </div>
                    <div className="text-[10px] text-[var(--tg-theme-hint-color,#94a3b8)]">
                      {player.phones_count} шт.
                    </div>
                  </div>
                )}
                {subTab === 'top_traders' && (
                  <div className="font-medium text-emerald-400 text-xs">
                    {player.deals_count} сделок
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
