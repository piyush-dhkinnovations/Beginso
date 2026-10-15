'use client';

import { useEffect, useState } from 'react';
import { PublicFormShell } from '@/components/public-form/PublicFormShell';
import { FormThemeScope } from '@/components/public-form/FormThemeScope';
import type { PublicFormSchema } from '@/types/publicForm';

// The iframe document behind every guest preview. The parent (GuestPreviewFrame) posts the schema in over
// postMessage (same origin only), so nothing about the draft touches the server.
export default function GuestPreviewPage() {
  const [schema, setSchema] = useState<PublicFormSchema | null>(null);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === 'beginso-guest-schema') setSchema(e.data.schema);
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: 'beginso-guest-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!schema) return null;
  return (
    <FormThemeScope>
      {/* The document itself must never scroll or show a bar: the fixed box below is the single scroll area. */}
      <style>{'html,body{overflow:hidden;scrollbar-width:none}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}'}</style>
      {/* One scroll area that fills the frame; its scrollbar is hidden so it cannot leave a blank strip (wheel, touch and keys still scroll). */}
      <div className="fixed inset-0 z-50 overflow-y-auto bg-(--bg-subtle) [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <PublicFormShell schema={schema} slug="preview" previewMode />
      </div>
    </FormThemeScope>
  );
}
