'use client';

import { useParams } from 'next/navigation';
import { AnalyticsView } from '@/components/analytics/AnalyticsView';

export default function FormAnalyticsPage() {
  const { id: formId } = useParams<{ id: string }>();
  return <AnalyticsView formId={formId} />;
}
