'use client';

import { useHydrated } from '@/hooks/useHydrated';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Segmented';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useFormScope } from '@/hooks/useFormScope';
import { formsService } from '@/services/forms';
import { hasCapability } from '@/lib/roles';
import { FORM_HEADER_SLOT_ID } from '@/lib/formHeaderSlot';

const DATA_ROUTE_RE = /^\/forms\/[^/]+\/(inbox|insights)\/?$/;
const STATUS_LABEL = { draft: 'Draft', published: 'Published', closed: 'Closed' } as const;
const MODES = [
  { id: 'insights', label: 'Summary' },
  { id: 'inbox', label: 'Responses' },
];

/**
 * The header for a form's data pages (/forms/:id/inbox and /insights): breadcrumb back to Responses, the form's
 * name and status, and the Summary / Responses switch. The form's own pages (Overview, Edit, Settings) use
 * FormLevelHeader instead.
 */
export function FormDataHeader() {
  const { id: formId } = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const scope = useFormScope(formId);
  const ws = useSearchParams().get('ws') ?? (scope && scope !== 'personal' ? scope : null);
  const show = DATA_ROUTE_RE.test(pathname);

  const { data: cachedForm } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => formsService.getFormById(formId),
    enabled: show && !!formId,
  });

  // The title may already be in the query cache when the page loads, but the server could not know it: show the same "…" on both until
  // hydration is done, or React discards the server HTML ("Hydration failed").
  const hydrated = useHydrated();
  const form = hydrated ? cachedForm : undefined;

  if (!show) return null;

  const q = ws ? `?ws=${encodeURIComponent(ws)}` : '';
  const canEdit = !form?.myRole || hasCapability(form.myRole, 'forms:edit');
  const mode = pathname.replace(/\/$/, '').endsWith('/insights') ? 'insights' : 'inbox';

  return (
    <PageHeader
      breadcrumb={[{ label: 'Responses', href: ws ? `/w/${ws}/form-responses` : '/form-responses' }, { label: form?.title ?? '…' }]}
      title={form?.title ?? '…'}
      titleAddon={form ? <StatusBadge variant={form.status}>{STATUS_LABEL[form.status]}</StatusBadge> : undefined}
      actionsAlign="center"
      actions={
        <>
          <Segmented options={MODES} value={mode} onChange={(id) => router.push(`/forms/${formId}/${id}${q}`)} ariaLabel="Form data view" />
          {/* The page's own controls (Summary: Filters, Add chart) land here, so they share this row. `contents` makes them siblings of the buttons. */}
          <div id={FORM_HEADER_SLOT_ID} className="contents" />
          {canEdit && (
            <ButtonLink variant="secondary" href={`/forms/${formId}/edit${q}`}>
              <Pencil size={16} className="mr-1.5" aria-hidden="true" />
              Edit form
            </ButtonLink>
          )}
        </>
      }
    />
  );
}
