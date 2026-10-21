import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { FormThemeScope } from '@/components/public-form/FormThemeScope';

// The page behind the button in the "confirm your email" message a respondent gets on a form that asks for their email: public,
// token-authenticated, never indexed, in the light public theme. Referrer-Policy: no-referrer is set for it in next.config.ts.
export const metadata: Metadata = { title: 'Confirm your email', robots: { index: false, follow: false } };

export default function ConfirmEmailLayout({ children }: { children: ReactNode }) {
  return <FormThemeScope>{children}</FormThemeScope>;
}
