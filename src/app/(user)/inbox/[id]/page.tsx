'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { ResponseDetailView } from '@/components/responses/ResponseDetailView';

/**
 * Full-page response view for the personal inbox and legacy links.
 * Scope comes from ?scope= because the URL itself carries no workspace slug —
 * the shell here is always PersonalShell. Workspace responses that arrive via an
 * old link with ?scope=<slug> will still load correctly (data works), but the
 * sidebar will show Personal rather than the workspace: those links should be
 * /w/[slug]/inbox/[id] going forward (see expandResponse in useResponseRouting).
 */
export default function ResponseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const scope = searchParams.get('scope') ?? 'personal';
  return <ResponseDetailView id={id} scope={scope} />;
}
