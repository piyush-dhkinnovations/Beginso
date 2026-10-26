'use client';

import { useParams } from 'next/navigation';
import { ChartWizard } from '@/components/analytics/builder/ChartWizard';

export default function EditChartPage() {
  const { id: formId, chartId } = useParams<{ id: string; chartId: string }>();
  return <ChartWizard formId={formId} chartId={chartId} />;
}
