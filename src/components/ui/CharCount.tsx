import { bx } from "@/lib/utils";

/** "12/100" under a limited field. Turns to a warning near the limit so the stop does not come as a surprise. */
export function CharCount({ id, length, max }: { id: string; length: number; max: number }) {
  return (
    <p
      id={id}
      className={bx("text-right bg-caption tabular-nums", length >= max ? "text-(--danger-text)" : length >= max * 0.9 ? "text-(--warning-text)" : "text-(--text-muted)")}
    >
      {length}/{max}
    </p>
  );
}
