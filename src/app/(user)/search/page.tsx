import { SearchResultsView } from '@/components/search/SearchResultsView';

// Full-page search in personal state - personal forms, shared with you, My Submissions.
export default function PersonalSearchPage() {
  return <SearchResultsView scope="personal" />;
}
