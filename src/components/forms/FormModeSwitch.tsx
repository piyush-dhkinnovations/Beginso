'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Segmented } from '@/components/ui/Segmented';

const MODES = [
  { id: 'insights', label: 'Insights' },
  { id: 'inbox', label: 'Responses' },
];

/**
 * The Insights / Responses switch of a form's data pages: the first control of the header's second row on both pages. (Insights is the
 * page of charts and graphs; it carries the same name as the sidebar's Insights and the address /insights.)
 */
export function FormModeSwitch({ formId, ws }: { formId: string; ws: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const mode = pathname.replace(/\/$/, '').endsWith('/insights') ? 'insights' : 'inbox';
  const q = ws ? `?ws=${encodeURIComponent(ws)}` : '';
  return <Segmented options={MODES} value={mode} onChange={(id) => router.push(`/forms/${formId}/${id}${q}`)} ariaLabel="Form data view" />;
}
