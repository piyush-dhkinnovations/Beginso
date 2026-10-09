import { ResponsesLanding } from '@/components/responses/ResponsesLanding';

export const metadata = { title: 'Responses' };

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function WorkspaceResponsesPage({ params }: Props) {
  const { slug } = await params;
  return <ResponsesLanding scope={slug} />;
}
