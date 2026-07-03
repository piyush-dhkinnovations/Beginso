"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
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
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
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
        {toast.type === "success" && (
          <svg
            className="w-5 h-5 text-success shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        {toast.type === "error" && (
          <svg
            className="w-5 h-5 text-error shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        {toast.type === "warning" && (
          <svg
            className="w-5 h-5 text-warning shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )}
        {toast.type === "info" && (
          <svg
            className="w-5 h-5 text-brand-500 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
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
