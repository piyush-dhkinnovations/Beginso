interface FormProgressProps {
  currentPage: number; // 1-based
  totalPages: number;
}

/** Multi-page progress bar. Renders nothing for single-page forms. */
export function FormProgress({ currentPage, totalPages }: FormProgressProps) {
  if (totalPages <= 1) return null;

  const percent = Math.round((currentPage / totalPages) * 100);

  return (
    <div className="mb-4">
      <div className="flex justify-between text-caption text-neutral-500 mb-1">
        <span>Step {currentPage} of {totalPages}</span>
        <span>{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-brand-600 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
