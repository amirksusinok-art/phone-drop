// client/src/views/DropView.jsx
import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Coins, Flame, Globe, Shield, RefreshCw, Check, ArrowRight, Tag } from 'lucide-react';
import { api } from '../api';
import PhoneCard, { RARITIES_CONFIG } from '../components/PhoneCard';
import SignalCard from '../components/SignalCard';
import { haptic } from '../haptic';

const COUNTRIES_LIST = [
  { key: 'RU', name: 'Россия', flag: '🇷🇺' },
  { key: 'UA', name: 'Украина', flag: '🇺🇦' },
  { key: 'US', name: 'США (555)', flag: '🇺🇸' },
  { key: 'TR', name: 'Турция', flag: '🇹🇷' },
  { key: 'CN', name: 'Китай', flag: '🇨🇳' }
];

export default function DropView({
  user,
  onUpdateUser,
  onEquipPhone,
  onOpenDetails,
  onOpenStation,
  showToast
}) {
  const [casesInfo, setCasesInfo] = useState(null);
  const [selectedCase, setSelectedCase] = useState('common');
  const [selectedCountry, setSelectedCountry] = useState('RU');
  const [isOpening, setIsOpening] = useState(false);
  const [droppedPhone, setDroppedPhone] = useState(null);
  const [isFirstDiscovery, setIsFirstDiscovery] = useState(false);
  
  // Поцифровой барабан
  const [displayDigits, setDisplayDigits] = useState('• • • • • • • • • •');
  const [rollingValue, setRollingValue] = useState(0);
  const [revealStage, setRevealStage] = useState(0);

  const loadCases = () => {
    api.getCasesInfo()
      .then(res => setCasesInfo(res))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    loadCases();
  }, []);

  const currentCaseConfig = casesInfo?.cases?.[selectedCase] || { price: 100, name: 'Кейс' };
  const canAfford = Number(user?.coins || 0) >= currentCaseConfig.price;

  // Интеграция с нативной Telegram MainButton
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.MainButton) return;

    if (!droppedPhone && !isOpening) {
      if (canAfford) {
        tg.MainButton.setText(`Открыть кейс (${currentCaseConfig.price.toLocaleString()} C)`);
        tg.MainButton.show();
        const handleClick = () => handleOpen();
        tg.MainButton.onClick(handleClick);
        return () => {
          tg.MainButton.offClick(handleClick);
          tg.MainButton.hide();
        };
      } else {
        tg.MainButton.setText('Недостаточно Coins');
        tg.MainButton.show();
        tg.MainButton.disable?.();
        return () => tg.MainButton.hide();
      }
    } else {
      tg.MainButton.hide();
    }
  }, [droppedPhone, isOpening, canAfford, selectedCase, currentCaseConfig.price]);

  const handleOpen = async () => {
    if (!canAfford || isOpening) {
      if (!canAfford) showToast('Недостаточно Coins для открытия', 'error');
      return;
    }

    setDroppedPhone(null);
    setIsOpening(true);
    setRevealStage(1);
    setRollingValue(0);
    haptic.impact('heavy');

    const countryParam = selectedCase === 'national' ? selectedCountry : null;
    const opKey = `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const res = await api.openCase(selectedCase, countryParam, opKey);
      const targetNumber = res.phone.formatted_number;
      const targetPrice = Number(res.phone.base_price || 0);

      // Разбиваем номер на логические сегменты для поочередного раскрытия
      // Например: ["+7 ", "(916) ", "555-", "22-", "33"]
      const parts = targetNumber.split(/(\s|-)/).filter(Boolean);

      // Шаг 1: Фиксация кода страны (0-300ms)
      setDisplayDigits(`${targetNumber.slice(0, 3)} ••• ••• •• ••`);
      setRollingValue(Math.round(targetPrice * 0.15));
      haptic.impact('light');

      // Шаг 2: Фиксация кода оператора (350-700ms)
      setTimeout(() => {
        setDisplayDigits(`${targetNumber.slice(0, 8)} ••• •• ••`);
        setRollingValue(Math.round(targetPrice * 0.4));
        setRevealStage(2);
        haptic.impact('light');
      }, 400);

      // Шаг 3: Раскрытие первой тройки цифр узора (750-1100ms)
      setTimeout(() => {
        setDisplayDigits(`${targetNumber.slice(0, 12)} •• ••`);
        setRollingValue(Math.round(targetPrice * 0.7));
        setRevealStage(3);
        haptic.impact('medium');
      }, 850);

      // Шаг 4: Раскрытие предпоследней пары цифр (1150-1500ms)
      setTimeout(() => {
        setDisplayDigits(`${targetNumber.slice(0, 15)} ••`);
        setRollingValue(Math.round(targetPrice * 0.9));
        setRevealStage(4);
        haptic.impact('medium');
      }, 1250);

      // Шаг 5: Финальный замок полного номера и раскрытие карты (1650ms)
      setTimeout(() => {
        setDisplayDigits(targetNumber);
        setRollingValue(targetPrice);
        setRevealStage(5);
        setIsOpening(false);
        setDroppedPhone(res.phone);
        setIsFirstDiscovery(res.isFirstDiscovery);
        haptic.notification('success');
        onUpdateUser();
        loadCases();

        if (['rare', 'epic', 'legendary', 'mythic'].includes(res.phone.rarity)) {
          confetti({
            particleCount: res.phone.rarity === 'mythic' ? 120 : 70,
            spread: 60,
            origin: { y: 0.6 }
          });
        }
      }, 1650);

    } catch (err) {
      setIsOpening(false);
      setRevealStage(0);
      haptic.notification('error');
      showToast(err.message || 'Ошибка открытия кейса', 'error');
    }
  };

  const handleSellDirect = async () => {
    if (!droppedPhone) return;
    try {
      await api.sellSystem(droppedPhone.id);
      showToast(`Номер сдан системе за +${droppedPhone.base_price} Coins`, 'success');
      setDroppedPhone(null);
      onUpdateUser();
      loadCases();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto px-4">
      {/* 📶 Плашка пассивного дохода Вышки связи с кнопкой кликера */}
      <SignalCard
        onOpenStation={onOpenStation}
        onUpdateUser={onUpdateUser}
        showToast={showToast}
      />

      {/* Селектор кейсов */}
      <div className="grid grid-cols-3 gap-2">
        {casesInfo?.cases && Object.values(casesInfo.cases).map((c) => {
          const isSel = selectedCase === c.id;
          return (
            <button
              key={c.id}
              onClick={() => {
                haptic.selection();
                setSelectedCase(c.id);
                setDroppedPhone(null);
              }}
              className={`p-3 rounded-2xl border text-center transition-all duration-150 active:scale-[0.98] ${
                isSel
                  ? 'bg-sky-500/10 border-sky-400 text-white'
                  : 'bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border-white/5 text-[var(--tg-theme-hint-color,#94a3b8)] hover:text-white'
              }`}
            >
              <div className="text-xl mb-1">{c.icon}</div>
              <div className="text-xs font-semibold truncate">
                {c.name.replace(' кейс', '')}
              </div>
              <div className="text-[11px] font-number font-medium text-amber-300 flex items-center justify-center gap-1 mt-1">
                <Coins className="w-3 h-3 text-amber-400" />
                {c.price.toLocaleString()}
              </div>
            </button>
          );
        })}
      </div>

      {/* Если выбран национальный кейс — выбор страны */}
      {selectedCase === 'national' && (
        <div className="p-3.5 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 space-y-2">
          <div className="text-xs font-medium text-[var(--tg-theme-hint-color,#94a3b8)] flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            Страна номера:
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {COUNTRIES_LIST.map((cty) => (
              <button
                key={cty.key}
                onClick={() => {
                  haptic.selection();
                  setSelectedCountry(cty.key);
                }}
                className={`py-2 px-1 rounded-xl border text-center transition active:scale-[0.98] ${
                  selectedCountry === cty.key
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-semibold'
                    : 'bg-white/5 border-white/5 text-[var(--tg-theme-hint-color,#94a3b8)]'
                }`}
              >
                <div className="text-base">{cty.flag}</div>
                <div className="text-[10px] truncate mt-0.5">{cty.key}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Блок рулетки / открытия с поцифровой анимацией */}
      <div className="rounded-2xl border border-white/5 bg-[var(--tg-theme-secondary-bg-color,#1e293b)] p-5 text-center">
        <div className="text-xs font-medium text-[var(--tg-theme-hint-color,#94a3b8)] mb-1">
          {currentCaseConfig.name}
        </div>
        <p className="text-xs text-[var(--tg-theme-text-color,#f8fafc)]/80 mb-5 max-w-xs mx-auto">
          {currentCaseConfig.description}
        </p>

        {droppedPhone ? (
          <div className="space-y-4">
            {isFirstDiscovery && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/30 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                Первооткрыватель номера!
              </div>
            )}

            <PhoneCard
              phone={droppedPhone}
              onClick={() => onOpenDetails(droppedPhone.id)}
            />

            {/* Действия после открытия */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={handleSellDirect}
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-rose-400 border border-white/5 text-xs font-semibold transition active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Coins className="w-3.5 h-3.5" />
                Продать (+{droppedPhone.base_price} C)
              </button>
              <button
                onClick={() => setDroppedPhone(null)}
                className="py-2.5 px-3 rounded-xl bg-[var(--tg-theme-button-color,#0284c7)] text-[var(--tg-theme-button-text-color,#ffffff)] text-xs font-semibold transition active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                В коллекцию
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Поцифровой барабан раскрытия с бегущей оценкой */}
            <div className="rounded-xl bg-[var(--tg-theme-bg-color,#0f172a)] border border-white/5 p-4 flex flex-col items-center justify-center space-y-2">
              {/* Бегущий счетчик ценности по мере открытия цифр */}
              {isOpening && (
                <div className="flex items-center gap-1 text-xs font-number font-bold text-amber-300 animate-pulse">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  +{rollingValue.toLocaleString()} Coins
                </div>
              )}

              {/* Отображение цифр номера */}
              <div className="h-10 flex items-center justify-center">
                <span className={`font-number text-lg sm:text-xl font-bold tracking-tight transition-all duration-150 ${
                  isOpening ? 'text-sky-400' : 'text-slate-400'
                }`}>
                  {isOpening ? displayDigits : '• • • • • • • • • •'}
                </span>
              </div>

              {/* Тонкие точки стадий раскрытия */}
              {isOpening && (
                <div className="flex gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map((st) => (
                    <div
                      key={st}
                      className={`w-2 h-1 rounded-full transition-all duration-200 ${
                        revealStage >= st ? 'bg-sky-400 w-4' : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Кнопка выбивания (дубликат для веба) */}
            <button
              onClick={handleOpen}
              disabled={isOpening || !canAfford}
              className={`w-full py-3.5 px-5 rounded-xl font-semibold text-sm transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2 ${
                isOpening
                  ? 'bg-white/5 text-[var(--tg-theme-hint-color,#94a3b8)] cursor-not-allowed'
                  : canAfford
                  ? 'bg-[var(--tg-theme-button-color,#0284c7)] text-[var(--tg-theme-button-text-color,#ffffff)]'
                  : 'bg-white/5 text-[var(--tg-theme-hint-color,#94a3b8)] cursor-not-allowed opacity-60'
              }`}
            >
              {isOpening ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Сканируем частоты...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Открыть кейс ({currentCaseConfig.price.toLocaleString()} C)
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Прозрачная таблица шансов пула */}
      <div className="p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#1e293b)] border border-white/5 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[var(--tg-theme-text-color,#f8fafc)] flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            Шансы пула (доступно: {casesInfo?.totalAvailable?.toLocaleString() || '...'})
          </span>
          <span className="text-[10px] text-[var(--tg-theme-hint-color,#94a3b8)]">Серия 2026</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-xs">
          {casesInfo?.chances && Object.entries(casesInfo.chances).map(([rarityKey, chance]) => {
            const rConfig = RARITIES_CONFIG[rarityKey] || RARITIES_CONFIG.common;
            return (
              <div
                key={rarityKey}
                className="p-2 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between"
              >
                <span className="text-[11px] font-medium text-slate-300">{rConfig.name}</span>
                <span className="font-number text-xs font-semibold text-white mt-1">
                  {selectedCase === 'elite' && ['common', 'uncommon'].includes(rarityKey)
                    ? '0%'
                    : `${chance}%`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
