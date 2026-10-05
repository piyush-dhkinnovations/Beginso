import TemplatesPage from '@/app/(user)/templates/page';

interface Props {
  params: Promise<{ slug: string }>;
}

// Sprint 13 (B6.1–B6.3): the workspace's own templates first, then Beginso's. Reuses the personal page with
// `scope` set to the workspace slug, the same way /w/[slug]/forms reuses FormsPage.
export default async function WorkspaceTemplatesPage({ params }: Props) {
  const { slug } = await params;
  return <TemplatesPage scope={slug} />;
}
