'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { ScoreComparison } from '@/components/scoring/ScoreComparison';

// Sprint 12 (inbox-collaboration), tasks.md 5.2 — OQ-7 resolved 3 Oct 2026. Placement judgment
// call: design.md §15 names only the component ("comparison as a `ui/Table`"), not a route. This
// mirrors the existing `/forms/[id]/insights` flat-route pattern (one page per form, reachable
// from Form Overview) rather than inventing a new nav surface.
export default function FormScoresPage() {
  const { id: formId } = useParams<{ id: string }>();
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <PageHeader title="Score comparison" />
      <ScoreComparison formId={formId} />
    </div>
  );
}
