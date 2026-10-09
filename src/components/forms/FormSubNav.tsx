'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBuilderStore } from '@/store/builderStore';

export type FormSubNavKey = 'overview' | 'responses' | 'insights' | 'edit' | 'settings';

interface FormSubNavProps {
  formId: string;
  /** Workspace slug carried on every link so the next page resolves its scope without a fetch. */
  ws?: string | null;
  canEdit: boolean;
  active: FormSubNavKey;
}

/**
 * The form's horizontal sub-nav (Overview · Responses · Insights · Edit · Settings), shared by the
 * form header and the builder so moving between them reads as one page. Leaving the builder with
 * unsaved changes goes through the builder's leave modal instead of navigating straight away.
 */
export function FormSubNav({ formId, ws, canEdit, active }: FormSubNavProps) {
  const pathname = usePathname();
  const dirty = useBuilderStore((s) => s.dirty);
  const setPendingLeaveUrl = useBuilderStore((s) => s.setPendingLeaveUrl);

  const base = `/forms/${formId}`;
  const q = ws ? `ws=${encodeURIComponent(ws)}` : '';
  const href = (path: string, extra?: string) => {
    const parts = [extra, q].filter(Boolean).join('&');
    return `${base}${path}${parts ? `?${parts}` : ''}`;
  };
  const items: Array<{ key: FormSubNavKey; label: string; href: string }> = [
    { key: 'overview', label: 'Overview', href: href('/overview') },
    { key: 'responses', label: 'Responses', href: href('/inbox') },
    { key: 'insights', label: 'Insights', href: href('/insights') },
    ...(canEdit
      ? [
          { key: 'edit' as const, label: 'Edit', href: href('/edit') },
          { key: 'settings' as const, label: 'Settings', href: href('/edit', 'tab=settings') },
        ]
      : []),
  ];

  const inBuilder = /\/edit\/?$/.test(pathname);
  return (
    <nav aria-label="Form" className="bg-tabs">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.key === active ? 'page' : undefined}
          onClick={(e) => {
            // Edit/Settings are the builder itself: switching between them never leaves it.
            const leaves = !(inBuilder && (item.key === 'edit' || item.key === 'settings'));
            if (inBuilder && dirty && leaves) {
              e.preventDefault();
              setPendingLeaveUrl(item.href);
            }
          }}
          className="bg-tab aria-[current=page]:border-b-(--border-focus) aria-[current=page]:text-(--text-link)"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
