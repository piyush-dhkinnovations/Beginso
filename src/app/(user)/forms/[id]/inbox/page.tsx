'use client';

import { useParams } from 'next/navigation';
import { useFormScope } from '@/hooks/useFormScope';
import { ResponsesBodySkeleton } from '@/components/ui/PageSkeletons';
import { ResponsesHubView } from '@/components/responses/ResponsesHubView';

export default function ResponsesHubPage() {
  const { id: formId } = useParams<{ id: string }>();
  const scope = useFormScope(formId);
  if (!scope) return <ResponsesBodySkeleton />;
  return <ResponsesHubView formId={formId} scope={scope} />;
}
