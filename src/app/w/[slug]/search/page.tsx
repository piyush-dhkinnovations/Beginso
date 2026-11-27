import { SearchResultsView } from '@/components/search/SearchResultsView';

interface Props {
  params: Promise<{ slug: string }>;
}

// Full-page search inside one workspace. Never cross-workspace.
export default async function WorkspaceSearchPage({ params }: Props) {
  const { slug } = await params;
  return <SearchResultsView scope={slug} />;
}
