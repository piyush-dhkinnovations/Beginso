"use client";

import { useEffect, useRef } from "react";

// Shared by Modal and Drawer (src/components/ui/) — extracted from Modal's original
// implementation rather than each rolling its own (design.md §18, sprint-7-foundation).
// Traps Tab/Shift+Tab within containerRef, closes on Escape, locks body/main scroll while
// open, and restores focus to whatever triggered it on close.
export function useFocusTrap(
  isOpen: boolean,
  onClose: () => void,
  containerRef: React.RefObject<HTMLElement | null>
) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scrollContainer = document.querySelector<HTMLElement>("main");
    const previousBodyOverflow = document.body.style.overflow;
    const previousMainOverflow = scrollContainer?.style.overflow;
    document.body.style.overflow = "hidden";
    if (scrollContainer) scrollContainer.style.overflow = "hidden";

    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () =>
      Array.from(containerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);

    getFocusable()[0]?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = previousBodyOverflow;
      if (scrollContainer) scrollContainer.style.overflow = previousMainOverflow ?? "";
      opener?.focus();
    };
  }, [isOpen, containerRef]);
}
