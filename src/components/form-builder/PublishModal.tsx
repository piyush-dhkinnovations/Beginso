'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function PublishModal({ isOpen, onClose, onConfirm, isPending }: PublishModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Publish form?"
      description="Your form will be live and accessible to anyone with the link. You can close it at any time."
    >
<<<<<<< Updated upstream
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
=======
      {isOpen && (live ? <LiveState {...props} /> : <Preflight {...props} />)}
    </Modal>
  );
}

// ─── Pre-flight ──────────────────────────────────────────────────────────────

function Preflight({ onClose, formId, settings, scope, canPublish, onStatusChange, onChangeSetting, onFixField }: PublishFlowProps) {
  const { toast } = useToast();
  const timezone = useWorkspaceTimezone(scope);

  const readiness = useQuery({
    queryKey: readinessKeys.form(formId),
    queryFn: () => formsService.getReadiness(formId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  // The viewer's own Membership.notificationPreference (same cache as Settings > Notifications).
  const myPref = useMyNotificationPreference(scope);

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
  const notifyText =
    scope === 'personal'
      ? 'No email notifications on personal forms'
      : myPref.preference
        ? {
            all: 'Email me on every response (no answers in the email)',
            mine: 'Email me on responses assigned to me or on forms I created (no answers in the email)',
            none: 'No response emails',
          }[myPref.preference]
        : myPref.isError
          ? 'Unavailable'
          : '…';

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
            // Never print a URL before publishing: the slug shown to a draft is not the one issued at publish,
            // so a copied pre-publish link is dead ("Form not found"). The real link appears once it is live.
            value={<>A link will be created when you publish. It stays the same every time you re-publish.</>}
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
                  Manage it in{' '}
                  <Link href={scope === 'personal' ? '/settings' : `/w/${scope}/settings?tab=notifications`} className="underline">
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
>>>>>>> Stashed changes
          Cancel
        </Button>
        <Button type="button" onClick={onConfirm} isLoading={isPending}>
          Publish
        </Button>
      </div>
    </Modal>
  );
}
