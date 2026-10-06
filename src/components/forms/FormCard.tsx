import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formVisual } from '@/lib/formVisual';
import { FormTile } from './FormTile';
import type { Form, FormStatus } from '@/types/form';

const STATUS_LABEL: Record<FormStatus, string> = { draft: 'Draft', published: 'Published', closed: 'Closed' };

export interface FormCardProps {
  form: Form;
  href: string;
  /** The row-actions menu (same items as the table's ⋮). */
  menu: ReactNode;
  /** Largest response count on the page — the card's bar is scaled against it. */
  maxResponses: number;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`; // "26 Sep 2026"
};

// Grid-view card: tinted icon tile (colour from the title), title + description, a response bar in
// the form's own colour, status and counts in the footer.
export function FormCard({ form, href, menu, maxResponses }: FormCardProps) {
  const visual = formVisual(form.title);
  const share = maxResponses > 0 ? Math.max(4, (form.responseCount / maxResponses) * 100) : 4;
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4">
        <FormTile title={form.title} />
        <div className="flex items-center gap-1">{menu}</div>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-4 pt-3">
        <h3 className="min-w-0 bg-body font-semibold text-(--text-primary)">
          <Link href={href} className="block truncate no-underline hover:underline">{form.title}</Link>
        </h3>
        <p className="bg-body-sm text-(--text-muted)">{form.description || 'No description'}</p>
      </div>
      <div className="px-4 pt-3" aria-hidden="true">
        <div className="h-1.5 overflow-hidden rounded-full bg-(--bg-sunken)">
          <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: visual.ink }} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-(--border-subtle) px-4 py-3">
        <StatusBadge variant={form.status}>{STATUS_LABEL[form.status]}</StatusBadge>
        <span className="bg-caption text-(--text-muted)">
          <strong className="bg-body-sm tabular-nums text-(--text-primary)">{form.responseCount}</strong>{' '}
          response{form.responseCount !== 1 ? 's' : ''} · {formatDate(form.updatedAt)}
        </span>
      </div>
    </Card>
  );
}
