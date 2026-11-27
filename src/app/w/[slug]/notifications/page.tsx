import { NotificationsView } from '@/components/notifications/NotificationsView';

interface Props {
  params: Promise<{ slug: string }>;
}

// This workspace's notifications only. Membership is gated by w/[slug]/layout.tsx.
export default async function WorkspaceNotificationsPage({ params }: Props) {
  const { slug } = await params;
  return <NotificationsView scope={slug} />;
}
