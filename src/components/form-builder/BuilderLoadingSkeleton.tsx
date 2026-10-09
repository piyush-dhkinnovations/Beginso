// Mirrors the loaded builder page: header (icon, title, actions), tab bar, then the framed panel.
export function BuilderLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse" aria-busy="true" aria-label="Loading form">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-9 rounded-lg bg-(--border-default)" />
          <div className="size-12 rounded-2xl bg-(--border-default)" />
          <div className="flex flex-col gap-2">
            <div className="h-6 w-48 rounded bg-(--border-default)" />
            <div className="h-3 w-64 rounded bg-(--border-default)" />
          </div>
        </div>
        <div className="h-10 w-48 rounded-xl bg-(--border-default)" />
      </div>
      <div className="h-10 w-full max-w-lg rounded bg-(--border-default)" />
      <div className="flex h-[calc(100dvh-19rem)] min-h-136 gap-4 rounded-2xl border border-(--border-default) bg-(--bg-subtle) p-4">
        <div className="w-64 rounded-xl border border-(--border-default) bg-(--surface-card)" />
        <div className="flex-1 rounded-xl border border-(--border-default) bg-(--surface-card)" />
        <div className="hidden w-72 rounded-xl border border-(--border-default) bg-(--surface-card) lg:block" />
      </div>
    </div>
  );
}
