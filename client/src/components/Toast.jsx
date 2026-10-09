// client/src/components/Toast.jsx
import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm transition-all duration-200 animate-in fade-in slide-in-from-top-2">
      <div
        onClick={onClose}
        className="cursor-pointer flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#1f2937]/95 text-white shadow-lg backdrop-blur-md text-xs font-medium"
      >
        {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 stroke-[2]" />}
        {isError && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 stroke-[2]" />}
        {!isSuccess && !isError && <Info className="w-4 h-4 text-sky-400 shrink-0 stroke-[2]" />}
        <span className="flex-1 text-slate-100">{toast.message}</span>
      </div>
    </div>
  );
}
