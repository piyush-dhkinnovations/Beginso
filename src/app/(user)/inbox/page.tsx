'use client';

import { useSearchParams } from 'next/navigation';
import { ResponsesHubView } from '@/components/responses/ResponsesHubView';

export default function AllResponsesPage() {
  // A chart drill-down link names its form (?formId=) so the chip can resolve the field's label.
  const formId = useSearchParams().get('formId') ?? undefined;
  return <ResponsesHubView formId={formId} />;
}
