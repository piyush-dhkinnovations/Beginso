import { AlertTriangle } from 'lucide-react';
import { ButtonLink, EmptyState } from '@/components/ui';

// The 'error' half of resolveWorkspaceBySlug()'s result — a lookup that failed for a reason
// that says nothing about whether the workspace exists (network error, 401/500 from the
// backend, unexpected response shape). Distinct from both the 404 case (confirmed nonexistent,
// uses notFound()) and the 403 case (WorkspaceAccessDenied) — this one is describable as
// "try again", not "this workspace is gone" or "you don't belong here", since it may well
// resolve on a reload.
export function WorkspaceLoadError() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <EmptyState illustration="error"
        icon={<AlertTriangle className="bg-icon" aria-hidden="true" />}
        title="Couldn't load this workspace"
        description="Something went wrong reaching the server. Please try again."
        actions={
          <ButtonLink href="/dashboard">
            Go to Personal Home
          </ButtonLink>
        }
      />
    </div>
  );
}
