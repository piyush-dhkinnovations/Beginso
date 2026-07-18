'use client';

// ─── Toggle Switch (no shadcn dep) ────────────────────────────────────────────

export interface SwitchProps {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function Switch({ id, checked, onChange }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
        checked ? 'bg-brand-600' : 'bg-neutral-300'
      }`}
    >
      <span
        className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
