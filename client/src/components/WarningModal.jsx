// client/src/components/WarningModal.jsx
import React from 'react';
import { ShieldAlert, Check } from 'lucide-react';
import { haptic } from '../haptic';

export default function WarningModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm bg-[var(--tg-theme-bg-color,#0f172a)] border border-amber-400/30 rounded-2xl p-5 shadow-xl text-[var(--tg-theme-text-color,#f8fafc)]">
        <div className="flex items-center gap-2.5 mb-3.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              Игровые телефонные номера
            </h2>
            <p className="text-[11px] text-[var(--tg-theme-hint-color,#94a3b8)]">Официальное предупреждение</p>
          </div>
        </div>

        <div className="space-y-2.5 text-xs leading-relaxed text-slate-300 bg-[var(--tg-theme-secondary-bg-color,#1e293b)] p-3.5 rounded-xl border border-white/5">
          <p>
            Все номера в <strong>Phone Drop</strong> предназначены исключительно для коллекционирования внутри игры.
          </p>
          <p className="text-amber-300 font-medium">
            ⚠️ Не звоните и не отправляйте сообщения на отображаемые номера.
          </p>
          <p>
            Некоторые цифровые комбинации могут случайно совпадать с номерами реальных абонентов. Игра не подтверждает, что номера никому не принадлежат.
          </p>
          <p className="text-[11px] text-[var(--tg-theme-hint-color,#94a3b8)]">
            Используйте номера исключительно как виртуальные игровые предметы. Уважайте конфиденциальность других людей.
          </p>
        </div>

        <button
          onClick={() => {
            haptic.notification('success');
            onClose();
          }}
          className="mt-4 w-full py-2.5 px-4 bg-[var(--tg-theme-button-color,#0284c7)] text-[var(--tg-theme-button-text-color,#ffffff)] font-medium text-xs rounded-xl transition active:scale-[0.98] flex items-center justify-center gap-1.5"
        >
          <Check className="w-4 h-4" />
          Понятно
        </button>
      </div>
    </div>
  );
}
