/**
 * Looks in the studio: the Looks box opens the dialog, a chosen look is applied to the layout and the look settings only, and Undo puts back exactly
 * what was there (including the form's own logo and text, which are never touched).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrandingStudio } from '@/components/form-builder/BrandingStudio';
import { currentLook, GALLERY_STYLES } from '@/lib/formStyles';
import type { FormBranding } from '@/types/form';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/services/upload', () => ({ uploadService: { uploadFile: vi.fn() } }));
vi.mock('@/services/formStyles', () => ({ formStylesService: { list: vi.fn().mockResolvedValue([]), save: vi.fn(), rename: vi.fn(), remove: vi.fn() } }));
vi.mock('@/components/form-builder/LiveFormPreview', () => ({ LiveFormPreview: () => <div data-testid="live-preview" /> }));

const BRANDING: FormBranding = { primaryColor: '#16A34A', fontFamily: 'lora', cardStyle: 'bordered', logoUrl: '/api/upload/file/u/f/logo.png', bannerText: 'Takes two minutes', theme: { v: 1, fields: { style: 'filled' } } };

beforeEach(() => toast.mockClear());

function draw(over: Partial<React.ComponentProps<typeof BrandingStudio>> = {}) {
  const onBrandingUpdate = vi.fn();
  const onLayoutChange = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BrandingStudio formId="f1" branding={BRANDING} layout="steps" fieldCount={3} isPublic={false} onBrandingUpdate={onBrandingUpdate} onLayoutChange={onLayoutChange} styleScope="acme" {...over} />
    </QueryClientProvider>,
  );
  return { onBrandingUpdate, onLayoutChange };
}

describe('Looks in the studio', () => {
  it('has one box on every section that opens the dialog', async () => {
    draw();
    await userEvent.click(screen.getByRole('button', { name: /Looks/ }));
    expect(screen.getByRole('dialog', { name: 'Looks' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'My styles' })).toBeInTheDocument();
  });

  it('applies a look: the layout, the look settings (cleared where the look says nothing), and never the logo or the text', async () => {
    const { onBrandingUpdate, onLayoutChange } = draw();
    await userEvent.click(screen.getByRole('button', { name: /Looks/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Use the Midnight look' }));
    const midnight = GALLERY_STYLES.find((g) => g.id === 'midnight')!;
    expect(onLayoutChange).toHaveBeenCalledWith('card_stack');
    const updates = onBrandingUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates).toMatchObject({ primaryColor: '#8AB4FF', fontFamily: 'manrope', backgroundImageUrl: '/form-pictures/midnight-glow.jpg', theme: midnight.branding.theme });
    expect(updates).toHaveProperty('buttonStyle', undefined);
    for (const k of ['logoUrl', 'bannerText', 'bannerLinks', 'iconName']) expect(updates).not.toHaveProperty(k);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('says so with an Undo, and Undo puts back the layout and every look setting exactly', async () => {
    const { onBrandingUpdate, onLayoutChange } = draw();
    await userEvent.click(screen.getByRole('button', { name: /Looks/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Use the Playful look' }));
    expect(toast).toHaveBeenCalledWith('Playful look applied.', 'success', undefined, expect.objectContaining({ label: 'Undo' }));
    onLayoutChange.mockClear();
    onBrandingUpdate.mockClear();
    toast.mock.calls[0][3].onClick();
    expect(onLayoutChange).toHaveBeenCalledWith('steps');
    expect(onBrandingUpdate).toHaveBeenCalledWith(currentLook(BRANDING));
  });

  it('offers only the ready-made looks when there is nowhere to keep saved ones', async () => {
    draw({ styleScope: undefined });
    await userEvent.click(screen.getByRole('button', { name: /Looks/ }));
    expect(screen.queryByRole('tab', { name: 'My styles' })).not.toBeInTheDocument();
  });
});
