"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type: "success" | "error" | "warning" | "info", duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = (message: string, type: "success" | "error" | "warning" | "info", duration = 4000) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  return (
    <div
      className={cn(
        "pointer-events-auto w-full flex items-center justify-between p-4 rounded-md shadow-lg border bg-white animate-fade-in transition-all duration-300",
        toast.type === "success" && "border-l-4 border-success border-neutral-200 text-neutral-900",
        toast.type === "error" && "border-l-4 border-error border-neutral-200 text-neutral-900",
        toast.type === "warning" && "border-l-4 border-warning border-neutral-200 text-neutral-900",
        toast.type === "info" && "border-l-4 border-brand-500 border-neutral-200 text-neutral-900"
      )}
    >
      <div className="flex items-center gap-2">
        {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-success shrink-0" />}
        {toast.type === "error" && <XCircle className="w-5 h-5 text-error shrink-0" />}
        {toast.type === "warning" && <AlertTriangle className="w-5 h-5 text-warning shrink-0" />}
        {toast.type === "info" && <Info className="w-5 h-5 text-brand-500 shrink-0" />}
        <span className="text-body font-medium">{toast.message}</span>
      </div>
      <button
        onClick={onClose}
        className="text-neutral-400 hover:text-neutral-600 transition-colors ml-4 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
      >
        <span className="sr-only">Close</span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
