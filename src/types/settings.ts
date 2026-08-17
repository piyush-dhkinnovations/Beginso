import type { FormBranding } from '@/types/form'; // reused, not redefined — see design.md §12

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
<<<<<<< Updated upstream
=======
<<<<<<< HEAD
  // `role`/`status`/`lastLoginAt` confirmed live 18 Aug 2026 (Beginso-Report BACKEND.md/
  // API_CONTRACT.md); `emailVerified` confirmed live 14 Aug 2026 via a dedicated
  // `SPRINT6_HANDOFF.md` from the backend developer — that doc's example response omits
  // `role`/`status`/`lastLoginAt` entirely, which conflicts with the earlier, more detailed
  // confirmation. Not silently resolved: kept all four fields since the handoff doc reads as an
  // abbreviated illustrative example (Sprint-6-relevant fields only) rather than an exhaustive
  // shape, but this needs a direct answer from the backend developer — see
  // docs/backend-contract/checklists/sprint-6-settings-checklist.md item C.6. Unblocks
  // Requirement 8.1's Security-tab verification Badge (Wednesday).
  role: string;
  status: string;
=======
>>>>>>> d53f241896fa8475918039766386dcf82cd41a28
>>>>>>> Stashed changes
  emailVerified: boolean;
  createdAt: string; // ISO 8601
  lastLoginAt: string; // ISO 8601
}

export interface UpdateProfilePayload {
  name?: string;
  avatarUrl?: string | null;
}

export interface WorkspaceSettings {
  id: string;
  name: string;
  logoUrl: string | null;
  branding: FormBranding; // { primaryColor?, logoUrl?, coverImageUrl? } — same shape a form's own branding uses
<<<<<<< Updated upstream
=======
<<<<<<< HEAD
  // Confirmed live 18 Aug 2026 — notification preferences are NOT a separate resource/endpoint,
  // they're a field directly on the workspace document. NotificationsTab (Wednesday) reads/writes
  // this via settingsService.getWorkspace()/updateWorkspace(), the same query WorkspaceTab and
  // BrandingTab already share — not a dedicated settingsKeys.notifications() query.
  notificationPreferences: NotificationPreferences;
=======
>>>>>>> d53f241896fa8475918039766386dcf82cd41a28
>>>>>>> Stashed changes
  createdAt: string;
}

export interface UpdateWorkspacePayload {
  name?: string;
  branding?: Partial<FormBranding>;
<<<<<<< Updated upstream
=======
<<<<<<< HEAD
  notificationPreferences?: Partial<NotificationPreferences>;
=======
>>>>>>> d53f241896fa8475918039766386dcf82cd41a28
>>>>>>> Stashed changes
}

export interface NotificationPreferences {
  newResponseEmail: boolean;
  weeklyDigestEmail: boolean;
  productUpdatesEmail: boolean;
}

<<<<<<< Updated upstream
export type UpdateNotificationPreferencesPayload = Partial<NotificationPreferences>;

=======
<<<<<<< HEAD
=======
export type UpdateNotificationPreferencesPayload = Partial<NotificationPreferences>;

>>>>>>> d53f241896fa8475918039766386dcf82cd41a28
>>>>>>> Stashed changes
export interface SessionSummary {
  id: string;
  deviceLabel: string; // e.g. "Chrome on Windows" — backend-computed
  approxLocation: string | null;
  lastActiveAt: string; // ISO 8601
  isCurrent: boolean;
}

<<<<<<< Updated upstream
=======
<<<<<<< HEAD
// Corrected again 14 Aug 2026 via `SPRINT6_HANDOFF.md` — the 18 Aug "fixed-path stream, no job
// id" conclusion was wrong. `POST /api/workspaces/current/export` returns
// `202 { exportJob: { id, status, expiresAt } }`, and `GET /api/workspaces/current/export/file`
// takes the job id as a `?jobId=` query param — this IS the job-id-then-poll pattern Sprint 5's
// Reports already use, matching `ReportStatus`'s literal union. Status enum values beyond
// "queued" aren't shown in the handoff's one example; assumed to mirror `ReportStatus` (same
// backend, same async-job convention) pending confirmation — see checklist item C.2.
// No dedicated status-check endpoint is documented — how the frontend knows a job has finished
// (poll `GET .../export/file?jobId=` until it stops erroring? a separate status route that just
// isn't in this handoff?) is still unconfirmed. Left for whoever builds `DangerZoneSection`
// (Thursday, task 4.1) to get a direct answer before implementing polling, not to guess further.
export interface WorkspaceExportJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  expiresAt: string; // ISO 8601
=======
>>>>>>> Stashed changes
export type WorkspaceExportStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface WorkspaceExportJob {
  jobId: string;
  status: WorkspaceExportStatus;
  downloadUrl?: string; // present only when status === 'completed'
  errorMessage?: string; // present only when status === 'failed'
<<<<<<< Updated upstream
=======
>>>>>>> d53f241896fa8475918039766386dcf82cd41a28
>>>>>>> Stashed changes
}
