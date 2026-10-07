import { bx } from "@/lib/utils";

export interface FilterChip {
  id: string;
  label: string;
  /** Omit when the count is not cheaply available — never pass a guessed number. */
  count?: number;
}

export interface FilterChipsProps {
  chips: FilterChip[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
}

// Count filter chips (`All 77 · Unread 71 · New 16`) — replaces stat-card bands above lists.
// Plain toggle buttons (aria-pressed), one active at a time; clicking a chip filters the list.
export function FilterChips({ chips, activeId, onChange, ariaLabel, className }: FilterChipsProps) {
  return (
    <div role="group" aria-label={ariaLabel} className={bx("flex flex-wrap items-center gap-2", className)}>
      {chips.map((chip) => {
        const active = chip.id === activeId;
        return (
          <button
            key={chip.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(chip.id)}
            className={bx(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 bg-body-sm font-medium transition-colors",
              active
                ? "border-transparent bg-(--accent-soft) text-(--accent-soft-text)"
                : "border-(--border-default) bg-(--surface-card) text-(--text-secondary) hover:bg-(--surface-hover)"
            )}
          >
            {chip.label}
            {chip.count !== undefined && " "}
            {chip.count !== undefined && (
              <span className={bx("tabular-nums", active ? "text-(--accent-soft-text)" : "text-(--text-muted)")}>{chip.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
