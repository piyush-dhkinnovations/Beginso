import { ShieldAlert } from 'lucide-react';
import { ButtonLink, EmptyState } from '@/components/ui';

// The 403 half of the route-level boundary — the workspace exists but the
// caller has no membership in it. Distinct from the 404 case (slug doesn't resolve at all, which
// uses next/navigation's notFound() instead), and rendered before AppShell mounts so there's no
// flash of a shell around an access-denied message.
//
// A styled Link, not <Button asChild>{<Link>}</Button> — ui/Button always renders a real
// <button>, and nesting an <a> inside one is invalid HTML (the exact class of bug
// already found once, in Menu's trigger — not repeating it here).
export function WorkspaceAccessDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <EmptyState illustration="no-access"
        icon={<ShieldAlert className="bg-icon" aria-hidden="true" />}
        title="You don't have access to this workspace"
        description="Ask a member to invite you, or switch to a workspace you already belong to."
        actions={
          <ButtonLink href="/dashboard">
            Go to Personal Home
          </ButtonLink>
        }
      />
    </div>
  );
}
