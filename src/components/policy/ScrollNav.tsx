"use client";

import { ChevronUp, ChevronDown } from "lucide-react";

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function scrollToBottom() {
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
}

export function ScrollNav() {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2">
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Scroll to top"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-(--action-primary) text-(--text-on-brand) shadow-(--shadow-md) transition-colors hover:bg-(--action-primary-hover)"
      >
        <ChevronUp size={18} />
      </button>
      <button
        type="button"
        onClick={scrollToBottom}
        aria-label="Scroll to bottom"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-(--action-primary) text-(--text-on-brand) shadow-(--shadow-md) transition-colors hover:bg-(--action-primary-hover)"
      >
        <ChevronDown size={18} />
      </button>
    </div>
  );
}
