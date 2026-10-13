import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrandingTabContent } from '@/components/form-builder/BrandingTabContent';
import { LAYOUT_LOOKS } from '@/lib/layoutPresets';
import type { FormBranding } from '@/types/form';

// BrandingPanel is exercised on its own; here it is a probe that shows what it was given.
vi.mock('@/components/form-builder/BrandingPanel', () => ({
  BrandingPanel: ({ layout, formTitle, branding, onUpdate }: { layout: string; formTitle: string; branding: FormBranding; onUpdate: (u: Partial<FormBranding>) => void }) => (
    <div data-testid="branding-panel">
      {layout}|{formTitle}|{branding.primaryColor}
      <button onClick={() => onUpdate({ primaryColor: '#000000' })}>edit-colour</button>
    </div>
  ),
}));

function setup(over: Partial<React.ComponentProps<typeof BrandingTabContent>> = {}) {
  const onBrandingUpdate = vi.fn();
  const onLayoutChange = vi.fn();
  render(
    <BrandingTabContent
      formId="f1"
      formTitle="Survey"
      branding={{ primaryColor: '#1D4ED8' }}
      settings={{ honeypotEnabled: true }}
      fieldCount={2}
      isPublic={false}
      onBrandingUpdate={onBrandingUpdate}
      onLayoutChange={onLayoutChange}
      {...over}
    />
  );
  return { onBrandingUpdate, onLayoutChange };
}

describe('BrandingTabContent', () => {
  it('opens on step 1, the layout gallery, with no branding controls', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Choose a layout' })).toBeInTheDocument();
    expect(screen.queryByTestId('branding-panel')).not.toBeInTheDocument();
  });

  it('always tells small screens that detailed branding needs a larger one', () => {
    setup();
    expect(screen.getByText('Detailed branding needs a larger screen')).toBeInTheDocument();
  });

  it('using a layout sets the layout and applies that preset\'s look to the branding', async () => {
    const { onLayoutChange, onBrandingUpdate } = setup();
    const card = screen.getByRole('heading', { name: 'Guided' }).closest('article') as HTMLElement;
    await userEvent.click(within(card).getByRole('button', { name: 'Use this layout' }));
    expect(onLayoutChange).toHaveBeenCalledWith('guided');
    expect(onBrandingUpdate).toHaveBeenCalledWith(expect.objectContaining({ fontFamily: LAYOUT_LOOKS.guided.font, cardStyle: LAYOUT_LOOKS.guided.cardStyle, primaryColor: LAYOUT_LOOKS.guided.color }));
  });

  it('keeps an owner-picked colour when switching layout', async () => {
    const { onBrandingUpdate } = setup({ branding: { primaryColor: '#123ABC' } });
    const card = screen.getByRole('heading', { name: 'Guided' }).closest('article') as HTMLElement;
    await userEvent.click(within(card).getByRole('button', { name: 'Use this layout' }));
    expect(onBrandingUpdate.mock.calls[0][0]).not.toHaveProperty('primaryColor');
  });

  it('Skip moves to step 2 and passes the active preset to the branding panel', async () => {
    setup({ settings: { honeypotEnabled: true, layout: 'steps' } });
    await userEvent.click(screen.getByRole('button', { name: /Skip — customise manually/ }));
    expect(screen.getByTestId('branding-panel')).toHaveTextContent('steps|Survey|#1D4ED8');
    expect(screen.getByText(/Step 2 of 2/)).toHaveTextContent('customising Steps');
  });

  it('edits made in step 2 are forwarded', async () => {
    const { onBrandingUpdate } = setup();
    await userEvent.click(screen.getByRole('button', { name: /Skip — customise manually/ }));
    await userEvent.click(screen.getByText('edit-colour'));
    expect(onBrandingUpdate).toHaveBeenCalledWith({ primaryColor: '#000000' });
  });

  it('"Change layout" returns to step 1', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /Skip — customise manually/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Change layout' }));
    expect(screen.queryByTestId('branding-panel')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Choose a layout' }).closest('div[class]')?.parentElement?.parentElement).not.toHaveClass('lg:hidden');
  });

  it('while on step 2 the gallery is hidden on desktop (lg:hidden) but still in the DOM for small screens', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /Skip — customise manually/ }));
    const gallery = screen.getByRole('heading', { name: 'Choose a layout' }).closest('.lg\\:hidden');
    expect(gallery).not.toBeNull();
  });

  it('an unknown stored layout falls back to Classic for step 2', async () => {
    setup({ settings: { honeypotEnabled: true, layout: 'nonsense' as never } });
    await userEvent.click(screen.getByRole('button', { name: /Skip — customise manually/ }));
    expect(screen.getByTestId('branding-panel')).toHaveTextContent(/^classic\|/);
  });
});
