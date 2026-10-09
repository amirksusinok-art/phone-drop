// client/src/views/CraftView.jsx
import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Layers, ArrowRight, Check, X, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../api';
import PhoneCard, { RARITIES_CONFIG } from '../components/PhoneCard';
import { haptic } from '../haptic';

const CRAFT_TIERS_INFO = {
  common: { name: 'Обычные', nextName: 'Необычный', luckyName: 'Редкий' },
  uncommon: { name: 'Необычные', nextName: 'Редкий', luckyName: 'Эпический' },
  rare: { name: 'Редкие', nextName: 'Эпический', luckyName: 'Легендарный' },
  epic: { name: 'Эпические', nextName: 'Легендарный', luckyName: 'Мифический' }
};

export default function CraftView({
  user,
  onUpdateUser,
  onOpenDetails,
  showToast
}) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRarity, setSelectedRarity] = useState('common');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isCrafting, setIsCrafting] = useState(false);
  const [craftResult, setCraftResult] = useState(null);

  const loadCraftInventory = () => {
    setLoading(true);
    api.getInventory({ rarity: selectedRarity })
      .then(res => {
        // Исключаем номера, выставленные на рынок
        const available = (res.inventory || []).filter(p => p.status === 'owned');
        setInventory(available);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setSelectedIds([]);
    loadCraftInventory();
  }, [selectedRarity]);

  // Интеграция с нативной Telegram MainButton
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.MainButton) return;

    if (selectedIds.length === 5 && !isCrafting && !craftResult) {
      tg.MainButton.setText('Синтезировать 5 номеров');
      tg.MainButton.show();
      const handleClick = () => handleFuse();
      tg.MainButton.onClick(handleClick);
      return () => {
        tg.MainButton.offClick(handleClick);
        tg.MainButton.hide();
      };
    } else {
      tg.MainButton.hide();
    }
  }, [selectedIds, isCrafting, craftResult]);

  const toggleSelectPhone = (phone) => {
    if (isCrafting) return;
    haptic.selection();

    if (selectedIds.includes(phone.id)) {
      setSelectedIds(selectedIds.filter(id => id !== phone.id));
    } else {
      if (selectedIds.length >= 5) {
        showToast('Вы уже выбрали 5 номеров для контракта', 'info');
        return;
      }
      setSelectedIds([...selectedIds, phone.id]);
    }
  };

  const handleFuse = async () => {
    if (selectedIds.length !== 5 || isCrafting) return;
    setIsCrafting(true);
    haptic.impact('heavy');

    try {
      const res = await api.fuseCraft(selectedIds);
      
      // Небольшая задержка для плавного тактильного эффекта процесса синтеза
      setTimeout(() => {
        setIsCrafting(false);
        setCraftResult(res);
        setSelectedIds([]);
        haptic.notification('success');
        onUpdateUser();
        loadCraftInventory();

        if (res.isLuckyUpgrade) {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 }
          });
          showToast('🍀 СУПЕР УДАЧА! Редкость повышена на +2 уровня!', 'success');
        } else {
          confetti({
            particleCount: 60,
            spread: 50,
            origin: { y: 0.6 }
          });
          showToast('Синтез успешен! Получен новый номер', 'success');
        }
      }, 1000);
    } catch (err) {
      setIsCrafting(false);
      haptic.notification('error');
      showToast(err.message || 'Ошибка синтеза номеров', 'error');
    }
  };

  const tierInfo = CRAFT_TIERS_INFO[selectedRarity] || CRAFT_TIERS_INFO.common;
  const selectedPhones = inventory.filter(p => selectedIds.includes(p.id));

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto px-4">
      {/* Шапка контракта */}
      <div className="p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[var(--tg-theme-text-color,#f8fafc)]">
                Контракт обмена
              </h1>
              <p className="text-xs text-[var(--tg-theme-hint-color,#94a3b8)]">
                Сжигай 5 номеров — получай 1 более ценный
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-white/5 text-[var(--tg-theme-hint-color,#94a3b8)]">
            5 ➔ 1
          </span>
        </div>
      </div>

      {/* Выбор редкости для обмена */}
      <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 text-xs">
        {Object.entries(CRAFT_TIERS_INFO).map(([key, t]) => {
          const isSel = selectedRarity === key;
          return (
            <button
              key={key}
              onClick={() => {
                haptic.selection();
                setSelectedRarity(key);
              }}
              className={`flex-1 py-1.5 rounded-lg font-medium transition duration-150 active:scale-[0.98] ${
                isSel
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'text-[var(--tg-theme-hint-color,#94a3b8)] hover:text-white'
              }`}
            >
              {t.name}
            </button>
          );
        })}
      </div>

      {/* Вероятности и 5 слотов */}
      <div className="p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--tg-theme-hint-color,#94a3b8)]">
            Слоты ({selectedIds.length} из 5)
          </span>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-emerald-400 font-medium">90% {tierInfo.nextName}</span>
            <span className="text-amber-400 font-medium">🍀 10% {tierInfo.luckyName}</span>
          </div>
        </div>

        {/* 5 слотов */}
        <div className="grid grid-cols-5 gap-1.5">
          {[0, 1, 2, 3, 4].map((slotIdx) => {
            const phone = selectedPhones[slotIdx];
            return (
              <div
                key={slotIdx}
                className={`h-16 rounded-xl border flex flex-col items-center justify-center p-1 text-center transition ${
                  phone
                    ? 'border-sky-500/40 bg-sky-500/10'
                    : 'border-dashed border-white/10 bg-white/[0.02]'
                }`}
              >
                {phone ? (
                  <>
                    <span className="text-xs">{phone.country}</span>
                    <span className="text-[10px] font-number font-semibold text-white truncate max-w-full">
                      ..{phone.raw_national_number?.slice(-4) || 'XXXX'}
                    </span>
                    <button
                      onClick={() => toggleSelectPhone(phone)}
                      className="mt-0.5 p-0.5 rounded text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-[var(--tg-theme-hint-color,#94a3b8)] font-mono">
                    #{slotIdx + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Кнопка синтеза внутри страницы (резервная для браузера) */}
        <button
          onClick={handleFuse}
          disabled={selectedIds.length !== 5 || isCrafting}
          className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition duration-150 active:scale-[0.98] flex items-center justify-center gap-2 ${
            selectedIds.length === 5 && !isCrafting
              ? 'bg-[var(--tg-theme-button-color,#0284c7)] text-[var(--tg-theme-button-text-color,#ffffff)]'
              : 'bg-white/5 text-[var(--tg-theme-hint-color,#94a3b8)] cursor-not-allowed opacity-60'
          }`}
        >
          {isCrafting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Синтезируем номер...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {selectedIds.length === 5 ? 'Синтезировать контракт' : `Выбери еще ${5 - selectedIds.length} шт.`}
            </>
          )}
        </button>
      </div>

      {/* Результат успешного крафта */}
      {craftResult && craftResult.phone && (
        <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-400/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-bold text-white">
                {craftResult.isLuckyUpgrade ? '🍀 СУПЕР УДАЧА!' : 'Результат синтеза'}
              </span>
            </div>
            <button
              onClick={() => setCraftResult(null)}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <PhoneCard
            phone={craftResult.phone}
            onClick={() => onOpenDetails(craftResult.phone.id)}
          />

          <button
            onClick={() => setCraftResult(null)}
            className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition active:scale-[0.98]"
          >
            Забрать в коллекцию
          </button>
        </div>
      )}

      {/* Список доступных номеров из коллекции для выбора */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--tg-theme-hint-color,#94a3b8)] px-1">
          <span>Твои {tierInfo.name.toLowerCase()} номера ({inventory.length} шт.)</span>
          {selectedIds.length > 0 && (
            <button
              onClick={() => setSelectedIds([])}
              className="text-sky-400 hover:underline"
            >
              Сбросить выбор
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 skeleton rounded-xl" />
            ))}
          </div>
        ) : inventory.length === 0 ? (
          <div className="py-12 text-center rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 p-6 space-y-2">
            <div className="text-2xl">📦</div>
            <div className="text-sm font-semibold text-white">Нет подходящих номеров</div>
            <p className="text-xs text-[var(--tg-theme-hint-color,#94a3b8)] max-w-xs mx-auto">
              У тебя нет номеров этой редкости. Выбивай новые во вкладке «Дроп» или купи на Рынке!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {inventory.map((phone) => {
              const isSelected = selectedIds.includes(phone.id);
              return (
                <PhoneCard
                  key={phone.id}
                  phone={phone}
                  selectable={true}
                  isSelected={isSelected}
                  onClick={() => toggleSelectPhone(phone)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
