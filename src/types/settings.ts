import type { FormBranding } from '@/types/form'; // reused, not redefined — see design.md §12

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  // `role`/`status`/`lastLoginAt` field list conflicts with another backend doc's example — still
  // an open question, see sprint-6-settings-checklist.md item 1.
  role: string;
  status: string;
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
  /** IANA timezone and free-text description exist on the workspace document (backend updateWorkspaceSchema accepts both). */
  description?: string;
  timezone?: string;
  logoUrl: string | null;
  branding: FormBranding; // { primaryColor?, logoUrl?, coverImageUrl? } — same shape a form's own branding uses
  // Confirmed live 18 Aug 2026 — notification preferences are NOT a separate resource/endpoint,
  // they're a field directly on the workspace document. NotificationsTab (Wednesday) reads/writes
  // this via settingsService.getWorkspace()/updateWorkspace(), the same query WorkspaceTab and
  // BrandingTab already share — not a dedicated settingsKeys.notifications() query.
  notificationPreferences: NotificationPreferences;
  createdAt: string;
}

export interface UpdateWorkspacePayload {
  name?: string;
  description?: string | null;
  timezone?: string;
  branding?: Partial<FormBranding>;
  notificationPreferences?: Partial<NotificationPreferences>;
}

export interface NotificationPreferences {
  newResponseEmail: boolean;
  weeklyDigestEmail: boolean;
  productUpdatesEmail: boolean;
}

// Confirmed live 18 Aug 2026: the backend sends a structured object (city/region/country from
// IP geolocation), not a string — `{}` specifically for an unresolved IP (e.g. private/local
// ranges), not null. The api-reference.md `string | null` shape was wrong; see SessionRow's
// formatApproxLocation for the fallback that only shows "Unknown location" once every field is
// actually missing, rather than discarding real resolved locations along with unresolved ones.
export interface ApproxLocation {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface SessionSummary {
  id: string;
  deviceLabel: string; // e.g. "Chrome on Windows" — backend-computed
  approxLocation: ApproxLocation | null;
  lastActiveAt: string; // ISO 8601
  isCurrent: boolean;
}

// Job-id-then-poll pattern, same convention as Sprint 5's Reports (`ReportStatus`).
// `POST /api/workspaces/current/export` returns `202 { exportJob: { id, status, expiresAt } }`;
// `GET /api/workspaces/current/export/status?jobId=` polls this shape until `completed`/`failed`;
// `GET /api/workspaces/current/export/file?jobId=` then streams the file.
export interface WorkspaceExportJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  expiresAt: string; // ISO 8601
}
