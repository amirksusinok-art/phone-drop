// client/src/components/WarningModal.jsx
import React from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function WarningModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#111726] border border-amber-500/40 rounded-2xl p-6 shadow-2xl text-slate-200">
        <div className="flex items-center gap-3 text-amber-400 mb-4">
          <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/30">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Игровые телефонные номера
            </h2>
            <p className="text-xs text-amber-400/80">Официальное предупреждение</p>
          </div>
        </div>

        <div className="space-y-3 text-sm leading-relaxed text-slate-300 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <p>
            Все номера в <strong>Phone Drop</strong> предназначены исключительно для коллекционирования внутри игры.
          </p>
          <p className="text-amber-200/90 font-medium">
            ⚠️ Не звоните и не отправляйте сообщения на отображаемые номера.
          </p>
          <p>
            Некоторые цифровые комбинации могут совпадать с номерами реальных людей. Игра не подтверждает, что отображаемые цифры никому не принадлежат.
          </p>
          <p className="text-xs text-slate-400">
            Используйте номера только как игровые предметы. Уважайте конфиденциальность других людей.
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl transition duration-200 shadow-lg shadow-amber-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          Понятно
        </button>
      </div>
    </div>
  );
}
