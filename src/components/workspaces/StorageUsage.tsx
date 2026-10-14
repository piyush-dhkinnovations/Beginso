'use client';

import Link from 'next/link';
import { useAccountUsage } from '@/hooks/useAccountUsage';
import { formatStorage, storageLevel } from '@/lib/storageUsage';

const FILL = { ok: 'bg-(--primary)', warning: 'bg-(--warning)', full: 'bg-(--error)' } as const;

/** Sidebar usage bar: active vs Trash, out of the quota. Trash counts toward the total until it is emptied. */
export function StorageUsage() {
  const usage = useAccountUsage();
  if (usage?.storageUsedBytes === undefined || !usage.storageQuotaBytes) return null;

  const used = usage.storageUsedBytes;
  const quota = usage.storageQuotaBytes;
  const trash = Math.min(usage.storageTrashBytes ?? 0, used);
  const level = storageLevel(used, quota);
  const pct = (bytes: number) => `${Math.min(100, (bytes / quota) * 100)}%`;

  return (
    <div className="mb-3 px-1 text-xs text-(--text-muted)" data-testid="storage-usage">
      <div className="mb-1 flex justify-between">
        <span>Storage</span>
        <span className={level === 'full' ? 'text-(--error-text)' : level === 'warning' ? 'text-(--warning-text)' : undefined}>
          {formatStorage(used)} of {formatStorage(quota)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Storage used"
        aria-valuenow={Math.round((used / quota) * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="flex h-1.5 overflow-hidden rounded-full bg-(--surface-hover)"
      >
        <div className={FILL[level]} style={{ width: pct(used - trash) }} />
        <div className={`${FILL[level]} opacity-50`} style={{ width: pct(trash) }} />
      </div>
      <p className="mt-1">
        {formatStorage(used - trash)} active, {formatStorage(trash)} in Trash
        {level === 'full' && (
          <>
            {' · '}
            <Link href="/trash" className="underline">
              Free up space
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
