'use client';

import type { PublicFormSchema } from '@/types/publicForm';
import { FormBanner } from './FormBanner';

interface PublicFormShellProps {
  schema: PublicFormSchema;
  slug: string;
}

/**
 * Day 2 placeholder — proves the SSR → schema → render pipeline works end to
 * end against the mock fixtures. Field renderers (Thu), RHF/logic-engine
 * wiring, page navigation, and submission (Fri) replace this body without
 * changing the component's props contract.
 */
export function PublicFormShell({ schema }: PublicFormShellProps) {
  const firstPage = schema.pages[0];

  return (
    <div className="min-h-screen bg-neutral-50 flex justify-center p-4">
      <div className="bg-white rounded-xl border border-neutral-200 shadow-card max-w-[520px] w-full overflow-hidden">
        <FormBanner branding={schema.branding} />
        <div className={schema.branding.logoUrl ? 'p-6 pt-8' : 'p-6'}>
          <h1 className="text-display text-neutral-900">
            {firstPage?.title ?? schema.title}
          </h1>
          {firstPage?.description && (
            <p className="text-body text-neutral-500 mt-1">{firstPage.description}</p>
          )}
          <ul className="mt-6 space-y-2">
            {schema.fields
              .filter((f) => f.pageId === firstPage?.id && !f.deleted)
              .map((f) => (
                <li key={f.fieldId} className="text-body text-neutral-800">
                  {f.label}
                  {f.required && <span className="text-error"> *</span>}
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
