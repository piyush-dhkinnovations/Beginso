'use client';

import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormSubNav } from '@/components/forms/FormSubNav';
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/Breadcrumb';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useFormScope } from '@/hooks/useFormScope';
import { formsService } from '@/services/forms';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import { hasCapability } from '@/lib/roles';

const STATUS_LABEL = { draft: 'Draft', published: 'Published', closed: 'Closed' } as const;

// Pages under /forms/:id that get the form header. The builder (/edit) is a full-bleed canvas with
// its own chrome and the preview is a full-viewport overlay, so neither shows it.
const HEADER_ROUTE_RE = /^\/forms\/[^/]+\/(overview|inbox|insights|scores)\/?$/;

/**
 * The form-level navigation spine: `Workspace › Forms › <Form>` breadcrumb, the form's name and
 * status, and a horizontal sub-nav (Overview · Responses · Insights · Edit · Settings). It sits under
 * the workspace/personal sidebar, which stays mounted - the form's own nav never replaces it.
 * Edit and Settings are shown only to roles that can edit (presentation only; the server enforces).
 */
export function FormLevelHeader() {
  const { id: formId } = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const show = HEADER_ROUTE_RE.test(pathname);
  const scope = useFormScope(formId);
  const ws = useSearchParams().get('ws') ?? (scope && scope !== 'personal' ? scope : null);

  const { data: form } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => formsService.getFormById(formId),
    enabled: show && !!formId,
  });
  const { data: workspaces = [] } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: workspacesService.list,
    enabled: show && !!ws,
  });

  if (!show) return null;

  const workspace = workspaces.find((w) => w.slug === ws);
  const isOwnPersonal = !ws && (form?.myRole ?? 'owner') === 'owner';
  const breadcrumb: BreadcrumbItem[] = ws
    ? [{ label: workspace?.name ?? 'Workspace', href: `/w/${ws}` }, { label: 'Forms', href: `/w/${ws}/forms` }, { label: form?.title ?? '…' }]
    : isOwnPersonal
      ? [{ label: 'Personal', href: '/dashboard' }, { label: 'Forms', href: '/forms' }, { label: form?.title ?? '…' }]
      : [{ label: 'Shared with me', href: '/shared' }, { label: form?.title ?? '…' }];

  const parent = breadcrumb[breadcrumb.length - 2];
  const backHref = parent.href ?? '/forms';
  const backLabel = parent.label;

  const canEdit =!form?.myRole || hasCapability(form.myRole, 'forms:edit');
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {/* The app sidebar is hidden on these pages (see PersonalShell), so this is the way out. Always the list, never history. */}
        <Button variant="ghost" size="small" onClick={() => router.push(backHref)} aria-label={`Back to ${backLabel}`}>
          <ArrowLeft size={16} className="bg-icon" />
          {backLabel}
        </Button>
        <Breadcrumb items={breadcrumb} />
      </div>
      <div className="flex min-w-0 items-center gap-3">
        {form ? (
          <>
            <p className="bg-h4 min-w-0 truncate font-semibold text-(--text-primary)">{form.title}</p>
            <StatusBadge variant={form.status}>{STATUS_LABEL[form.status]}</StatusBadge>
          </>
        ) : (
          <Skeleton variant="text" width={200} height={24} />
        )}
      </div>
      <FormSubNav
        formId={formId}
        ws={ws}
        canEdit={canEdit}
        active={/\/inbox\/?$/.test(pathname) ? 'responses' : pathname.endsWith('/insights') ? 'insights' : 'overview'}
      />
    </div>
  );
}
