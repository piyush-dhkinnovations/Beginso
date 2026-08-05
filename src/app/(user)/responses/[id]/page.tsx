'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { responsesService } from '@/services/responses';
import { responseKeys } from '@/lib/queryKeys';

/**
 * Legacy standalone detail route — superseded by the ResponseDrawer on the Hub page
 * (`/forms/[id]/responses?responseId=`). Kept only to redirect old bookmarked/shared links
 * instead of 404ing them.
 */
export default function LegacyResponseDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formIdFromQuery = searchParams.get('formId');

  const { data: response, isError } = useQuery({
    queryKey: responseKeys.detail(id),
    queryFn: () => responsesService.getResponseById(id),
    enabled: !!id && !formIdFromQuery,
  });

  const formId = formIdFromQuery ?? response?.formId;

  useEffect(() => {
    if (formId) router.replace(`/forms/${formId}/responses?responseId=${id}`);
  }, [formId, id, router]);

  useEffect(() => {
    if (isError) router.push('/forms');
  }, [isError, router]);

  return <LoadingSpinner variant="overlay" />;
}
