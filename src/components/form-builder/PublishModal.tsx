'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Copy, ExternalLink, Lock, Share2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { formsService } from '@/services/forms';
import { settingsService } from '@/services/settings';
import { readinessKeys, settingsKeys } from '@/lib/queryKeys';
import { useWorkspaceTimezone } from '@/hooks/useWorkspaceTimezone';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import type { AccessMode, FormSettings, FormStatus, ReadinessIssue } from '@/types/form';

// Sprint 13 (CF6.5 / CF2.5 / CF5.3), requirements.md 5.1–5.5, wireframe 38 "Publish Form".
// Two states in one dialog. PRE-FLIGHT fronts the four things that are wrong-by-default if nobody looks:
// the public URL, who can respond, the closing date and notifications — with readiness from the SERVER
// (one rule, shared with its own publish check). Blocking issues stop Publish; warnings never do.
// LIVE shows the link, share/embed shortcuts, Unpublish (with undo) and the deliberate "Generate new link".
// A re-publish never changes the link; only the explicit action does.
export interface PublishFlowProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  formTitle: string;
  status: FormStatus;
  slug?: string;
  settings: FormSettings;
  /** Workspace slug, or 'personal' — for the timezone and the notification setting. */
  scope: string;
  /** The caller's role allows publishing (`canPublishForm`). A convenience; the server enforces it. */
  canPublish: boolean;
  /** Every status / link change goes through here so the builder store and query cache stay in step. */
  onStatusChange: (status: FormStatus, slug?: string) => void;
  /** "Change" on a review row: closes this dialog and opens Settings. */
  onChangeSetting: () => void;
  /** "Fix in editor": closes this dialog and selects the field. */
  onFixField: (fieldId?: string) => void;
}

const MODE_COPY: Record<AccessMode, string> = {
  open: 'Anyone with the link — no email, no tracking',
  tracked: 'Anyone with the link — asked for their email so they can view and correct their answers',
  login: 'Only people signed in to Beginso',
};

function ReviewRow({ label, value, onChange, changeLabel }: { label: string; value: React.ReactNode; onChange?: () => void; changeLabel: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="bg-caption text-(--text-muted)">{label}</p>
        <div className="bg-body font-semibold text-(--text-primary) break-words">{value}</div>
      </div>
      {onChange && (
        <Button type="button" variant="secondary" size="small" className="shrink-0 min-h-11" onClick={onChange} aria-label={changeLabel}>
          Change
        </Button>
      )}
    </div>
  );
}

function IssueList({ issues, tone, onFix }: { issues: ReadinessIssue[]; tone: 'error' | 'warning'; onFix: (fieldId?: string) => void }) {
  if (issues.length === 0) return null;
  return (
    <Alert
      variant={tone}
      title={tone === 'error' ? 'Fix these before publishing' : `${issues.length} thing${issues.length === 1 ? '' : 's'} to check`}
    >
      <ul className="flex flex-col gap-1">
        {issues.map((issue, i) => (
          <li key={`${issue.code}-${issue.fieldId ?? i}`}>
            {issue.message}
            {issue.fieldId && (
              <>
                {' '}
                <button type="button" onClick={() => onFix(issue.fieldId)} className="font-semibold underline underline-offset-2">
                  Fix in editor
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </Alert>
  );
}

export function PublishModal(props: PublishFlowProps) {
  const { isOpen, onClose, status, formTitle } = props;
  const live = status === 'published';
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={live ? 'Form is live' : `Publish ${formTitle || 'form'}`}
      description={live ? undefined : 'Review these before the form goes live. You can change any of them later without breaking the link.'}
    >
      {isOpen && (live ? <LiveState {...props} /> : <Preflight {...props} />)}
    </Modal>
  );
}

// ─── Pre-flight ──────────────────────────────────────────────────────────────

function Preflight({ onClose, formId, slug, settings, scope, canPublish, onStatusChange, onChangeSetting, onFixField }: PublishFlowProps) {
  const { toast } = useToast();
  const timezone = useWorkspaceTimezone(scope);

  const readiness = useQuery({
    queryKey: readinessKeys.form(formId),
    queryFn: () => formsService.getReadiness(formId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  // The viewer's own email setting for this workspace — read-only here; delivery ships with notifications.
  const workspaceSettings = useQuery({
    queryKey: settingsKeys.workspace(scope),
    queryFn: () => settingsService.getWorkspace(scope === 'personal' ? undefined : scope),
    retry: false,
    staleTime: 60_000,
  });

  const publish = useMutation({
    mutationFn: () =>
      formsService.publishForm(formId, {
        ...(settings.accessMode ? { accessMode: settings.accessMode } : {}),
        ...(settings.closeDate ? { closeDate: settings.closeDate } : {}),
      }),
    onSuccess: (result) => {
      onStatusChange('published', result.slug);
      toast('Form published successfully!', 'success');
    },
    // The server re-runs readiness: a blocking code comes back as a 400 with its own message.
    onError: (err) => toast(getFriendlyErrorMessage(err), 'error'),
  });

  if (!canPublish) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="info" title="Only Owners and Admins can publish">
          <span className="inline-flex items-center gap-1.5">
            <Lock size={14} aria-hidden="true" /> Ask an Owner or Admin to publish this form.
          </span>
        </Alert>
        <div className="flex justify-end pt-4 border-t border-(--border-subtle)">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  const mode: AccessMode = settings.accessMode ?? 'open';
  const closeText = settings.closeDate
    ? new Date(settings.closeDate).toLocaleString('en-GB', { timeZone: timezone, dateStyle: 'medium', timeStyle: 'short' })
    : 'No closing date';
  const notifyText = workspaceSettings.data
    ? workspaceSettings.data.notificationPreferences?.newResponseEmail
      ? 'Email me on each response'
      : 'No email notifications'
    : workspaceSettings.isError
      ? 'Unavailable'
      : '…';
  const publicUrl = slug ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/f/${slug}` : null;

  const blocking = readiness.data?.blocking ?? [];
  const warnings = readiness.data?.warnings ?? [];

  return (
    <div className="flex flex-col gap-4">
      {readiness.isLoading ? (
        // Skeleton rows, same count as the populated state — nothing jumps when data lands.
        <div className="rounded-lg border border-(--border-default)" aria-label="Checking your form">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-(--border-subtle) last:border-b-0">
              <Skeleton variant="text" width="30%" />
              <Skeleton variant="text" width="60%" />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-(--border-default) divide-y divide-(--border-subtle)">
          <ReviewRow
            label="Public URL"
            value={
              publicUrl ? (
                <span className="font-mono text-sm">{publicUrl}</span>
              ) : (
                <>A link will be created. It stays the same every time you re-publish.</>
              )
            }
            changeLabel="Public URL is managed after publishing"
          />
          <ReviewRow
            label="Who can respond"
            value={
              <>
                {MODE_COPY[mode]}
                {mode === 'login' && (
                  <span className="block bg-caption font-normal text-(--warning-text)">
                    Requiring login reduces completions on public forms.
                  </span>
                )}
              </>
            }
            onChange={onChangeSetting}
            changeLabel="Change who can respond"
          />
          <ReviewRow label="Closing date" value={closeText} onChange={onChangeSetting} changeLabel="Change the closing date" />
          <ReviewRow
            label="Notifications"
            value={
              <>
                {notifyText}
                <span className="block bg-caption font-normal text-(--text-muted)">
                  Email delivery arrives with notifications. Manage it in{' '}
                  <Link href={scope === 'personal' ? '/settings' : `/w/${scope}/settings`} className="underline">
                    Settings
                  </Link>
                  .
                </span>
              </>
            }
            changeLabel="Change notifications"
          />
        </div>
      )}

      {readiness.isError && (
        <Alert variant="warning" title="We couldn't check this form">
          You can still try publishing — the server will verify it.{' '}
          <button type="button" className="font-semibold underline" onClick={() => void readiness.refetch()}>
            Retry
          </button>
        </Alert>
      )}
      <IssueList issues={blocking} tone="error" onFix={onFixField} />
      <IssueList issues={warnings} tone="warning" onFix={onFixField} />

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-(--border-subtle)">
        <Button type="button" variant="secondary" onClick={onClose} disabled={publish.isPending}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => publish.mutate()}
          isLoading={publish.isPending}
          disabled={readiness.isLoading || blocking.length > 0}
        >
          Publish
        </Button>
      </div>
    </div>
  );
}

// ─── Live ────────────────────────────────────────────────────────────────────

function LiveState({ onClose, formId, slug, canPublish, onStatusChange }: PublishFlowProps) {
  const { toast } = useToast();
  const [confirmingNewLink, setConfirmingNewLink] = useState(false);
  const publicUrl = slug ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/f/${slug}` : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast('Link copied to clipboard', 'success');
    } catch {
      toast('Could not copy. Select the link and copy it manually.', 'error');
    }
  };

  const unpublish = useMutation({
    mutationFn: () => formsService.unpublishForm(formId),
    onSuccess: () => {
      onStatusChange('draft', slug);
      onClose();
      // Undo = publish again. The slug is kept server-side, so the link comes back identical.
      toast('Form unpublished', 'success', 8000, {
        label: 'Undo',
        onClick: () => {
          formsService
            .publishForm(formId)
            .then((r) => {
              onStatusChange('published', r.slug || slug);
              toast('Form is live again', 'success');
            })
            .catch((err) => toast(getFriendlyErrorMessage(err), 'error'));
        },
      });
    },
    onError: (err) => toast(getFriendlyErrorMessage(err), 'error'),
  });

  const regenerate = useMutation({
    mutationFn: () => formsService.regenerateLink(formId),
    onSuccess: (r) => {
      onStatusChange('published', r.slug);
      setConfirmingNewLink(false);
      toast('New link generated. The old link no longer works.', 'success');
    },
    onError: (err) => toast(getFriendlyErrorMessage(err), 'error'),
  });

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="success">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 size={16} aria-hidden="true" />
          Anyone with the link can now submit. The link stays the same every time you re-publish.
        </span>
      </Alert>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input id="publish-live-url" label="Public link" value={publicUrl} readOnly className="font-mono" />
        </div>
        <Button type="button" variant="secondary" className="min-h-11" onClick={() => void copy()}>
          <Copy size={16} className="mr-1.5" aria-hidden="true" />
          Copy
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href={`/forms/${formId}/share`}>
          <Button type="button" variant="secondary" className="w-full min-h-11">
            <Share2 size={16} className="mr-1.5" aria-hidden="true" />
            Share &amp; embed
          </Button>
        </Link>
        <a href={publicUrl} target="_blank" rel="noopener noreferrer">
          <Button type="button" variant="secondary" className="w-full min-h-11">
            <ExternalLink size={16} className="mr-1.5" aria-hidden="true" />
            View live form
          </Button>
        </a>
      </div>

      {canPublish && (
        <div className="rounded-lg border border-(--border-default) p-3">
          {confirmingNewLink ? (
            <div className="flex flex-col gap-3">
              <p className="bg-body-sm text-(--text-secondary)">
                <strong>Generate a new link?</strong> Anything already shared with the old link — messages, QR codes, embeds — will stop working.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" size="small" onClick={() => setConfirmingNewLink(false)} disabled={regenerate.isPending}>
                  Keep current link
                </Button>
                <Button type="button" variant="destructive" size="small" onClick={() => regenerate.mutate()} isLoading={regenerate.isPending}>
                  Generate new link
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingNewLink(true)}
              className="min-h-11 bg-body-sm text-(--text-muted) hover:text-(--text-secondary) underline underline-offset-2"
            >
              Generate new link…
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-(--border-subtle)">
        {canPublish && (
          <Button type="button" variant="secondary" onClick={() => unpublish.mutate()} isLoading={unpublish.isPending}>
            Unpublish
          </Button>
        )}
        <Button type="button" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
