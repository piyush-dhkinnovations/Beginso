import type { ReactNode } from 'react';
import { brandWashLayers, brandWashStyle, effectiveTheme } from '@/lib/formTheme';
import { normaliseLayout } from '@/lib/layoutPresets';
import { bx } from '@/lib/utils';
import type { PublicFormBranding } from '@/types/publicForm';

/**
 * The page behind a form, as the form's own page draws it (public-form/layouts/shared.tsx Backdrop), for a preview that shows
 * the form in a see-through frame on top: the full-screen preview and the Branding studio. Light like the form, whatever theme
 * the app is in. The caller gives it its position and size.
 */
export function FormPageWash({ branding, layout, className, children }: { branding?: PublicFormBranding; layout?: string; className: string; children: ReactNode }) {
  const look = branding && { ...branding, theme: effectiveTheme(normaliseLayout(layout), branding.theme) };
  const layers = look && brandWashLayers(look);
  return (
    <div
      data-form-page=""
      data-theme="light"
      className={bx('isolate overflow-hidden bg-(--bg-subtle)', className)}
      style={look && { ...brandWashStyle(look), ...(layers ? { backgroundImage: 'none' } : {}), backgroundAttachment: 'scroll' }}
    >
      {layers && (
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0" style={layers.image} />
          {layers.veil && <div className="absolute inset-0" style={layers.veil} />}
        </div>
      )}
      {children}
    </div>
  );
}
