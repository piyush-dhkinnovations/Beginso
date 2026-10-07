import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ws?: string | string[] }>;
}

// Share & Embed is the editor's fourth tab now. Old links and bookmarks land there, keeping the
// workspace hint (?ws=) so the workspace sidebar and scope survive the redirect.
export default async function ShareRedirectPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { ws } = await searchParams;
  const slug = Array.isArray(ws) ? ws[0] : ws;
  const query = new URLSearchParams({ tab: 'share', ...(slug ? { ws: slug } : {}) });
  redirect(`/forms/${id}/edit?${query.toString()}`);
}
