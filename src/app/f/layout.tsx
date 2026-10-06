import type { ReactNode } from 'react';
import { FormThemeScope } from '@/components/public-form/FormThemeScope';
import { EmbedBridge } from '@/components/public-form/EmbedBridge';

// Sprint 13 (CF2.11): every /f/* page — the form, its success page and the unavailable/error cards —
// renders in the form's own light theme, never the respondent's OS dark theme. EmbedBridge only acts when the
// page is framed with ?embed=1 (it reports the page height to the embedder).
export default function PublicFormLayout({ children }: { children: ReactNode }) {
  return (
    <FormThemeScope>
      <EmbedBridge />
      {children}
    </FormThemeScope>
  );
}
