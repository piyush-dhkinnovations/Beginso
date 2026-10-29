/* eslint-disable @next/next/no-img-element -- arbitrary backend-served upload URLs, same tradeoff as FormBanner (no remotePatterns configured). */
import { FormIcon } from '@/components/forms/FormIcon';
import { getFormIcon } from '@/lib/formIcons';
import type { PublicFormBranding } from '@/types/publicForm';
import { uploadSrc } from '@/lib/uploadSrc';

/** True when the form has a logo or an icon of its own to show. */
export const hasBrandMark = (b: Pick<PublicFormBranding, 'logoUrl' | 'iconName'>) => !!b.logoUrl || !!getFormIcon(b.iconName);

/** The form's logo, or else its chosen icon, at `size` px. `className` styles the logo image (the icon is its own rounded tile). */
export function BrandMark({ branding, size, className = '' }: { branding: PublicFormBranding; size: number; className?: string }) {
  if (branding.logoUrl) return <img src={uploadSrc(branding.logoUrl)} alt="" className={className} style={{ width: size, height: size }} />;
  return <FormIcon name={branding.iconName} size={size} />;
}
