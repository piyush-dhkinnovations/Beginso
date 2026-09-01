import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// beginso-ui.css's own component classes are all prefixed `.bg-*` (`.bg-btn`,
// `.bg-btn-primary`, `.bg-card`, ...) — a naming collision with Tailwind's
// `bg-*` background-color utilities. tailwind-merge pattern-matches on that
// prefix alone, so cn("bg-btn", "bg-btn-primary") silently drops every class
// but the last, treating them as competing background-color utilities
// instead of the design system's own, unrelated component/variant classes.
// Use this (plain clsx, no conflict resolution) to compose beginso-ui.css
// classes in components/ui/ primitives; reach for cn() only where every
// class involved is a real Tailwind utility.
export function bx(...inputs: ClassValue[]) {
  return clsx(inputs)
}
