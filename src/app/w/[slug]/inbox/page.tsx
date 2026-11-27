'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { ResponsesHubView } from '@/components/responses/ResponsesHubView';

/**
 * The workspace Inbox sends an explicit `x-workspace-slug` scope (via `ResponsesHubView`'s
 * `scope` prop → `useInboxFilters`/`useInboxMutations` → `workspaceHeaders()`), unlike the
 * personal-shell routes.
 */
export default function WorkspaceInboxPage() {
  const { slug } = useParams<{ slug: string }>();
  const formId = useSearchParams().get('formId') ?? undefined; // chart drill-down links name their form
  return <ResponsesHubView scope={slug} formId={formId} />;
}
