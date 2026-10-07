import { NotificationsView } from '@/components/notifications/NotificationsView';

interface Props {
  params: Promise<{ slug: string }>;
}

// Sprint 14 (B9.1/B9.3): this workspace's notifications only. Membership is gated by w/[slug]/layout.tsx.
export default async function WorkspaceNotificationsPage({ params }: Props) {
  const { slug } = await params;
  return <NotificationsView scope={slug} />;
}
