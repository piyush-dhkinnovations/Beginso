import type { AppNotification } from '@/types/notification';

// Sprint 14 (B9.1): the bell and the Notifications page share one routing rule. Mention/assignment
// notifications carry a `responseId` and open the Inbox at that response (the existing
// `?responseId=` contract). Returns null for notifications with nowhere to go. `formId` and
// `responseId` come from server data, never from a URL param.
export function resolveNotificationTarget(notification: AppNotification, scope: string = 'personal'): string | null {
  if (notification.type === 'form_shared') return '/shared';
  if (notification.type === 'storage_warning') return '/trash';
  if (notification.type === 'welcome') return scope !== 'personal' ? `/w/${encodeURIComponent(scope)}` : '/dashboard';
  const wsQuery = scope !== 'personal' ? `ws=${encodeURIComponent(scope)}` : '';
  // Form activity with no specific response: that form's Inbox.
  if (!notification.responseId) {
    return notification.formId ? `/forms/${encodeURIComponent(notification.formId)}/inbox${wsQuery && `?${wsQuery}`}` : null;
  }
  const id = encodeURIComponent(notification.responseId);
  if (notification.formId) {
    const form = encodeURIComponent(notification.formId);
    return `/forms/${form}/inbox?responseId=${id}${scope !== 'personal' ? `&ws=${encodeURIComponent(scope)}` : ''}`;
  }
  return scope !== 'personal' ? `/w/${scope}/inbox?responseId=${id}` : `/inbox?responseId=${id}`;
}
