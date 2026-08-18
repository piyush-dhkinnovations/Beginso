import axiosInstance from '@/lib/axios';
import type { AppNotification } from '@/types/notification';

// Confirmed live 17 Aug 2026 per a direct backend report (commit a7a5185,
// Onboarding-backend.git) — GET /api/notifications (newest first, capped at 50) and
// POST /api/notifications/:id/read (PATCH also accepted server-side; POST used here for
// consistency with this codebase's other action-style calls, e.g. notifyPasswordChanged).
// Response envelope not independently verified live — `?? []` guards against a shape mismatch
// the same class of bug that hit /api/users/me earlier this sprint (see settings.ts's
// unwrapEnvelope comment) rather than assuming the documented shape is exactly right.
export const notificationsService = {
  getNotifications: (): Promise<AppNotification[]> =>
    axiosInstance.get('/api/notifications').then((r) => r.data?.notifications ?? []),

  markAsRead: (id: string): Promise<void> =>
    axiosInstance.post(`/api/notifications/${id}/read`).then(() => undefined),
};
