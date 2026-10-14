import type { ReactNode } from 'react';
import { Card } from './Card';
import { Skeleton } from './Skeleton';
import { bx } from '@/lib/utils';

// Page-shaped loading states. Each one mirrors the layout of the screen it stands in for (same grid, same card sizes), and the
// route-level loading.tsx of a page uses the SAME component as the page's own loading branch, so there is exactly one skeleton
// from the first paint to the real content, never a generic one that is swapped for a different one.

/** Marks a skeleton region for assistive tech: one polite "Loading…" instead of a pile of silent grey boxes. */
export function SkeletonRegion({ label = 'Loading…', className, children }: { label?: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" aria-label={label} className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** The page title block: optional eyebrow, a title, an optional description line and an optional action button. */
export function PageHeaderSkeleton({ eyebrow, description, action }: { eyebrow?: boolean; description?: boolean; action?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        {eyebrow && <Skeleton variant="text" width={96} height={12} />}
        <Skeleton variant="title" width={180} height={28} />
        {description && <Skeleton variant="text" width={320} height={14} />}
      </div>
      {action && <Skeleton variant="block" width={132} height={40} className="block rounded-lg" />}
    </div>
  );
}

/** Same footprint as a KpiCard: outlined card, icon square, label, big number, a small line. */
export function KpiCardSkeleton() {
  return (
    <div className="flex h-full min-h-34 min-w-0 flex-col justify-between gap-4 rounded-xl border border-(--border-default) bg-(--surface-card) p-5">
      <div className="flex items-center justify-between gap-3">
        <Skeleton variant="text" width="45%" height={14} />
        <Skeleton variant="block" width={32} height={32} className="block rounded-lg" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton variant="title" width="40%" height={30} />
        <Skeleton variant="text" width="60%" height={12} />
      </div>
    </div>
  );
}

/** A titled chart card with a plot area, the same height as a two-row chart widget. */
export function ChartCardSkeleton() {
  return (
    <Card className="flex h-full flex-col gap-4">
      <Skeleton variant="text" width="35%" height={16} />
      <Skeleton variant="block" width="100%" className="block min-h-40 flex-1 rounded-lg" />
    </Card>
  );
}

// The dashboard's own 12-column grid (DashboardGrid), so the skeleton cards land where the real widgets will.
const GRID = 'grid auto-rows-[minmax(8.5rem,auto)] grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12';

/** The widget grid before its layout is known: a row of KPI cards, then two chart cards. */
export function DashboardGridSkeleton({ kpis = 4, charts = 2 }: { kpis?: number; charts?: number }) {
  return (
    <div className={GRID} aria-hidden="true">
      {Array.from({ length: kpis }).map((_, i) => (
        <div key={`k${i}`} className="min-w-0 md:col-span-3 xl:col-span-3">
          <KpiCardSkeleton />
        </div>
      ))}
      {Array.from({ length: charts }).map((_, i) => (
        <div key={`c${i}`} className="row-span-2 min-w-0 md:col-span-6 xl:col-span-6">
          <ChartCardSkeleton />
        </div>
      ))}
    </div>
  );
}

/** A "Your forms"-style list card: a heading above rows of an icon, two text lines and a small status. */
export function ListCardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <Skeleton variant="title" width={110} height={20} />
      <Card padded={false} className="divide-y divide-(--border-subtle) overflow-hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton variant="block" width={28} height={28} className="block flex-none rounded-lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton variant="text" width="55%" height={14} />
              <Skeleton variant="text" width="30%" height={11} />
            </div>
            <Skeleton variant="block" width={56} height={20} className="block flex-none rounded-full" />
          </div>
        ))}
      </Card>
    </div>
  );
}

/** Everything under the Home page header: widget grid, then the forms list beside a smaller side card. */
export function HomeBodySkeleton() {
  return (
    <SkeletonRegion label="Loading your home" className="flex flex-col gap-6">
      <DashboardGridSkeleton />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" aria-hidden="true">
        <ListCardSkeleton rows={5} />
        <ListCardSkeleton rows={3} />
      </div>
    </SkeletonRegion>
  );
}

/** A grid of cards, each optionally with a media area on top (templates) or just a title and a line (workspaces, shared forms). */
export function CardGridSkeleton({ count = 6, media = false, columns = 3, label, className }: { count?: number; media?: boolean; columns?: 2 | 3; label?: string; className?: string }) {
  return (
    <SkeletonRegion label={label} className={bx('grid grid-cols-1 gap-4', columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-(--border-default) bg-(--surface-card)" aria-hidden="true">
          {media && <Skeleton variant="block" width="100%" height={128} className="block rounded-none" />}
          <div className="flex flex-col gap-3 p-4">
            <Skeleton variant="title" width="55%" height={20} />
            <Skeleton variant="text" width="100%" height={12} />
            <Skeleton variant="text" width="70%" height={12} />
            {media && <Skeleton variant="block" width="100%" height={36} className="block rounded-lg" />}
          </div>
        </div>
      ))}
    </SkeletonRegion>
  );
}

/** A filter/search row above a list: a few chips on the left, a search box on the right. */
export function ToolbarSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3" aria-hidden="true">
      <div className="flex gap-2">
        <Skeleton variant="block" width={88} height={36} className="block rounded-full" />
        <Skeleton variant="block" width={120} height={36} className="block rounded-full" />
        <Skeleton variant="block" width={120} height={36} className="block rounded-full" />
      </div>
      <Skeleton variant="block" width={288} height={40} className="block max-w-full rounded-lg" />
    </div>
  );
}

/** A table: a header strip then rows of an icon + two text lines and a few short cells. */
export function TableBlockSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-(--border-default) bg-(--surface-card)" aria-hidden="true">
      <div className="flex items-center gap-6 border-b border-(--border-default) bg-(--bg-subtle) px-5 py-3">
        <Skeleton variant="text" width={90} height={11} />
        <Skeleton variant="text" width={60} height={11} className="ml-auto" />
        <Skeleton variant="text" width={70} height={11} />
        <Skeleton variant="text" width={80} height={11} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 border-b border-(--border-subtle) px-5 py-3 last:border-b-0">
          <Skeleton variant="block" width={36} height={36} className="block flex-none rounded-lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton variant="text" width="40%" height={14} />
            <Skeleton variant="text" width="22%" height={11} />
          </div>
          <Skeleton variant="block" width={72} height={22} className="block rounded-full" />
          <Skeleton variant="text" width={40} height={14} />
          <Skeleton variant="text" width={110} height={14} />
        </div>
      ))}
    </div>
  );
}

/** A list page body: filter row, then a table. */
export function ListBodySkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <SkeletonRegion className="flex flex-col gap-4">
      <ToolbarSkeleton />
      <TableBlockSkeleton rows={rows} />
    </SkeletonRegion>
  );
}

/** Settings: the section list on the left and a short form (avatar, then fields) on the right. */
export function SettingsBodySkeleton() {
  return (
    <SkeletonRegion label="Loading settings" className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-10">
      <div className="flex gap-2 lg:w-60 lg:flex-none lg:flex-col lg:gap-1" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="block" width="100%" height={36} className="block rounded-lg" />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-5 lg:max-w-160" aria-hidden="true">
        <Skeleton variant="circle" width={64} height={64} />
        <Skeleton variant="block" width="100%" height={44} className="block rounded-lg" />
        <Skeleton variant="block" width="100%" height={44} className="block rounded-lg" />
        <Skeleton variant="block" width={120} height={40} className="block rounded-lg" />
      </div>
    </SkeletonRegion>
  );
}
