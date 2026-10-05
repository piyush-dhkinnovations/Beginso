import type { ReactNode } from 'react';
import { FormThemeScope } from '@/components/public-form/FormThemeScope';

// Sprint 13 (CF2.11): every /f/* page — the form, its success page and the unavailable/error cards —
// renders in the form's own light theme, never the respondent's OS dark theme.
export default function PublicFormLayout({ children }: { children: ReactNode }) {
  return <FormThemeScope>{children}</FormThemeScope>;
}
