import axiosInstance from '@/lib/axios';
import type {
  UserProfile,
  UpdateProfilePayload,
  WorkspaceSettings,
  UpdateWorkspacePayload,
  NotificationPreferences,
  UpdateNotificationPreferencesPayload,
  SessionSummary,
  WorkspaceExportJob,
} from '@/types/settings';

// Every method here consumes a proposed, not-yet-live endpoint except `notifyPasswordChanged`
// (already live). Backed by src/lib/mocks/settingsMocks.ts in components until Requirement 15's
// contract is confirmed — same "swap mocks for real calls" step Sprint 5 closed with.
export const settingsService = {
  getProfile: (): Promise<UserProfile> => axiosInstance.get('/api/users/me').then((r) => r.data),

  updateProfile: (payload: UpdateProfilePayload): Promise<UserProfile> =>
    axiosInstance.patch('/api/users/me', payload).then((r) => r.data),

  // Already a live backend endpoint (docs/backend-contract/api-reference.md §1) — fires the
  // existing password_changed_success security-alert email, no new backend work.
  notifyPasswordChanged: (): Promise<void> =>
    axiosInstance.post('/api/auth/password-changed').then(() => undefined),

  getWorkspace: (): Promise<WorkspaceSettings> =>
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

  getSessions: (): Promise<{ sessions: SessionSummary[] }> =>
    axiosInstance.get('/api/auth/sessions').then((r) => r.data),

  revokeSession: (id: string): Promise<void> =>
    axiosInstance.delete(`/api/auth/sessions/${id}`).then(() => undefined),

  requestWorkspaceExport: (): Promise<WorkspaceExportJob> =>
    axiosInstance.post('/api/workspaces/current/export').then((r) => r.data),

  // Polling path is an open question (requirements.md §15.6) — placeholder pending backend decision.
  getExportStatus: (jobId: string): Promise<WorkspaceExportJob> =>
    axiosInstance.get(`/api/workspaces/current/export/${jobId}`).then((r) => r.data),

  deleteWorkspace: (payload: { reauthToken: string }): Promise<void> =>
    axiosInstance.delete('/api/workspaces/current', { data: payload }).then(() => undefined),
};
