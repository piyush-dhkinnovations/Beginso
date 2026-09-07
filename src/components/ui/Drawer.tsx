"use client";

import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

// beginso-ui.css classes — see src/styles/beginso-ui.css §14 OVERLAYS ("Drawer"). .bg-drawer
// self-positions (fixed, right:0) rather than relying on .bg-scrim's flex-centering the way
// .bg-modal does, so the backdrop is a plain sibling, not a wrapping parent. Focus trap shared
// with Modal via useFocusTrap; rendered via a portal for the same clipping reason.
export function Drawer({ isOpen, onClose, title, description, children }: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isOpen, onClose, drawerRef);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div role="presentation" className="bg-scrim" style={{ padding: 0 }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        ref={drawerRef}
        className="bg-drawer"
      >
        <div className="bg-modal-head">
          <div>
            <h2 id="drawer-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="bg-btn bg-btn-ghost bg-btn-icon"
          >
            <X size={18} className="bg-icon" />
          </button>
        </div>
        <div className="bg-modal-body" style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}
