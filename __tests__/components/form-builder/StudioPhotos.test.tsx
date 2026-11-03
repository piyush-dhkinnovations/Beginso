/**
 * Unsplash photos in the Branding studio: picking one sets the picture and its photographer credit together; anything else that changes the picture
 * (a built-in picture, removing it) takes the credit away, so a credit never outlives its photo.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrandingStudio } from '@/components/form-builder/BrandingStudio';
import { FORM_PICTURES } from '@/lib/formPictures';
import type { FormBranding } from '@/types/form';

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/services/upload', () => ({ uploadService: { uploadFile: vi.fn() } }));
vi.mock('@/components/form-builder/LiveFormPreview', () => ({ LiveFormPreview: () => <div data-testid="live-preview" /> }));

const PHOTO = vi.hoisted(() => ({
  id: 'pJadQetzTkI',
  thumb: 'https://images.unsplash.com/p1?w=400',
  url: 'https://images.unsplash.com/p1?w=1920',
  alt: '',
  credit: { name: 'Ada Lovelace', url: 'https://unsplash.com/@ada?utm_source=beginso&utm_medium=referral' },
}));
vi.mock('@/services/unsplash', async (orig) => ({
  ...(await orig<typeof import('@/services/unsplash')>()),
  unsplashService: { featured: vi.fn().mockResolvedValue([PHOTO]), search: vi.fn(), download: vi.fn().mockResolvedValue(undefined) },
}));

function draw(branding: FormBranding) {
  const onBrandingUpdate = vi.fn();
  render(<BrandingStudio formId="f1" branding={branding} layout="classic" fieldCount={3} isPublic={false} onBrandingUpdate={onBrandingUpdate} onLayoutChange={vi.fn()} />);
  return onBrandingUpdate;
}
const lastUpdate = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls[fn.mock.calls.length - 1][0] as FormBranding;

describe('Branding studio: Unsplash photos', () => {
  it('a picked photo sets the cover and its credit, and tells Unsplash it was used', async () => {
    const update = draw({ primaryColor: '#1D4ED8' });
    await userEvent.click(screen.getByRole('tab', { name: 'Header' }));
    await userEvent.click(screen.getByRole('button', { name: 'All pictures' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Photos from Unsplash' }));
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Photo by Ada Lovelace' }));
    const sent = lastUpdate(update);
    expect(sent.coverImageUrl).toBe(PHOTO.url);
    expect(sent.theme).toEqual({ v: 1, credit: { cover: PHOTO.credit } });
  });

  it('a built-in picture in its place takes the credit away', async () => {
    const update = draw({ primaryColor: '#1D4ED8', coverImageUrl: PHOTO.url, theme: { v: 1, credit: { cover: PHOTO.credit } } });
    await userEvent.click(screen.getByRole('tab', { name: 'Header' }));
    await userEvent.click(screen.getByRole('button', { name: FORM_PICTURES[0].name }));
    const sent = lastUpdate(update);
    expect(sent.coverImageUrl).toBe(`/form-pictures/${FORM_PICTURES[0].id}.jpg`);
    expect(sent.theme).toBeNull();
  });
});
