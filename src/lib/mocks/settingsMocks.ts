/**
 * Mock fixtures for Settings (Sprint 6) — `__tests__/` fixtures only, matching
 * `analyticsMocks.ts`/`reportsMocks.ts`. Runtime code builds directly against the confirmed-live
 * backend (see docs/backend-contract/api-reference.md §4 Settings), not these fixtures.
 */

import type { UserProfile, WorkspaceSettings, NotificationPreferences, SessionSummary } from '@/types/settings';

export function mockUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    name: 'Jordan Rivera',
    email: 'jordan@example.com',
    avatarUrl: null,
    role: 'admin',
    status: 'active',
    emailVerified: true,
    createdAt: '2026-06-01T09:00:00.000Z',
    lastLoginAt: '2026-08-17T08:30:00.000Z',
    ...overrides,
  };
}

export function mockNotificationPreferences(
  overrides: Partial<NotificationPreferences> = {}
): NotificationPreferences {
  return {
    newResponseEmail: true,
    weeklyDigestEmail: true,
    productUpdatesEmail: false,
    ...overrides,
  };
}

export function mockWorkspaceSettings(overrides: Partial<WorkspaceSettings> = {}): WorkspaceSettings {
  return {
    id: 'workspace-1',
    name: 'Acme Workspace',
    logoUrl: null,
    branding: {},
    notificationPreferences: mockNotificationPreferences(),
    createdAt: '2026-06-01T09:00:00.000Z',
    ...overrides,
  };
}

export function mockSessionsList(overrides: Partial<SessionSummary>[] = []): SessionSummary[] {
  const base: SessionSummary[] = [
    { id: 'session-1', deviceLabel: 'Chrome on Windows', approxLocation: { city: 'Mumbai', country: 'India' }, lastActiveAt: '2026-08-17T08:30:00.000Z', isCurrent: true },
    { id: 'session-2', deviceLabel: 'Safari on iPhone', approxLocation: { city: 'Mumbai', country: 'India' }, lastActiveAt: '2026-08-16T19:12:00.000Z', isCurrent: false },
    { id: 'session-3', deviceLabel: 'Firefox on macOS', approxLocation: { city: 'Pune', country: 'India' }, lastActiveAt: '2026-08-14T11:05:00.000Z', isCurrent: false },
  ];
  if (overrides.length === 0) return base;
  return base.map((session, i) => ({ ...session, ...overrides[i] }));
}
