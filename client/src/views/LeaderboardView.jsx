// client/src/views/LeaderboardView.jsx
import React, { useState, useEffect } from 'react';
import { Trophy, Award, Coins, Sparkles, Flame, User, ShoppingBag, Globe } from 'lucide-react';
import { api } from '../api';
import PhoneCard from '../components/PhoneCard';

export default function LeaderboardView({ onOpenDetails }) {
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
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/50 to-slate-900 border border-amber-500/30 shadow-md flex items-center gap-3">
        <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-400">
          <Trophy className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Зал славы Phone Drop</h2>
          <p className="text-[11px] text-slate-400">Лучшие находки и самые богатые коллекционеры</p>
        </div>
      </div>

      {/* Переключение Топ Номеров / Топ Игроков */}
      <div className="grid grid-cols-2 p-1 bg-slate-900 rounded-2xl border border-slate-800 text-xs">
        <button
          onClick={() => {
            setMainTab('phones');
            setSubTab('most_expensive');
          }}
          className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
            mainTab === 'phones' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Топ номеров
        </button>
        <button
          onClick={() => {
            setMainTab('players');
            setSubTab('richest');
          }}
          className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
            mainTab === 'players' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Топ игроков
        </button>
      </div>

      {/* Подвкладки */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {mainTab === 'phones' ? (
          <>
            <button
              onClick={() => setSubTab('most_expensive')}
              className={`py-1 px-3 rounded-lg border whitespace-nowrap transition ${
                subTab === 'most_expensive'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800'
              }`}
            >
              💎 Дорогие
            </button>
            <button
              onClick={() => setSubTab('rarest')}
              className={`py-1 px-3 rounded-lg border whitespace-nowrap transition ${
                subTab === 'rarest'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800'
              }`}
            >
              👑 Редкие
            </button>
            <button
              onClick={() => setSubTab('monoliths')}
              className={`py-1 px-3 rounded-lg border whitespace-nowrap transition ${
                subTab === 'monoliths'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800'
              }`}
            >
              Монолиты
            </button>
            <button
              onClick={() => setSubTab('mirrors')}
              className={`py-1 px-3 rounded-lg border whitespace-nowrap transition ${
                subTab === 'mirrors'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800'
              }`}
            >
              Зеркальные
            </button>
            <button
              onClick={() => setSubTab('sequences')}
              className={`py-1 px-3 rounded-lg border whitespace-nowrap transition ${
                subTab === 'sequences'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800'
              }`}
            >
              Последовательности
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setSubTab('richest')}
              className={`py-1 px-3 rounded-lg border whitespace-nowrap transition ${
                subTab === 'richest'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800'
              }`}
            >
              💰 Богатейшие
            </button>
            <button
              onClick={() => setSubTab('best_collections')}
              className={`py-1 px-3 rounded-lg border whitespace-nowrap transition ${
                subTab === 'best_collections'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800'
              }`}
            >
              🏆 Лучшие коллекции
            </button>
            <button
              onClick={() => setSubTab('top_traders')}
              className={`py-1 px-3 rounded-lg border whitespace-nowrap transition ${
                subTab === 'top_traders'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800'
              }`}
            >
              🤝 Топ торговцы
            </button>
          </>
        )}
      </div>

      {/* Список позиций рейтинга */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 text-xs">
          Загрузка рейтинга...
        </div>
      ) : data.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
          Записей пока нет
        </div>
      ) : mainTab === 'phones' ? (
        <div className="space-y-3">
          {data.map((phone, idx) => (
            <div key={phone.id} className="relative">
              <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-slate-950/90 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-amber-300">
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
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
              className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="w-5 text-center font-bold text-slate-400 font-mono">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                </span>

                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  {player.first_name?.[0] || 'U'}
                </div>

                <div>
                  <div className="font-bold text-white text-sm">
                    {player.first_name || 'Игрок'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    @{player.username || `id${player.id}`}
                  </div>
                </div>
              </div>

              <div className="text-right">
                {subTab === 'richest' && (
                  <div className="font-mono-numbers font-bold text-amber-300 text-sm flex items-center justify-end gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    {Number(player.coins).toLocaleString()}
                  </div>
                )}
                {subTab === 'best_collections' && (
                  <div>
                    <div className="font-mono-numbers font-bold text-cyan-300 text-xs">
                      {Number(player.total_value).toLocaleString()} Coins
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {player.phones_count} номеров
                    </div>
                  </div>
                )}
                {subTab === 'top_traders' && (
                  <div className="font-bold text-emerald-400">
                    {player.deals_count} успешных сделок
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
