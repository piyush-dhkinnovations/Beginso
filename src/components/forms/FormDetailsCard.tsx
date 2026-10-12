import type { ReactNode } from 'react';
import { CircleDot, CalendarDays, Clock, ListChecks, FileText, User, Pencil } from 'lucide-react';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatFormDate } from '@/components/forms/FormHeader';
import type { Form } from '@/types/form';

const STATUS_LABEL = { draft: 'Draft', published: 'Published', closed: 'Closed' } as const;

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-(--border-subtle) py-2.5 last:border-b-0">
      <span className="text-(--text-muted) [&_svg]:size-4.5" aria-hidden="true">{icon}</span>
      <dt className="bg-body-sm flex-1 text-(--text-secondary)">{label}</dt>
      <dd className="bg-body-sm m-0 min-w-0 truncate text-right font-medium text-(--text-primary)">{children}</dd>
    </div>
  );
}

export interface FormDetailsCardProps {
  form: Form;
  /** Name shown as "Created by": the form's owner, or the signed-in user for their own personal form. */
  createdBy?: string;
  /** Edit details opens the builder; omitted for roles that cannot edit. */
  editHref?: string;
}

// The overview's "Form details" card: read-only facts about the form, straight from the form document.
export function FormDetailsCard({ form, createdBy, editHref }: FormDetailsCardProps) {
  return (
    <section aria-labelledby="form-details-heading" className="flex flex-col gap-2 rounded-xl border border-(--border-default) bg-(--surface-card) p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="form-details-heading" className="bg-h4">Form details</h2>
        {editHref && (
          <ButtonLink variant="secondary" size="small" href={editHref}>
            <Pencil size={14} className="mr-1.5" aria-hidden="true" />
            Edit details
          </ButtonLink>
        )}
      </div>
      <dl className="m-0 flex flex-col">
        <Row icon={<CircleDot />} label="Status">
          <StatusBadge variant={form.status}>{STATUS_LABEL[form.status]}</StatusBadge>
        </Row>
        <Row icon={<User />} label="Created by">{createdBy || '—'}</Row>
        <Row icon={<CalendarDays />} label="Created on">{formatFormDate(form.createdAt) || '—'}</Row>
        <Row icon={<Clock />} label="Last updated">{formatFormDate(form.updatedAt) || '—'}</Row>
        <Row icon={<ListChecks />} label="Total questions">{form.fields?.length ?? 0}</Row>
        <Row icon={<FileText />} label="Pages">{form.pages?.length ?? 0}</Row>
      </dl>
    </section>
  );
}
