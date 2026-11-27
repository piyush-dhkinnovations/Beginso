import { NotificationsView } from '@/components/notifications/NotificationsView';

// Personal-state notifications. Not a sidebar item - reached from the bell's "View all".
export default function PersonalNotificationsPage() {
  return <NotificationsView scope="personal" />;
}
