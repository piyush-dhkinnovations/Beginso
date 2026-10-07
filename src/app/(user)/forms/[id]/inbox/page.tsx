'use client';

import { useParams } from 'next/navigation';
import { useFormScope } from '@/hooks/useFormScope';
import { Skeleton } from '@/components/ui/Skeleton';
import { ResponsesHubView } from '@/components/responses/ResponsesHubView';

export default function ResponsesHubPage() {
  const { id: formId } = useParams<{ id: string }>();
  const scope = useFormScope(formId);
  if (!scope) return <Skeleton variant="block" height={240} className="rounded-lg" />;
  return <ResponsesHubView formId={formId} scope={scope} />;
}
