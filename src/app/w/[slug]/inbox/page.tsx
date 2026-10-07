'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { ResponsesHubView } from '@/components/responses/ResponsesHubView';

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.2 / design.md §4 (task 1.9). Resolves
 * OQ-1: the workspace Inbox sends an explicit `x-workspace-slug` scope (via `ResponsesHubView`'s
 * `scope` prop → `useInboxFilters`/`useInboxMutations` → `workspaceHeaders()`), unlike the two
 * existing personal-shell routes. `WorkspaceSidebar` gains the "Inbox" nav item in this same PR
 * (its own "never link ahead of the page" rule).
 */
export default function WorkspaceInboxPage() {
  const { slug } = useParams<{ slug: string }>();
  const formId = useSearchParams().get('formId') ?? undefined; // chart drill-down links name their form
  return <ResponsesHubView scope={slug} formId={formId} />;
}
