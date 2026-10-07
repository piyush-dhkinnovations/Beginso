import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { FormThemeScope } from '@/components/public-form/FormThemeScope';

// Sprint 13 (A5.4): signed-link pages are public, token-authenticated, never indexed, and render in the light
// public theme (never the admin theme). Referrer-Policy: no-referrer is set for /r/* in next.config.ts.
export const metadata: Metadata = { title: 'Your submission', robots: { index: false, follow: false } };

export default function RespondLayout({ children }: { children: ReactNode }) {
  return <FormThemeScope>{children}</FormThemeScope>;
}
