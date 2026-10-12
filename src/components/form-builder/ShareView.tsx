'use client';

import { buildPublicFormUrl, publicFormSlug, publicOrigin } from '@/lib/publicFormUrl';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Copy, Download, ExternalLink, FileQuestion, Lock } from 'lucide-react';
import { formsService } from '@/services/forms';
import { workspacesService } from '@/services/workspaces';
import { formKeys, workspaceKeys } from '@/lib/queryKeys';
import { canPublishForm, canSeeShare } from '@/lib/roles';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { BreadcrumbItem } from '@/components/ui/Breadcrumb';
import { EmbedStudio } from './embed/EmbedStudio';

const STATUS_LABEL = { draft: 'Draft', published: 'Published', closed: 'Closed' } as const;

// Sprint 13 (CF6.1) + CF6.2a. Share & Embed is the single home for ongoing distribution. It is the editor's fourth tab
// (after Settings), per the feature list's CF2.1 - the earlier standalone page (wireframe 34) now redirects here. Publishing itself is owned by the publish flow, not
// this page. The embed builder (five methods, live snippet and preview) lives in ./embed; "Share as a copy" (CF6.3) is still not planned,
// and "Generate new link" lands with the publish flow (needs BE 0.4).
export interface ShareViewProps {
  formId: string;
  /** Inside the builder's Share tab: no page header/breadcrumb (the tab is the heading). */
  embedded?: boolean;
  /** Embedded: open the publish dialog instead of navigating away. */
  onOpenPublish?: () => void;
}

export function ShareView({ formId, embedded = false, onOpenPublish }: ShareViewProps) {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Same key the builder and preview use, so arriving from either is a cache hit.
  const formQuery = useQuery({
    queryKey: formKeys.all(formId),
    queryFn: () => formsService.getFormById(formId),
    retry: false,
  });
  const form = formQuery.data;
  const workspaceId = form?.workspaceId ?? null;

  const workspacesQuery = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: workspacesService.list,
    enabled: workspaceId !== null,
  });
  const workspace = workspacesQuery.data?.find((w) => w.id === workspaceId);

  // Personal form: the caller owns it. Workspace form: their membership role, fail-closed while unknown.
  const role = workspaceId === null ? 'owner' : workspace?.role;

  const liveSlug = form ? publicFormSlug(form) : undefined;
  const isLive = form?.status === 'published' && !!liveSlug;
  const publicUrl = isLive ? buildPublicFormUrl(liveSlug) : '';
  // The embed snippet needs an ABSOLUTE origin (it is pasted into another site). Same env as the public link, with the
  // page's own origin as the fallback so a missing env var never emits a relative address.
  const appOrigin = publicOrigin();

  useEffect(() => {
    if (!publicUrl) return;
    let cancelled = false;
    // Loaded on demand: the QR encoder is only needed once the Share tab shows a live link.
    import('qrcode')
      .then(({ toDataURL }) => toDataURL(publicUrl, { width: 200, margin: 1 }))
      .then((url) => !cancelled && setQrDataUrl(url))
      .catch(() => !cancelled && setQrDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [publicUrl]);

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(message, 'success');
    } catch {
      toast('Could not copy. Select the text and copy it manually.', 'error');
    }
  };

  const downloadQr = () => {
    if (!qrDataUrl || !form) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${form.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-qr.png`;
    link.click();
  };

  if (formQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-label="Loading Share & Embed">
        <Skeleton variant="title" width="40%" />
        <Skeleton variant="text" width="100%" height={160} />
      </div>
    );
  }

  if (formQuery.isError || !form) {
    const status = (formQuery.error as { response?: { status?: number } } | null)?.response?.status;
    if (status === 403) {
      return <EmptyState illustration="no-access" icon={<Lock className="bg-icon" aria-hidden="true" />} title="You do not have access to this form." />;
    }
    if (status === 404) {
      return <EmptyState illustration="not-found" icon={<FileQuestion className="bg-icon" aria-hidden="true" />} title="This form could not be found." />;
    }
    return (
      <Alert variant="error" title="We could not load this form.">
        <Button variant="secondary" size="small" onClick={() => void formQuery.refetch()}>
          Retry
        </Button>
      </Alert>
    );
  }

  // Reviewers do not see this screen at all (wireframe 34 notes). Wait for the role on workspace forms
  // so a Reviewer never flashes the page before it resolves.
  if (workspaceId !== null && workspacesQuery.isLoading) {
    return <Skeleton variant="text" width="100%" height={160} />;
  }
  if (!canSeeShare(role)) {
    return (
      <EmptyState
        illustration="no-access"
        icon={<Lock className="bg-icon" aria-hidden="true" />}
        title="Sharing is not available for your role."
        description="Ask an Owner, Admin or Editor of this workspace to share the form."
      />
    );
  }

  const breadcrumb: BreadcrumbItem[] =
    workspaceId === null
      ? [{ label: 'Forms', href: '/forms' }, { label: form.title, href: `/forms/${formId}/overview` }, { label: 'Share & Embed' }]
      : workspace
        ? [
            { label: workspace.name, href: `/w/${workspace.slug}` },
            { label: form.title, href: `/forms/${formId}/overview` },
            { label: 'Share & Embed' },
          ]
        : [{ label: 'Shared with me', href: '/shared' }, { label: form.title, href: `/forms/${formId}/overview` }, { label: 'Share & Embed' }];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {embedded ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="bg-h4 font-bold text-(--text-primary)">Share &amp; Embed</h2>
            <p className="bg-body text-(--text-muted) mt-1">Distribute this form. Responses, notes and analytics are never exposed by anything here.</p>
          </div>
          <StatusBadge variant={form.status}>{STATUS_LABEL[form.status]}</StatusBadge>
        </div>
      ) : (
        <PageHeader
          breadcrumb={breadcrumb}
          eyebrow="Form access"
          title="Share & Embed"
          description="Distribute this form. Responses, notes and analytics are never exposed by anything on this page."
          actions={<StatusBadge variant={form.status}>{STATUS_LABEL[form.status]}</StatusBadge>}
        />
      )}

      {!isLive && (
        <Alert variant="warning" title="This form is not published yet.">
          The link below will not accept responses until it is published.{' '}
          {canPublishForm(role) ? (
            onOpenPublish ? (
              <button type="button" onClick={onOpenPublish} className="font-semibold underline">
                Publish now
              </button>
            ) : (
              <Link href={`/forms/${formId}/edit`} className="font-semibold underline">
                Publish in the editor
              </Link>
            )
          ) : (
            <>Your {role === 'viewer' || role === 'reviewer' ? 'Reviewer' : 'Editor'} role cannot publish — ask an Owner or Admin.</>
          )}
        </Alert>
      )}

      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2 className="bg-h5 font-semibold">Public link</h2>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-48 flex-1">
                <Input
                  id="share-public-url"
                  value={publicUrl}
                  readOnly
                  disabled={!isLive}
                  placeholder="Publish the form to get a link"
                  className="font-mono"
                  aria-label="Public form link"
                  title={publicUrl}
                  onFocus={(e) => e.currentTarget.select()}
                />
              </div>
              <Button type="button" onClick={() => void copy(publicUrl, 'Link copied to clipboard.')} disabled={!isLive} className="shrink-0 min-h-11">
                <Copy size={16} aria-hidden="true" /> Copy
              </Button>
              {isLive && (
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <Button type="button" variant="secondary" className="min-h-11">
                    <ExternalLink size={16} aria-hidden="true" /> Open form
                  </Button>
                </a>
              )}
            </div>
            <p className="bg-body-sm text-(--text-muted)">The link never changes, even when you re-publish or edit the form.</p>
          </div>

          {isLive && (
            <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-stretch sm:gap-2">
              {qrDataUrl ? (
                // Deliberately bg-white in every theme: a QR code needs a light quiet zone to scan, so this is not a dark-mode gap.
                // eslint-disable-next-line @next/next/no-img-element -- client-generated data: URI, not a static asset
                <img src={qrDataUrl} alt="QR code linking to the public form" width={112} height={112} className="size-28 self-center rounded-md border border-(--border-default) bg-white p-1" />
              ) : (
                <p className="bg-body-sm text-(--text-muted)">QR code could not be generated.</p>
              )}
              <Button type="button" variant="secondary" size="small" onClick={downloadQr} disabled={!qrDataUrl} className="min-h-11">
                <Download size={16} aria-hidden="true" /> Download QR
              </Button>
            </div>
          )}
        </Card>

        <EmbedStudio
          ctx={isLive ? { origin: appOrigin, slug: liveSlug!, formTitle: form.title } : null}
          fields={form.fields}
          pages={form.pages}
          onCopy={(text, message) => void copy(text, message)}
        />
      </div>
    </div>
  );
}
