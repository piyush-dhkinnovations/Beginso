import axiosInstance from '@/lib/axios';
import type {
  UserProfile,
  UpdateProfilePayload,
  WorkspaceSettings,
  UpdateWorkspacePayload,
  SessionSummary,
  WorkspaceExportJob,
} from '@/types/settings';

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

  // Already a live backend endpoint (docs/backend-contract/api-reference.md §1) — fires the
  // existing password_changed_success security-alert email, no new backend work.
  notifyPasswordChanged: (): Promise<void> =>
    axiosInstance.post('/api/auth/password-changed').then(() => undefined),

  getWorkspace: (): Promise<WorkspaceSettings> =>
    axiosInstance.get('/api/workspaces/current').then((r) => unwrapEnvelope<WorkspaceSettings>(r.data, 'workspace')),

  // Also carries notificationPreferences (Requirement 7) — confirmed live 18 Aug 2026 as a field
  // on the workspace document, not a separate endpoint. NotificationsTab calls this with
  // { notificationPreferences } the same way BrandingTab calls it with { branding }.
  updateWorkspace: (payload: UpdateWorkspacePayload): Promise<WorkspaceSettings> =>
    axiosInstance.patch('/api/workspaces/current', payload).then((r) => unwrapEnvelope<WorkspaceSettings>(r.data, 'workspace')),

  getSessions: (): Promise<{ sessions: SessionSummary[] }> =>
    axiosInstance.get('/api/auth/sessions').then((r) => r.data),

  revokeSession: (id: string): Promise<void> =>
    axiosInstance.delete(`/api/auth/sessions/${id}`).then(() => undefined),

  // Corrected 14 Aug 2026 via `SPRINT6_HANDOFF.md`: this IS job-id-then-poll (the 18 Aug
  // "fixed-path stream" conclusion was wrong) — `202 { exportJob: { id, status, expiresAt } }`.
  requestWorkspaceExport: (): Promise<WorkspaceExportJob> =>
    axiosInstance.post('/api/workspaces/current/export').then((r) => unwrapEnvelope<WorkspaceExportJob>(r.data, 'exportJob')),

  // Confirmed live 17 Aug 2026 per a direct backend report (commit a7a5185) — resolves the
  // status-check gap flagged since 18 Aug (requirements.md §15 item 12). Real shape:
  // `{ success, exportJob: { id, status: "completed" | "processing" } }`. Goes through the
  // generic `/api/backend/[...path]` BFF proxy like every other non-file Settings call — no
  // dedicated route needed, unlike getExportFileBlobUrl below (a real file stream).
  getExportStatus: (jobId: string): Promise<WorkspaceExportJob> =>
    axiosInstance
      .get('/api/workspaces/current/export/status', { params: { jobId } })
      .then((r) => unwrapEnvelope<WorkspaceExportJob>(r.data, 'exportJob')),

  // Same same-origin proxy + blob pattern as reportsService.getReportFileBlobUrl
  // (src/app/api/workspaces/export/file/route.ts), never a direct authenticated cross-origin
  // fetch. Only called once getExportStatus above reports "completed" — the backend now also
  // returns a graceful `202 { exportJob: { status: "processing" } }` instead of a hard 404 if
  // called too early, but there's no reason to rely on that fallback when a dedicated status
  // check exists.
  getExportFileBlobUrl: async (jobId: string): Promise<string> => {
    const res = await axiosInstance.get<Blob>(`${window.location.origin}/api/workspaces/export/file`, {
      params: { jobId },
      responseType: 'blob',
    });
    return URL.createObjectURL(res.data);
  },

  deleteWorkspace: (payload: { reauthToken: string }): Promise<void> =>
    axiosInstance.delete('/api/workspaces/current', { data: payload }).then(() => undefined),
};
