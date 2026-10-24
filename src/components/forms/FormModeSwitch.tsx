'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Segmented } from '@/components/ui/Segmented';

const MODES = [
  { id: 'insights', label: 'Summary' },
  { id: 'inbox', label: 'Responses' },
];

/**
 * The Summary / Responses switch of a form's data pages. It sits in the form header on Summary, and on the Responses page it sits on
 * the line of the stage tabs (beside the saved views), so the header keeps only the form's own actions.
 */
export function FormModeSwitch({ formId, ws }: { formId: string; ws: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const mode = pathname.replace(/\/$/, '').endsWith('/insights') ? 'insights' : 'inbox';
  const q = ws ? `?ws=${encodeURIComponent(ws)}` : '';
  return <Segmented options={MODES} value={mode} onChange={(id) => router.push(`/forms/${formId}/${id}${q}`)} ariaLabel="Form data view" />;
}
