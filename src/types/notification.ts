// Confirmed live 18 Aug 2026 — see docs/backend-contract/api-reference.md §6 for the full
// contract and docs/backend-contract/checklists/sprint-6-settings-checklist.md for the resolved
// issues found along the way. Widened by Sprint 12 (inbox-collaboration) requirements.md §7.12
// (B9.1 partial): the bell must render mention/assignment notifications, and any future unknown
// `type` as a generic row, without crashing — a plain `string` fallback covers both.
export type NotificationType = 'welcome' | 'password_reset' | 'form_activity' | 'mention' | 'assignment' | 'response_edited' | (string & {});

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO 8601
  read: boolean;
  /** Present on mention/assignment notifications — click routes to `…/inbox?responseId=`
   * (requirements.md §7.12). Uncertain (design.md §13) until the backend ships B5.2/B3.2. */
  responseId?: string;
  formId?: string;
}

// Sprint 14 (B9.1) — one cursor page of the notifications list. `nextCursor` is additive on the
// wire; null/absent means no more pages.
export interface NotificationPage {
  items: AppNotification[];
  nextCursor: string | null;
}

export type NotificationFilter = 'all' | 'unread' | 'mentions';
