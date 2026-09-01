'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ResponseDrawer } from '@/components/responses/ResponseDrawer';
import { formsService } from '@/services/forms';

/** Full-page response view opened from the expand action in ResponseDrawer. */
export default function ResponseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = searchParams.get('formId') ?? undefined;
  const returnTo = searchParams.get('returnTo');

  const { data: form } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => formsService.getFormById(formId as string),
    enabled: !!formId,
  });

  const fileFieldLabels = (form?.fields ?? [])
    .filter((field) => field.type === 'file_upload' && !field.deleted)
    .sort((a, b) => a.order - b.order)
    .map((field) => field.label);

  const fallbackDrawerUrl = formId
    ? `/forms/${formId}/responses?responseId=${id}`
    : `/responses?responseId=${id}`;
  const returnToParams = returnTo?.includes('?')
    ? new URLSearchParams(returnTo.slice(returnTo.indexOf('?') + 1))
    : null;
  const isSafeDrawerUrl = !!returnTo
    && (returnTo.startsWith('/responses?') || /^\/forms\/[^/]+\/responses\?/.test(returnTo))
    && returnToParams?.get('responseId') === id;
  const drawerUrl = isSafeDrawerUrl ? returnTo : fallbackDrawerUrl;

  return (
    <ResponseDrawer
      responseId={id}
      formId={formId}
      formTitle={form?.title}
      fileFieldLabels={fileFieldLabels}
      displayMode="page"
      collapseHref={drawerUrl}
      onClose={() => router.replace(drawerUrl)}
    />
  );
}
