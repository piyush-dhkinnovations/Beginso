import { WorkspaceRoleGate } from '@/components/workspaces/WorkspaceRoleGate';
import { TrashView } from '@/components/trash/TrashView';

interface Props {
  params: Promise<{ slug: string }>;
}

// Workspace Trash. The server decides who may see and act on each item.
export default async function WorkspaceTrashPage({ params }: Props) {
  const { slug } = await params;
  return (
    <WorkspaceRoleGate slug={slug} allow="trash" title="Trash">
      <TrashView scope={slug} />
    </WorkspaceRoleGate>
  );
}
