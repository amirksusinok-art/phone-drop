// client/src/views/DropView.jsx
import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Coins,
  Globe,
  Shield,
  RefreshCw,
  Check,
  Tag,
  Copy,
  Zap,
  Radio,
  Flame,
  Award
} from 'lucide-react';
import { api } from '../api';
import PhoneCard, { RARITIES_CONFIG, COUNTRY_META } from '../components/PhoneCard';
import SignalCard from '../components/SignalCard';
import { haptic } from '../haptic';

const COUNTRIES_LIST = [
  { key: 'RU', name: 'Россия', flag: '🇷🇺' },
  { key: 'UA', name: 'Украина', flag: '🇺🇦' },
  { key: 'US', name: 'США (555)', flag: '🇺🇸' },
  { key: 'TR', name: 'Турция', flag: '🇹🇷' },
  { key: 'CN', name: 'Китай', flag: '🇨🇳' }
];

// Вспомогательная функция для генерации случайных чисел в барабане
const randomDigits = (len) => {
  let str = '';
  for (let i = 0; i < len; i++) {
    str += Math.floor(Math.random() * 10).toString();
  }
  return str;
};

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
  const [copied, setCopied] = useState(false);

  // Цифровой скремблер (5 логических сегментов номера)
  // [код_страны, код_оператора, три_цифры, две_цифры, две_цифры]
  const [reelSlots, setReelSlots] = useState(['+???', '(??)', '???', '??', '??']);
  const [lockedFlags, setLockedFlags] = useState([false, false, false, false, false]);
  const [revealStage, setRevealStage] = useState(0);
  const [rollingCoins, setRollingCoins] = useState(0);

  const scramblerIntervalRef = useRef(null);
  const targetSlotsRef = useRef(null);

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

  // Очистка таймеров при размонтировании
  useEffect(() => {
    return () => {
      if (scramblerIntervalRef.current) clearInterval(scramblerIntervalRef.current);
    };
  }, []);

  // Разбиение отформатированного номера на 5 красивых сегментов
  // Примеры:
  // "+380 (50) 290-46-14" -> ["+380", "(50)", "290", "46", "14"]
  // "+7 (916) 555-22-33" -> ["+7", "(916)", "555", "22", "33"]
  // "+1 (555) 789-0123"   -> ["+1", "(555)", "789", "01", "23"]
  const parseNumberSegments = (formatted) => {
    try {
      const match = formatted.match(/^(\+\d+)\s*(\([0-9]+\))\s*([0-9]+)[-\s]([0-9]{2})[-\s]?([0-9]{2,4})$/);
      if (match) {
        return [match[1], match[2], match[3], match[4], match[5]];
      }
      // Фоллбек разбиение по пробелам и дефисам
      const raw = formatted.replace(/\s+/g, ' ').split(/[\s-]+/);
      if (raw.length >= 5) {
        return [raw[0], raw[1], raw[2], raw[3], raw.slice(4).join('')];
      }
    } catch {}
    return ['+•••', '(••)', '•••', '••', '••'];
  };

  const handleOpen = async () => {
    if (!canAfford || isOpening) {
      if (!canAfford) showToast('Недостаточно Coins для открытия', 'error');
      return;
    }

    setDroppedPhone(null);
    setIsOpening(true);
    setRevealStage(0);
    setLockedFlags([false, false, false, false, false]);
    setRollingCoins(0);
    haptic.impact('heavy');

    const countryParam = selectedCase === 'national' ? selectedCountry : null;
    const opKey = `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Запускаем высокоскоростной цифровой скремблер (каждые 40мс)
    if (scramblerIntervalRef.current) clearInterval(scramblerIntervalRef.current);
    scramblerIntervalRef.current = setInterval(() => {
      setReelSlots(prev => {
        const next = [...prev];
        const target = targetSlotsRef.current;
        // Генерируем случайные бегущие цифры только для незалоченных слотов
        if (!lockedFlags[0]) next[0] = target ? (Math.random() > 0.5 ? target[0] : `+${randomDigits(2)}`) : `+${randomDigits(2)}`;
        if (!lockedFlags[1]) next[1] = `(${randomDigits(2)})`;
        if (!lockedFlags[2]) next[2] = randomDigits(3);
        if (!lockedFlags[3]) next[3] = randomDigits(2);
        if (!lockedFlags[4]) next[4] = randomDigits(2);
        return next;
      });
    }, 40);

    try {
      const res = await api.openCase(selectedCase, countryParam, opKey);
      const targetNumber = res.phone.formatted_number;
      const targetPrice = Number(res.phone.base_price || 0);
      const segments = parseNumberSegments(targetNumber);
      targetSlotsRef.current = segments;

      // 🏁 ЭТАП 1: Замок кода страны (400мс)
      setTimeout(() => {
        setLockedFlags(prev => [true, false, false, false, false]);
        setReelSlots(prev => [segments[0], prev[1], prev[2], prev[3], prev[4]]);
        setRevealStage(1);
        setRollingCoins(Math.round(targetPrice * 0.2));
        haptic.impact('light');
      }, 400);

      // 🏁 ЭТАП 2: Замок кода оператора (800мс)
      setTimeout(() => {
        setLockedFlags(prev => [true, true, false, false, false]);
        setReelSlots(prev => [segments[0], segments[1], prev[2], prev[3], prev[4]]);
        setRevealStage(2);
        setRollingCoins(Math.round(targetPrice * 0.45));
        haptic.impact('light');
      }, 800);

      // 🏁 ЭТАП 3: Замок первой группы цифр узора (1200мс)
      setTimeout(() => {
        setLockedFlags(prev => [true, true, true, false, false]);
        setReelSlots(prev => [segments[0], segments[1], segments[2], prev[3], prev[4]]);
        setRevealStage(3);
        setRollingCoins(Math.round(targetPrice * 0.75));
        haptic.impact('medium');
      }, 1200);

      // 🏁 ЭТАП 4: Замок предпоследней пары (1600мс)
      setTimeout(() => {
        setLockedFlags(prev => [true, true, true, true, false]);
        setReelSlots(prev => [segments[0], segments[1], segments[2], segments[3], prev[4]]);
        setRevealStage(4);
        setRollingCoins(Math.round(targetPrice * 0.9));
        haptic.impact('medium');
      }, 1600);

      // 🏁 ЭТАП 5: Финальный замок джекпота и появление карточки (1950мс)
      setTimeout(() => {
        if (scramblerIntervalRef.current) clearInterval(scramblerIntervalRef.current);
        setLockedFlags([true, true, true, true, true]);
        setReelSlots(segments);
        setRevealStage(5);
        setRollingCoins(targetPrice);
        setIsOpening(false);
        setDroppedPhone(res.phone);
        setIsFirstDiscovery(res.isFirstDiscovery);
        haptic.notification('success');
        onUpdateUser();
        loadCases();

        if (['rare', 'epic', 'legendary', 'mythic'].includes(res.phone.rarity)) {
          confetti({
            particleCount: res.phone.rarity === 'mythic' ? 140 : 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      }, 1950);

    } catch (err) {
      if (scramblerIntervalRef.current) clearInterval(scramblerIntervalRef.current);
      setIsOpening(false);
      setRevealStage(0);
      setLockedFlags([false, false, false, false, false]);
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

  const handleCopyNumber = () => {
    if (!droppedPhone?.formatted_number) return;
    navigator.clipboard?.writeText(droppedPhone.formatted_number);
    setCopied(true);
    haptic.selection();
    showToast('Номер скопирован в буфер', 'success');
    setTimeout(() => setCopied(false), 1500);
  };

  const droppedMeta = droppedPhone ? (COUNTRY_META[droppedPhone.country] || { name: droppedPhone.country, flag: '🌐' }) : null;
  const droppedRConfig = droppedPhone ? (RARITIES_CONFIG[droppedPhone.rarity] || RARITIES_CONFIG.common) : null;

  // Стиль ауры редкости для выпадающей карточки
  const rarityGlowStyles = {
    mythic: 'shadow-[0_0_35px_rgba(244,114,182,0.4)] border-pink-500/50',
    legendary: 'shadow-[0_0_35px_rgba(251,191,36,0.35)] border-amber-400/50',
    epic: 'shadow-[0_0_30px_rgba(192,132,252,0.3)] border-purple-400/40',
    rare: 'shadow-[0_0_25px_rgba(56,189,248,0.3)] border-sky-400/40',
    uncommon: 'shadow-[0_0_20px_rgba(52,211,153,0.25)] border-emerald-400/40',
    common: 'border-white/10 shadow-lg'
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

      {/* 🎰 Блок рулетки / открытия с ультра-крутой поцифровой анимацией */}
      <div className="rounded-2xl border border-white/5 bg-[var(--tg-theme-secondary-bg-color,#1e293b)] p-5 text-center">
        <div className="text-xs font-medium text-[var(--tg-theme-hint-color,#94a3b8)] mb-1">
          {currentCaseConfig.name}
        </div>
        <p className="text-xs text-[var(--tg-theme-text-color,#f8fafc)]/80 mb-4 max-w-xs mx-auto">
          {currentCaseConfig.description}
        </p>

        {droppedPhone ? (
          /* 🏆 Торжественная карточка выбитого номера (Winner Presentation) */
          <div className="space-y-4 animate-in zoom-in-95 duration-300">
            {isFirstDiscovery && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500/20 to-amber-500/20 text-pink-300 border border-pink-500/40 text-xs font-bold animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                Первооткрыватель номера!
              </div>
            )}

            {/* Карточка номера с аурой редкости */}
            <div
              className={`p-4 rounded-2xl bg-[var(--tg-theme-bg-color,#0f172a)] border text-left transition-all ${
                rarityGlowStyles[droppedPhone.rarity] || 'border-white/10'
              }`}
            >
              {/* Верхняя строка: страна, серия, редкость */}
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{droppedMeta.flag}</span>
                  <span className="text-xs font-semibold text-slate-200">{droppedMeta.name}</span>
                  <span className="text-[10px] font-mono text-slate-500">#{droppedPhone.id}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${droppedRConfig.badgeClass}`}>
                    {droppedRConfig.name}
                  </span>
                  <span className="text-[10px] font-mono text-sky-300 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                    {droppedPhone.score} очков
                  </span>
                </div>
              </div>

              {/* Главный номер с кнопкой быстрого копирования */}
              <div className="flex items-center justify-between py-2 border-y border-white/5 my-2">
                <div className="font-number text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {droppedPhone.formatted_number}
                </div>
                <button
                  onClick={handleCopyNumber}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition active:scale-95"
                  title="Скопировать"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Нижняя строка: категория узора и базовая цена */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1 text-slate-300 font-medium">
                  <Tag className="w-3.5 h-3.5 text-sky-400" />
                  {droppedPhone.category}
                </span>
                <div className="font-number font-bold text-amber-300 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  {Number(droppedPhone.base_price || 0).toLocaleString()} Coins
                </div>
              </div>
            </div>

            {/* Действия после открытия: Открыть ещё, В коллекцию, Продать */}
            <div className="space-y-2 pt-1">
              {/* Кнопка "Открыть ещё" в 1 клик для максимального комфорта */}
              {canAfford && (
                <button
                  onClick={handleOpen}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold transition active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Открыть ещё ({currentCaseConfig.price.toLocaleString()} C)
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSellDirect}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-rose-400 border border-white/5 text-xs font-semibold transition active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  <Coins className="w-3.5 h-3.5" />
                  Продать (+{droppedPhone.base_price} C)
                </button>
                <button
                  onClick={() => setDroppedPhone(null)}
                  className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  В коллекцию
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 🎰 Интерактивный терминал сканирования частот и поцифровой скремблер */
          <div className="space-y-4">
            <div className="rounded-2xl bg-[var(--tg-theme-bg-color,#0f172a)] border border-white/5 p-4 flex flex-col items-center justify-center space-y-3 relative overflow-hidden">
              
              {/* Статус поиска сигнала */}
              <div className="flex items-center justify-between w-full text-[11px] text-[var(--tg-theme-hint-color,#94a3b8)]">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isOpening ? 'bg-sky-400 animate-ping' : 'bg-slate-600'}`} />
                  {isOpening ? 'СКАНИРОВАНИЕ ЧАСТОТ...' : 'ЧАСТОТА ГОТОВА'}
                </span>
                {isOpening && (
                  <span className="font-number font-bold text-amber-300 animate-pulse flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-400" />
                    +{rollingCoins} C
                  </span>
                )}
              </div>

              {/* 5 отдельных слотов номера (Reel Slots) */}
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 w-full py-2">
                {reelSlots.map((slotText, idx) => {
                  const isLocked = lockedFlags[idx];
                  return (
                    <div
                      key={idx}
                      className={`px-1.5 sm:px-2.5 py-2 rounded-xl border text-center transition-all duration-200 font-number font-bold tracking-tight text-sm sm:text-base ${
                        isLocked
                          ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.3)] animate-lock-pop'
                          : isOpening
                          ? 'bg-white/5 border-white/10 text-slate-400'
                          : 'bg-white/5 border-transparent text-slate-500'
                      }`}
                    >
                      {slotText}
                    </div>
                  );
                })}
              </div>

              {/* Индикатор стадий замка */}
              {isOpening ? (
                <div className="flex gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map((st) => (
                    <div
                      key={st}
                      className={`h-1 rounded-full transition-all duration-200 ${
                        revealStage >= st ? 'bg-sky-400 w-5' : 'bg-white/10 w-2'
                      }`}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-[var(--tg-theme-hint-color,#94a3b8)]">
                  Нажми кнопку для запуска случайного дропа
                </div>
              )}
            </div>

            {/* Кнопка выбивания кейса */}
            <button
              onClick={handleOpen}
              disabled={isOpening || !canAfford}
              className={`w-full py-3.5 px-5 rounded-xl font-bold text-sm transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg ${
                isOpening
                  ? 'bg-white/5 text-[var(--tg-theme-hint-color,#94a3b8)] cursor-not-allowed'
                  : canAfford
                  ? 'bg-[var(--tg-theme-button-color,#0284c7)] text-[var(--tg-theme-button-text-color,#ffffff)] hover:brightness-110'
                  : 'bg-white/5 text-[var(--tg-theme-hint-color,#94a3b8)] cursor-not-allowed opacity-60'
              }`}
            >
              {isOpening ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                  Подбираем узор номера...
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

      {/* Таблица шансов пула */}
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
