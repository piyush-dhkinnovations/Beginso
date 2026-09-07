import { PageHeader, EmptyState } from '@/components/ui';

// Placeholder only — enough for the /w/[slug] route segment to render and for layout.tsx (task
// 4.1) to be testable end to end. The real workspace Home (task 4.2: Owner/Admin vs Reviewer
// variants, attention-driven content per B2.1-B2.3) is explicitly NOT built here — that task is
// still open in tasks.md, not to be mistaken for done because this file exists.
export default function WorkspaceHomePage() {
  return (
    <div className="p-6">
      <PageHeader title="Home" />
      <EmptyState title="Workspace Home is coming soon" description="This page is scaffolded for Sprint 8's routing work; its real content lands in a later task." />
    </div>
  );
}
