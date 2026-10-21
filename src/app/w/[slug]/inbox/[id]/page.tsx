'use client';

import { useParams } from 'next/navigation';
import { ResponseDetailView } from '@/components/responses/ResponseDetailView';

/**
 * Full-page response view for a workspace inbox.
 * The shell is WorkspaceShell (provided by /w/[slug]/layout.tsx), so the sidebar
 * shows the workspace navigation — the same as the drawer that was open before expand.
 * Scope is the slug from the URL, not a ?scope= query param: the layout and the data
 * scope are always the same workspace.
 */
export default function WorkspaceResponseDetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  return <ResponseDetailView id={id} scope={slug} />;
}
