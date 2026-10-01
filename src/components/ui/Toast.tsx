"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { bx } from "@/lib/utils";

// Sprint 12 (inbox-collaboration), task 2.1: an optional action slot for reversible mutations
// (bulk Undo, saved-view delete Undo). `label`/`onClick` only — never a raw JSX slot, so every
// toast stays a plain, accessible role="status" text region regardless of caller.
export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
  action?: ToastAction;
}

interface ToastContextType {
  /** Existing 3-argument callers (24+ sites) are unchanged — `action` is a new, optional 4th
   * argument. When an action is present and no explicit `duration` was passed, the toast stays
   * up at least 8s (requirements.md §11: "does not disappear before a screen-reader user can
   * act") rather than the normal 4s default. */
  toast: (
    message: string,
    type: "success" | "error" | "warning" | "info",
    duration?: number,
    action?: ToastAction
  ) => void;
}

const MIN_ACTION_DURATION = 8000;

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = (
    message: string,
    type: "success" | "error" | "warning" | "info",
    duration?: number,
    action?: ToastAction
  ) => {
    const id = crypto.randomUUID();
    const resolvedDuration = duration ?? (action ? MIN_ACTION_DURATION : 4000);
    setToasts((prev) => [...prev, { id, message, type, duration: resolvedDuration, action }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* beginso-ui.css classes — see src/styles/beginso-ui.css §13 FEEDBACK ("Toast").
          Migrated in place (sprint-7-foundation) rather than duplicated under
          components/ui/ — see that folder's Toast.ts for the re-export. */}
      <div role="status" aria-live="polite" className="bg-toast-region pointer-events-none">
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

// .bg-toast-{success,error} only exist for those two types (src/styles/beginso-ui.css §13) —
// warning/info aren't covered by the stylesheet, so their icon color is set inline, matching
// exactly what those two modifier classes do for the icon (nothing else differs between types).
const ICON_COLOR: Record<ToastMessage["type"], string | undefined> = {
  success: undefined,
  error: undefined,
  warning: "var(--warning)",
  info: "var(--info)",
};

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const Icon = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info }[toast.type];

  return (
    <div
      className={bx(
        "bg-toast pointer-events-auto",
        toast.type === "success" && "bg-toast-success",
        toast.type === "error" && "bg-toast-error"
      )}
    >
      <Icon className="bg-icon" style={{ color: ICON_COLOR[toast.type] }} />
      <div className="bg-toast-body">
        {/* .bg-toast-body's <strong> is the prominent/primary-color slot; this system has one
            combined message with no separate title, so the whole message goes there rather
            than in <span> (muted/secondary — wrong weight for a toast's only content). */}
        <strong>{toast.message}</strong>
      </div>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onClose();
          }}
          className="bg-btn bg-btn-ghost bg-btn-sm"
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" onClick={onClose} className="bg-btn bg-btn-ghost bg-btn-icon bg-btn-sm">
        <span className="bg-sr-only">Close</span>
        <svg className="bg-icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
