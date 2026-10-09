// client/src/views/DropView.jsx
import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Coins, Flame, Award, Globe, Shield, RefreshCw, Check, ArrowRight } from 'lucide-react';
import { api } from '../api';
import PhoneCard, { RARITY_STYLES } from '../components/PhoneCard';

const COUNTRIES_LIST = [
  { key: 'RU', name: 'Россия', flag: '🇷🇺' },
  { key: 'UA', name: 'Украина', flag: '🇺🇦' },
  { key: 'US', name: 'США (NANPA 555)', flag: '🇺🇸' },
  { key: 'TR', name: 'Турция', flag: '🇹🇷' },
  { key: 'CN', name: 'Китай', flag: '🇨🇳' }
];

export default function DropView({ user, onUpdateUser, onEquipPhone, onOpenDetails }) {
  const [casesInfo, setCasesInfo] = useState(null);
  const [selectedCase, setSelectedCase] = useState('common');
  const [selectedCountry, setSelectedCountry] = useState('RU');
  const [isOpening, setIsOpening] = useState(false);
  const [droppedPhone, setDroppedPhone] = useState(null);
  const [isFirstDiscovery, setIsFirstDiscovery] = useState(false);
  const [shufflingDigits, setShufflingDigits] = useState('+7 (9XX) XXX-XX-XX');
  const [errorMsg, setErrorMsg] = useState('');

  const loadCases = () => {
    api.getCasesInfo()
      .then(res => setCasesInfo(res))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    loadCases();
  }, []);

  const handleOpen = async () => {
    setErrorMsg('');
    setDroppedPhone(null);
    setIsOpening(true);

    // Анимация быстрой смены цифр (рулетка)
    const interval = setInterval(() => {
      const chars = '0123456789';
      let rand = '+? (';
      for (let i = 0; i < 3; i++) rand += chars[Math.floor(Math.random() * chars.length)];
      rand += ') ';
      for (let i = 0; i < 3; i++) rand += chars[Math.floor(Math.random() * chars.length)];
      rand += '-';
      for (let i = 0; i < 2; i++) rand += chars[Math.floor(Math.random() * chars.length)];
      rand += '-';
      for (let i = 0; i < 2; i++) rand += chars[Math.floor(Math.random() * chars.length)];
      setShufflingDigits(rand);
    }, 60);

    const countryParam = selectedCase === 'national' ? selectedCountry : null;
    const opKey = `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const res = await api.openCase(selectedCase, countryParam, opKey);

      // Задержка анимации 1.1с для драматического эффекта открытия
      setTimeout(() => {
        clearInterval(interval);
        setIsOpening(false);
        setDroppedPhone(res.phone);
        setIsFirstDiscovery(res.isFirstDiscovery);
        onUpdateUser();
        loadCases();

        // Запуск праздничного конфетти для редких предметов!
        if (['rare', 'epic', 'legendary', 'mythic'].includes(res.phone.rarity)) {
          confetti({
            particleCount: res.phone.rarity === 'mythic' ? 150 : 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      }, 1100);
    } catch (err) {
      clearInterval(interval);
      setIsOpening(false);
      setErrorMsg(err.message || 'Ошибка открытия кейса');
    }
  };

  const handleSellDirect = async () => {
    if (!droppedPhone) return;
    try {
      await api.sellSystem(droppedPhone.id);
      setDroppedPhone(null);
      onUpdateUser();
      loadCases();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const currentCaseConfig = casesInfo?.cases?.[selectedCase] || { price: 100 };
  const canAfford = Number(user?.coins || 0) >= currentCaseConfig.price;

  return (
    <div className="space-y-6 pb-24 max-w-md mx-auto px-4">
      
      {/* Селектор кейсов */}
      <div className="grid grid-cols-3 gap-2">
        {casesInfo?.cases && Object.values(casesInfo.cases).map((c) => {
          const isSel = selectedCase === c.id;
          return (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCase(c.id);
                setDroppedPhone(null);
                setErrorMsg('');
              }}
              className={`p-3 rounded-2xl border text-center transition duration-200 active:scale-95 ${
                isSel
                  ? 'bg-gradient-to-b from-indigo-950/80 to-slate-900 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="text-2xl mb-1">{c.icon}</div>
              <div className={`text-xs font-bold truncate ${isSel ? 'text-white' : 'text-slate-300'}`}>
                {c.name.replace(' кейс', '')}
              </div>
              <div className="text-[11px] font-mono font-bold text-amber-300 flex items-center justify-center gap-0.5 mt-1">
                <Coins className="w-3 h-3 text-amber-400" />
                {c.price.toLocaleString()}
              </div>
            </button>
          );
        })}
      </div>

      {/* Если выбран национальный кейс — выбор страны */}
      {selectedCase === 'national' && (
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 animate-fade-in">
          <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            Выберите страну выбивания:
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {COUNTRIES_LIST.map((cty) => (
              <button
                key={cty.key}
                onClick={() => setSelectedCountry(cty.key)}
                className={`py-2 px-1 rounded-xl border text-center transition ${
                  selectedCountry === cty.key
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-lg">{cty.flag}</div>
                <div className="text-[10px] truncate mt-0.5">{cty.key}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Главный блок рулетки / открытия */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-700/80 bg-gradient-to-b from-[#111726] to-[#0b0f1d] p-6 shadow-2xl text-center">
        
        {/* Фоновые неоновые круги */}
        <div className="absolute -top-16 -left-16 w-36 h-36 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative z-10">
          <div className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
            {currentCaseConfig.name}
          </div>
          <p className="text-xs text-slate-400 mb-6 max-w-xs mx-auto">
            {currentCaseConfig.description}
          </p>

          {/* Барабан цифр или Выпавший номер */}
          {droppedPhone ? (
            <div className="animate-drop-reveal my-4">
              {isFirstDiscovery && (
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 text-xs font-bold mb-3 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  ПЕРВАЯ НАХОДКА В ИСТОРИИ!
                </div>
              )}
              <PhoneCard
                phone={droppedPhone}
                onClick={() => onOpenDetails(droppedPhone.id)}
              />

              {/* Кнопки действий после открытия */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  onClick={handleSellDirect}
                  className="py-3 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1"
                >
                  <Coins className="w-3.5 h-3.5" />
                  Продать (+{droppedPhone.base_price} C)
                </button>
                <button
                  onClick={() => setDroppedPhone(null)}
                  className="py-3 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1 shadow-lg shadow-cyan-500/20"
                >
                  <Check className="w-4 h-4" />
                  В коллекцию
                </button>
              </div>
            </div>
          ) : (
            <div className="py-6">
              {/* Поле барабана рулетки */}
              <div className="h-20 flex items-center justify-center rounded-2xl bg-slate-950/80 border border-slate-800 shadow-inner px-4">
                <span className={`font-mono-numbers text-xl sm:text-2xl font-black tracking-tight ${
                  isOpening ? 'text-cyan-400 animate-pulse' : 'text-slate-300'
                }`}>
                  {isOpening ? shufflingDigits : '• • • • • • • • • •'}
                </span>
              </div>

              {errorMsg && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                  {errorMsg}
                </div>
              )}

              {/* Кнопка выбивания */}
              <button
                onClick={handleOpen}
                disabled={isOpening || !canAfford}
                className={`mt-6 w-full py-4 px-6 rounded-2xl font-extrabold text-sm sm:text-base tracking-wide transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 shadow-xl ${
                  isOpening
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : canAfford
                    ? 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:opacity-95 text-white shadow-indigo-500/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isOpening ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                    Выбиваем номер...
                  </>
                ) : (
                  <>
                    <Flame className="w-5 h-5 text-amber-300" />
                    ВЫБИТЬ НОМЕР ({currentCaseConfig.price.toLocaleString()} C)
                  </>
                )}
              </button>

              {!canAfford && (
                <div className="text-[11px] text-amber-400 mt-2 font-medium">
                  Недостаточно Coins! Продайте лишние номера или торгуйте на рынке.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Прозрачная таблица актуальных шансов пула */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            Шансы выпадения (Свободный пул: {casesInfo?.totalAvailable?.toLocaleString() || '...'})
          </span>
          <span className="text-[10px] text-slate-500">Серия 2026</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          {casesInfo?.chances && Object.entries(casesInfo.chances).map(([rarityKey, chance]) => {
            const rStyle = RARITY_STYLES[rarityKey] || RARITY_STYLES.common;
            return (
              <div
                key={rarityKey}
                className={`p-2 rounded-xl bg-slate-950/60 border ${rStyle.border} flex flex-col justify-between`}
              >
                <span className={`text-[11px] font-bold ${rStyle.textColor}`}>{rStyle.name}</span>
                <span className="font-mono text-xs font-bold text-white mt-1">
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
