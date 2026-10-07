
// Small abstract mark for the Exports page, built from system shapes only: a field outline, a rule and bars.
// Replaces the stock "empty-reports" illustration, which appeared twice on the same screen. Decorative.
export function ExportMark({ className = "bg-icon" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <path d="M7 7.5h6" />
      <path d="M7.5 17v-4M12 17v-6M16.5 17v-2.5" />
    </svg>
  );
}
