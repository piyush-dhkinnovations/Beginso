import { WorkspaceRoleGate } from '@/components/workspaces/WorkspaceRoleGate';
import { canRestoreResponse } from '@/lib/roles';
import { TrashView } from '@/components/trash/TrashView';

interface Props {
  params: Promise<{ slug: string }>;
}

// Sprint 13 (CF5.5): workspace Trash. The server decides who may see and act on each item.
export default async function WorkspaceTrashPage({ params }: Props) {
  const { slug } = await params;
  return (
    <WorkspaceRoleGate slug={slug} allow={canRestoreResponse} title="Trash">
      <TrashView scope={slug} />
    </WorkspaceRoleGate>
  );
}
