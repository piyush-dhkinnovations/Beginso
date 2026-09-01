import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { bx } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "default" | "lg";
}

// beginso-ui.css classes — see src/styles/beginso-ui.css §14 OVERLAYS. Rendered via a portal
// (react-dom's createPortal) so it's never clipped by an ancestor's overflow: hidden — the
// previous implementation rendered inline. Focus trap shared with Drawer via useFocusTrap.
export function Modal({ isOpen, onClose, title, description, children, size = "default" }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isOpen, onClose, modalRef);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="presentation"
      className="bg-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={modalRef}
        className={bx("bg-modal", size === "lg" && "bg-modal-lg")}
      >
        <div className="bg-modal-head">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="bg-btn bg-btn-ghost bg-btn-icon"
          >
            <X size={18} className="bg-icon" />
          </button>
        </div>
        <div className="bg-modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
