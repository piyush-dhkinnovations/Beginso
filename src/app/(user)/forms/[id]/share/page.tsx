import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

// Share & Embed is the editor's fourth tab now. Old links and bookmarks land there.
export default async function ShareRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/forms/${id}/edit?tab=share`);
}
