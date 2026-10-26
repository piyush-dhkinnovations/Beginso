'use client';

import { useParams } from 'next/navigation';
import { ChartWizard } from '@/components/analytics/builder/ChartWizard';

// Full page, no form header: the wizard has its own header and stepper.
export default function NewChartPage() {
  const { id: formId } = useParams<{ id: string }>();
  return <ChartWizard formId={formId} />;
}
