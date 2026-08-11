import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'success') => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ success: (m) => push(m, 'success'), error: (m) => push(m, 'error') }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2.5rem)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-fadeIn flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-floating ${
              t.type === 'error' ? 'bg-priority-highSoft border-priority-high/30 text-priority-high' : 'bg-status-doneSoft border-status-done/30 text-emerald-800'
            }`}
            role="status"
          >
            {t.type === 'error' ? <XCircle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
            <p className="text-sm font-medium leading-snug flex-1">{t.message}</p>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="opacity-60 hover:opacity-100">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
