"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  variant: "success" | "error";
  action?: ToastAction;
  duration: number;
}

interface ToastContextValue {
  showToast: (options: Omit<Toast, "id" | "duration"> & { duration?: number }) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const showToast = useCallback((options: Omit<Toast, "id" | "duration"> & { duration?: number }) => {
    const id = crypto.randomUUID();
    const toast: Toast = { ...options, id, duration: options.duration ?? 5000 };
    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {mounted && createPortal(
        <div className="fixed bottom-4 end-4 z-[100] flex flex-col gap-2 max-w-sm">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const bg = toast.variant === "success" ? "bg-primary text-on-primary" : "bg-accent-red text-on-primary";

  return (
    <div className={`${bg} rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 transition-all duration-300`}>
      <span className="text-body-sm flex-1">{toast.message}</span>
      {toast.action && (
        <button onClick={toast.action.onClick} className="text-body-sm font-bold underline whitespace-nowrap">
          {toast.action.label}
        </button>
      )}
      <button onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
