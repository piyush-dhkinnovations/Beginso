import axiosInstance from '@/lib/axios';
import type {
  UserProfile,
  UpdateProfilePayload,
  WorkspaceSettings,
  UpdateWorkspacePayload,
<<<<<<< Updated upstream
  NotificationPreferences,
  UpdateNotificationPreferencesPayload,
=======
<<<<<<< HEAD
=======
  NotificationPreferences,
  UpdateNotificationPreferencesPayload,
>>>>>>> d53f241896fa8475918039766386dcf82cd41a28
>>>>>>> Stashed changes
  SessionSummary,
  WorkspaceExportJob,
} from '@/types/settings';

<<<<<<< Updated upstream
=======
<<<<<<< HEAD
// Confirmed 14 Aug 2026 via `SPRINT6_HANDOFF.md`: every Settings response nests under a named
// key (`user`/`workspace`/`exportJob`/`sessions`), never `data` — the `data` branch below is now
// dead in practice but left as a harmless fallback rather than ripped out on a single doc's
// example. Originally added because the backend's own BACKEND.md §20 documented the response
// format as applied inconsistently across controllers; the exact bug that crashed AvatarUploader
// (profile.name undefined) was this kind of unhandled envelope mismatch.
function unwrapEnvelope<T>(raw: unknown, namedKey: string): T {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.data === 'object' && obj.data !== null) return obj.data as T;
    if (typeof obj[namedKey] === 'object' && obj[namedKey] !== null) return obj[namedKey] as T;
  }
  return raw as T;
}

export const settingsService = {
  getProfile: (): Promise<UserProfile> =>
    axiosInstance.get('/api/users/me').then((r) => unwrapEnvelope<UserProfile>(r.data, 'user')),

  updateProfile: (payload: UpdateProfilePayload): Promise<UserProfile> =>
    axiosInstance.patch('/api/users/me', payload).then((r) => unwrapEnvelope<UserProfile>(r.data, 'user')),
=======
>>>>>>> Stashed changes
// Every method here consumes a proposed, not-yet-live endpoint except `notifyPasswordChanged`
// (already live). Backed by src/lib/mocks/settingsMocks.ts in components until Requirement 15's
// contract is confirmed — same "swap mocks for real calls" step Sprint 5 closed with.
export const settingsService = {
  getProfile: (): Promise<UserProfile> => axiosInstance.get('/api/users/me').then((r) => r.data),

  updateProfile: (payload: UpdateProfilePayload): Promise<UserProfile> =>
    axiosInstance.patch('/api/users/me', payload).then((r) => r.data),
<<<<<<< Updated upstream
=======
>>>>>>> d53f241896fa8475918039766386dcf82cd41a28
>>>>>>> Stashed changes

  // Already a live backend endpoint (docs/backend-contract/api-reference.md §1) — fires the
  // existing password_changed_success security-alert email, no new backend work.
  notifyPasswordChanged: (): Promise<void> =>
    axiosInstance.post('/api/auth/password-changed').then(() => undefined),

  getWorkspace: (): Promise<WorkspaceSettings> =>
<<<<<<< Updated upstream
=======
<<<<<<< HEAD
    axiosInstance.get('/api/workspaces/current').then((r) => unwrapEnvelope<WorkspaceSettings>(r.data, 'workspace')),

  // Also carries notificationPreferences (Requirement 7) — confirmed live 18 Aug 2026 as a field
  // on the workspace document, not a separate endpoint. NotificationsTab calls this with
  // { notificationPreferences } the same way BrandingTab calls it with { branding }.
  updateWorkspace: (payload: UpdateWorkspacePayload): Promise<WorkspaceSettings> =>
    axiosInstance.patch('/api/workspaces/current', payload).then((r) => unwrapEnvelope<WorkspaceSettings>(r.data, 'workspace')),
=======
>>>>>>> Stashed changes
    axiosInstance.get('/api/workspaces/current').then((r) => r.data),

  updateWorkspace: (payload: UpdateWorkspacePayload): Promise<WorkspaceSettings> =>
    axiosInstance.patch('/api/workspaces/current', payload).then((r) => r.data),

  // Path is an open question (requirements.md §15.11) — placeholder pending backend decision.
  getNotificationPreferences: (): Promise<NotificationPreferences> =>
    axiosInstance.get('/api/workspaces/current/notifications').then((r) => r.data),

  updateNotificationPreferences: (
    payload: UpdateNotificationPreferencesPayload
  ): Promise<NotificationPreferences> =>
    axiosInstance.patch('/api/workspaces/current/notifications', payload).then((r) => r.data),
<<<<<<< Updated upstream
=======
>>>>>>> d53f241896fa8475918039766386dcf82cd41a28
>>>>>>> Stashed changes

  getSessions: (): Promise<{ sessions: SessionSummary[] }> =>
    axiosInstance.get('/api/auth/sessions').then((r) => r.data),

  revokeSession: (id: string): Promise<void> =>
    axiosInstance.delete(`/api/auth/sessions/${id}`).then(() => undefined),

<<<<<<< Updated upstream
=======
<<<<<<< HEAD
  // Corrected 14 Aug 2026 via `SPRINT6_HANDOFF.md`: this IS job-id-then-poll (the 18 Aug
  // "fixed-path stream" conclusion was wrong) — `202 { exportJob: { id, status, expiresAt } }`.
  // `GET .../export/file` then needs `?jobId=` — see `WorkspaceExportJob`'s doc comment for what's
  // still unconfirmed (no status-check endpoint documented). The actual polling UI and file-proxy
  // route (mirroring reportsService.getReportFileBlobUrl's same-origin proxy + blob pattern) are
  // Thursday's task (4.1), not built ahead of that here.
  requestWorkspaceExport: (): Promise<WorkspaceExportJob> =>
    axiosInstance.post('/api/workspaces/current/export').then((r) => unwrapEnvelope<WorkspaceExportJob>(r.data, 'exportJob')),
=======
>>>>>>> Stashed changes
  requestWorkspaceExport: (): Promise<WorkspaceExportJob> =>
    axiosInstance.post('/api/workspaces/current/export').then((r) => r.data),

  // Polling path is an open question (requirements.md §15.6) — placeholder pending backend decision.
  getExportStatus: (jobId: string): Promise<WorkspaceExportJob> =>
    axiosInstance.get(`/api/workspaces/current/export/${jobId}`).then((r) => r.data),
<<<<<<< Updated upstream
=======
>>>>>>> d53f241896fa8475918039766386dcf82cd41a28
>>>>>>> Stashed changes

  deleteWorkspace: (payload: { reauthToken: string }): Promise<void> =>
    axiosInstance.delete('/api/workspaces/current', { data: payload }).then(() => undefined),
};
