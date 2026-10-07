import { NotificationsView } from '@/components/notifications/NotificationsView';

// Sprint 14 (B9.1): personal-state notifications. Not a sidebar item - reached from the bell's "View all".
export default function PersonalNotificationsPage() {
  return <NotificationsView scope="personal" />;
}
