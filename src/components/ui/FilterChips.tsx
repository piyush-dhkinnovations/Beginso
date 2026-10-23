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
  /** `tabs` draws underlined tabs that sit on a rule the caller draws; default is pills. */
  variant?: "pills" | "tabs";
}

// Count filter chips (`All 77 · Unread 71 · New 16`) — replaces stat-card bands above lists.
// Plain toggle buttons (aria-pressed), one active at a time; clicking a chip filters the list.
export function FilterChips({ chips, activeId, onChange, ariaLabel, className, variant = "pills" }: FilterChipsProps) {
  const tabs = variant === "tabs";
  return (
    <div role="group" aria-label={ariaLabel} className={bx("flex flex-wrap items-center", tabs ? "gap-1" : "gap-2", className)}>
      {chips.map((chip) => {
        const active = chip.id === activeId;
        return (
          <button
            key={chip.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(chip.id)}
            className={bx(
              "inline-flex items-center gap-1.5 bg-body-sm font-medium transition-colors",
              tabs
                ? bx(
                    "-mb-px h-10 border-b-2 px-3",
                    active
                      ? "border-(--action-primary) text-(--action-primary)"
                      : "border-transparent text-(--text-secondary) hover:border-(--border-default) hover:text-(--text-primary)"
                  )
                : bx(
                    "h-8 rounded-full border px-3",
                    active
                      ? "border-transparent bg-(--accent-soft) text-(--accent-soft-text)"
                      : "border-(--border-default) bg-(--surface-card) text-(--text-secondary) hover:bg-(--surface-hover)"
                  )
            )}
          >
            {chip.label}
            {chip.count !== undefined && " "}
            {chip.count !== undefined && (
              <span className={bx("tabular-nums", active ? (tabs ? "text-(--action-primary)" : "text-(--accent-soft-text)") : "text-(--text-muted)")}>{chip.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
