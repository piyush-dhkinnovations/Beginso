import Link from 'next/link';
import { FolderX } from 'lucide-react';
import { EmptyState } from '@/components/ui';

// Segment-level not-found for /w/[slug] — rendered when the layout there calls notFound()
// for a slug the backend confirmed doesn't exist (see workspaceServer.ts's
// resolveWorkspaceBySlug(), status 404 only). Next.js's not-found.tsx files don't receive
// route params (see node_modules/next/dist/docs/.../not-found.md — "do not accept any
// props"), so this can't name the slug, but it can say something truer than the generic
// root 404: this specific class of failure is "this workspace" rather than "this page".
export default function WorkspaceNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <EmptyState illustration="not-found"
        icon={<FolderX className="bg-icon" aria-hidden="true" />}
        title="Workspace not found"
        description="This workspace doesn't exist, or you no longer have access to it."
        actions={
          <Link href="/workspaces" className="bg-btn bg-btn-primary">
            Switch Workspace
          </Link>
        }
      />
    </div>
  );
}
