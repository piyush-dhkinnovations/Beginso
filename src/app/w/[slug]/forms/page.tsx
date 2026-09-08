import FormsPage from '@/app/(user)/forms/page';

interface Props {
  params: Promise<{ slug: string }>;
}

// Wireframe Screen 07: Workspace Forms Manager (requirements.md §7.8, §1.8, §1.10).
// Reuses FormsPage with context={type: 'workspace', workspaceId: slug}, ensuring forms
// are properly scoped to the workspace context.
export default async function WorkspaceFormsPage({ params }: Props) {
  const { slug } = await params;
  return <FormsPage context={{ type: 'workspace', workspaceId: slug }} />;
}
