import type { FormBranding } from '@/types/form'; // reused, not redefined — see design.md §12

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
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
  createdAt: string;
}

export interface UpdateWorkspacePayload {
  name?: string;
  branding?: Partial<FormBranding>;
}

export interface NotificationPreferences {
  newResponseEmail: boolean;
  weeklyDigestEmail: boolean;
  productUpdatesEmail: boolean;
}

export type UpdateNotificationPreferencesPayload = Partial<NotificationPreferences>;

export interface SessionSummary {
  id: string;
  deviceLabel: string; // e.g. "Chrome on Windows" — backend-computed
  approxLocation: string | null;
  lastActiveAt: string; // ISO 8601
  isCurrent: boolean;
}

export type WorkspaceExportStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface WorkspaceExportJob {
  jobId: string;
  status: WorkspaceExportStatus;
  downloadUrl?: string; // present only when status === 'completed'
  errorMessage?: string; // present only when status === 'failed'
}
