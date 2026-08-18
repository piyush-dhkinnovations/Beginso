// Confirmed live 18 Aug 2026 — see docs/backend-contract/api-reference.md §6 for the full
// contract and docs/backend-contract/checklists/sprint-6-settings-checklist.md for the resolved
// issues found along the way.
export type NotificationType = 'welcome' | 'password_reset' | 'form_activity';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO 8601
  read: boolean;
}
