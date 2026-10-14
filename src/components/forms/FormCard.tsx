import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
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
  const share = maxResponses > 0 ? Math.max(4, (form.responseCount / maxResponses) * 100) : 4;
  return (
    <Card padded={false} className="flex-row items-stretch gap-4 overflow-hidden bg-none bg-(--surface-card) p-4">
      {/* The icon or logo owns the left edge, 48px whichever it is; the bar and footer sit beside it, not under it. */}
      <div className="flex flex-none items-center">
        <FormTile title={form.title} size={48} logoUrl={form.branding?.logoUrl} iconName={form.branding?.iconName} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h3 className="min-w-0 bg-body font-semibold text-(--text-primary)">
              <Link href={href} className="block truncate no-underline hover:underline">{form.title}</Link>
            </h3>
            <p className="line-clamp-1 bg-body-sm text-(--text-muted)">{form.description || 'No description'}</p>
          </div>
          <div className="-mr-1 -mt-1 flex flex-none items-center gap-1">{menu}</div>
        </div>
        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-(--bg-sunken)">
          <div className="h-full rounded-full bg-(--action-primary)" style={{ width: `${share}%` }} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusBadge variant={form.status}>{STATUS_LABEL[form.status]}</StatusBadge>
          <span className="bg-caption text-(--text-muted)">
            <strong className="bg-body-sm tabular-nums text-(--text-primary)">{form.responseCount}</strong>{' '}
            response{form.responseCount !== 1 ? 's' : ''} · {formatDate(form.updatedAt)}
          </span>
        </div>
      </div>
    </Card>
  );
}
