'use client';

import Link from 'next/link';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
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
 * status, and a horizontal sub-nav (Overview · Inbox · Insights · Edit · Settings). It sits under
 * the workspace/personal sidebar, which stays mounted - the form's own nav never replaces it.
 * Edit and Settings are shown only to roles that can edit (presentation only; the server enforces).
 */
export function FormLevelHeader() {
  const { id: formId } = useParams<{ id: string }>();
  const pathname = usePathname();
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

  const canEdit = !form?.myRole || hasCapability(form.myRole, 'forms:edit');
  const base = `/forms/${formId}`;
  const q = ws ? `ws=${encodeURIComponent(ws)}` : '';
  const withQuery = (path: string, extra?: string) => {
    const parts = [extra, q].filter(Boolean).join('&');
    return `${base}${path}${parts ? `?${parts}` : ''}`;
  };
  const items = [
    { label: 'Overview', href: withQuery('/overview'), active: /\/(overview|scores)\/?$/.test(pathname) },
    { label: 'Inbox', href: withQuery('/inbox'), active: pathname.endsWith('/inbox') },
    { label: 'Insights', href: withQuery('/insights'), active: pathname.endsWith('/insights') },
    ...(canEdit
      ? [
          { label: 'Edit', href: withQuery('/edit'), active: false },
          { label: 'Settings', href: withQuery('/edit', 'tab=settings'), active: false },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-3">
      <Breadcrumb items={breadcrumb} />
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
      <nav aria-label="Form" className="bg-tabs">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            aria-current={item.active ? 'page' : undefined}
            className="bg-tab aria-[current=page]:border-b-(--border-focus) aria-[current=page]:text-(--text-link)"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
