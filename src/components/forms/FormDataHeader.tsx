'use client';

import { useHydrated } from '@/hooks/useHydrated';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Pencil } from 'lucide-react';
import { ButtonLink } from '@/components/ui/ButtonLink';
import Link from 'next/link';
import { FormModeSwitch } from './FormModeSwitch';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useFormScope } from '@/hooks/useFormScope';
import { formsService } from '@/services/forms';
import { hasCapability } from '@/lib/roles';
import { FORM_HEADER_END_SLOT_ID, FORM_HEADER_SLOT_ID, FORM_SUBHEADER_SLOT_ID } from '@/lib/formHeaderSlot';

const DATA_ROUTE_RE = /^\/forms\/[^/]+\/(inbox|insights)\/?$/;
const STATUS_LABEL = { draft: 'Draft', published: 'Published', closed: 'Closed' } as const;

/**
 * The header for a form's data pages (/forms/:id/inbox and /insights): breadcrumb back to Responses, the form's
 * name and status, the form's own actions, and under them the Insights / Responses switch with room for the page's own controls
 * (see lib/formHeaderSlot.ts). The form's own pages (Overview, Edit, Settings) use FormLevelHeader instead.
 */
export function FormDataHeader() {
  const { id: formId } = useParams<{ id: string }>();
  const pathname = usePathname();
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

  return (
    <header className="flex flex-col gap-3">
      {/* Row 1: where you are, and the form's own actions. `contents` makes the slots siblings of the buttons beside them. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 bg-body-sm text-(--text-muted)">
            <Link href={ws ? `/w/${ws}/form-responses` : '/form-responses'} className="hover:text-(--text-primary) hover:underline">
              Responses
            </Link>
            <ChevronRight size={12} aria-hidden="true" />
            <h1 aria-current="page" className="min-w-0 truncate bg-body-lg font-semibold text-(--text-primary)">
              {form?.title ?? '…'}
            </h1>
          </nav>
          {form && <StatusBadge variant={form.status}>{STATUS_LABEL[form.status]}</StatusBadge>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div id={FORM_HEADER_SLOT_ID} className="contents" />
          {canEdit && (
            // Reads "Edit"; its name stays "Edit form" for a screen reader (the name contains the visible word).
            <ButtonLink variant="secondary" size="small" aria-label="Edit form" href={`/forms/${formId}/edit${q}`}>
              <Pencil size={14} className="mr-1.5" aria-hidden="true" />
              Edit
            </ButtonLink>
          )}
          <div id={FORM_HEADER_END_SLOT_ID} className="contents" />
        </div>
      </div>

      {/* Row 2: which page of the form, and that page's own controls. */}
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <FormModeSwitch formId={formId} ws={ws} />
        <div id={FORM_SUBHEADER_SLOT_ID} className="flex min-w-0 flex-1 basis-72 flex-wrap items-center gap-3 empty:hidden" />
      </div>
    </header>
  );
}
