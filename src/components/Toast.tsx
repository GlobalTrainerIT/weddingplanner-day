import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, Trash2, X, AlertCircle, RotateCcw } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'deleted';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  onUndo?: () => void;
  actions?: ToastAction[];
  duration?: number;
}

type ToastListener = (message: string, type: ToastType, onUndo?: () => void, actions?: ToastAction[], duration?: number) => void;
const listeners: ToastListener[] = [];

export function showToast(message: string, type: ToastType = 'success', onUndo?: () => void, actions?: ToastAction[], duration?: number) {
  listeners.forEach(l => l(message, type, onUndo, actions, duration));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const addToast = useCallback((message: string, type: ToastType, onUndo?: () => void, actions?: ToastAction[], duration?: number) => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, message, type, onUndo, actions }]);
    const ms = duration ?? (onUndo || actions?.length ? 7000 : 3000);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, ms);
  }, []);

  useEffect(() => {
    listeners.push(addToast);
    return () => {
      const idx = listeners.indexOf(addToast);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto min-w-[220px] max-w-sm ${
            t.type === 'success' ? 'bg-emerald-600 text-white' :
            t.type === 'deleted' ? 'bg-[#2a1f15] text-white' :
            'bg-rose-600 text-white'
          }`}
        >
          {t.type === 'success' && <CheckCircle size={16} className="flex-shrink-0" />}
          {t.type === 'deleted' && <Trash2 size={16} className="flex-shrink-0" />}
          {t.type === 'error' && <AlertCircle size={16} className="flex-shrink-0" />}
          <span className="flex-1">{t.message}</span>
          {t.onUndo && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                t.onUndo!();
                setToasts(prev => prev.filter(t2 => t2.id !== t.id));
              }}
              className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
            >
              <RotateCcw size={11} /> Undo
            </button>
          )}
          {t.actions?.map(action => (
            <button
              key={action.label}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
                setToasts(prev => prev.filter(t2 => t2.id !== t.id));
              }}
              className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
            >
              {action.label}
            </button>
          ))}
          <button
            aria-label="Dismiss notification"
            onClick={(e) => { e.stopPropagation(); setToasts(prev => prev.filter(t2 => t2.id !== t.id)); }}
            className="opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
