// src/components/Toast.jsx
import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-slideUp">
      <div
        className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 backdrop-blur-md ${
          isSuccess
            ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
            : isError
            ? 'bg-rose-50/95 border-rose-200 text-rose-900'
            : 'bg-indigo-50/95 border-indigo-200 text-indigo-900'
        }`}
      >
        <div className="mt-0.5 shrink-0">
          {isSuccess && <CheckCircle2 size={18} className="text-emerald-600" />}
          {isError && <AlertCircle size={18} className="text-rose-600" />}
          {!isSuccess && !isError && <Info size={18} className="text-indigo-600" />}
        </div>
        <div className="flex-1 text-xs">
          {toast.title && <div className="font-bold mb-0.5">{toast.title}</div>}
          <div className="leading-relaxed opacity-90">{toast.message}</div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-black/5 opacity-60 hover:opacity-100 transition"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
