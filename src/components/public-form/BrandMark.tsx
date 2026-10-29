/* eslint-disable @next/next/no-img-element -- arbitrary backend-served upload URLs, same tradeoff as FormBanner (no remotePatterns configured). */
import { FormIcon } from '@/components/forms/FormIcon';
import { getFormIcon } from '@/lib/formIcons';
import type { PublicFormBranding } from '@/types/publicForm';
import { uploadSrc } from '@/lib/uploadSrc';

/** The logo's width and height in px for each size the owner can choose (Header section of the Branding tab). */
export const LOGO_PX = { sm: 32, md: 48, lg: 72 } as const;
/** Corner radius for a logo of `size` px: 32px gets 4px, 48px gets 8px (twice the small one), 72px gets 14px. */
export const logoRadius = (size: number): number => Math.max(3, Math.round((size - 16) / 4));
export const logoPx = (b: Pick<PublicFormBranding, 'logoSize'>): number => LOGO_PX[b.logoSize ?? 'md'];

/** True when the form has a logo or an icon of its own to show. */
export const hasBrandMark = (b: Pick<PublicFormBranding, 'logoUrl' | 'iconName'>) => !!b.logoUrl || !!getFormIcon(b.iconName);

/** The form's logo, or else its chosen icon, at `size` px. `className` styles the logo image (the icon is its own rounded tile). */
export function BrandMark({ branding, size, className = '' }: { branding: PublicFormBranding; size: number; className?: string }) {
  // The corners are a share of the logo's own size (a small logo gets small corners, a large one larger), never a fixed radius that
  // turns a small picture into a blob.
  if (branding.logoUrl) return <img src={uploadSrc(branding.logoUrl)} alt="" className={className} style={{ width: size, height: size, borderRadius: logoRadius(size) }} />;
  return <FormIcon name={branding.iconName} size={size} />;
}
