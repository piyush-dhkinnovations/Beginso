'use client';

import { useParams } from 'next/navigation';
import { ResponsesHubView } from '@/components/responses/ResponsesHubView';

export default function ResponsesHubPage() {
  const { id: formId } = useParams<{ id: string }>();
  return <ResponsesHubView formId={formId} />;
}
