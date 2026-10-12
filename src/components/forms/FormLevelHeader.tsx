'use client';

import { useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Link2, MoreVertical, Pin, PinOff, Pencil, Settings, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Menu, type MenuItem } from '@/components/ui/Menu';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { FormHeader, formatFormDate } from '@/components/forms/FormHeader';
import { FormAccessPanel } from '@/components/team/FormAccessPanel';
import { useFormScope } from '@/hooks/useFormScope';
import { usePinForm } from '@/hooks/usePinForm';
import { formsService } from '@/services/forms';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import { hasCapability } from '@/lib/roles';
import { buildPublicFormUrl, publicFormSlug } from '@/lib/publicFormUrl';

const STATUS_LABEL = { draft: 'Draft', published: 'Published', closed: 'Closed' } as const;

// Pages under /forms/:id that show this header. The builder renders the same FormHeader itself (it adds the
// title field, save state and publish actions), and the preview is a full-viewport overlay with no header.
const HEADER_ROUTE_RE = /^\/forms\/[^/]+\/(overview|scores)\/?$/;

/**
 * The header for the form's read pages: icon, name, status, created/updated dates, Preview / Share /
 * Edit form / ⋮, and the tab bar (Overview · Edit · Settings). Edit and Share are shown
 * only to roles that can edit (presentation only; the server enforces).
 */
export function FormLevelHeader() {
  const { id: formId } = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const pin = usePinForm();
  const [accessOpen, setAccessOpen] = useState(false);
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
  const back = ws
    ? { label: workspace?.name ? `${workspace.name} forms` : 'Forms', href: `/w/${ws}/forms` }
    : isOwnPersonal
      ? { label: 'Forms', href: '/forms' }
      : { label: 'Shared with me', href: '/shared' };

  const canEdit = !form?.myRole || hasCapability(form.myRole, 'forms:edit');
  const q = ws ? `?ws=${encodeURIComponent(ws)}` : '';
  const publicUrl = form?.status === 'published' ? buildPublicFormUrl(publicFormSlug(form)) : '';

  const menu: MenuItem[] = [
    ...(canEdit
      ? [{ id: 'settings', label: 'Form settings', icon: <Settings size={16} />, onSelect: () => router.push(`/forms/${formId}/edit?tab=settings${ws ? `&ws=${encodeURIComponent(ws)}` : ''}`) }]
      : []),
    ...(form
      ? [{
          id: 'pin',
          label: form.pinned ? 'Unpin from top' : 'Pin to top',
          icon: form.pinned ? <PinOff size={16} /> : <Pin size={16} />,
          onSelect: () => pin.mutate({ id: formId, pin: !form.pinned }),
        }]
      : []),
    ...(publicUrl
      ? [{
          id: 'copy',
          label: 'Copy public link',
          icon: <Link2 size={16} />,
          onSelect: () => {
            void navigator.clipboard.writeText(publicUrl);
            toast('Link copied to clipboard.', 'success');
          },
        }]
      : []),
  ];

  const created = formatFormDate(form?.createdAt);
  const updated = formatFormDate(form?.updatedAt);

  return (
    <>
      <FormHeader
        onBack={() => router.push(back.href)}
        backLabel={back.label}
        title={form ? form.title : <Skeleton variant="text" width={200} height={24} />}
        badge={form && <StatusBadge variant={form.status}>{STATUS_LABEL[form.status]}</StatusBadge>}
        meta={form && (created || updated) ? <>{created && <>Created on {created}</>}{created && updated && ' · '}{updated && <>Last updated {updated}</>}</> : undefined}
        actions={
          <>
            <ButtonLink variant="secondary" href={`/forms/${formId}/preview`}>
              Preview
              <ExternalLink size={14} aria-hidden="true" className="ml-1.5" />
            </ButtonLink>
            {canEdit && (
              <Button variant="secondary" onClick={() => setAccessOpen(true)}>
                <Share2 size={16} className="mr-1.5" aria-hidden="true" />
                Share
              </Button>
            )}
            {canEdit && (
              <ButtonLink href={`/forms/${formId}/edit${q}`}>
                <Pencil size={16} className="mr-1.5" aria-hidden="true" />
                Edit form
              </ButtonLink>
            )}
            {menu.length > 0 && <Menu align="end" triggerLabel="More form actions" trigger={<MoreVertical size={18} aria-hidden="true" />} items={menu} />}
          </>
        }
      />
      {form && canEdit && <FormAccessPanel formId={formId} formTitle={form.title} isOpen={accessOpen} onClose={() => setAccessOpen(false)} />}
    </>
  );
}
