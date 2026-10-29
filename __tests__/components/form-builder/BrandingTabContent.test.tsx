import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrandingTabContent } from '@/components/form-builder/BrandingTabContent';
import { LAYOUT_LOOKS } from '@/lib/layoutPresets';

// The studio is exercised on its own (BrandingStudio.test); here it is a probe that shows what it was given.
vi.mock('@/components/form-builder/BrandingStudio', () => ({
  BrandingStudio: ({ layout, formId, branding, fieldCount, onFullScreen }: { layout: string; formId?: string; branding: { primaryColor?: string }; fieldCount: number; onFullScreen?: () => void }) => (
    <div data-testid="studio">
      {layout}|{formId}|{branding.primaryColor}|{fieldCount}
      <button onClick={onFullScreen}>open-full-screen</button>
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
    />,
  );
  return { onBrandingUpdate, onLayoutChange };
}

describe('BrandingTabContent', () => {
  it('is one screen: the studio is there at once, with no "step 1 of 2" gallery to get through first', () => {
    setup({ settings: { honeypotEnabled: true, layout: 'steps' } });
    expect(screen.getByTestId('studio')).toHaveTextContent('steps|f1|#1D4ED8|2');
    expect(screen.queryByText(/Step 1 of 2|Step 2 of 2/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Skip — customise manually|Change layout/ })).not.toBeInTheDocument();
  });

  it('hands the studio the way to open the real form in a new tab', async () => {
    const onFullScreen = vi.fn();
    setup({ onFullScreen });
    await userEvent.click(screen.getByText('open-full-screen'));
    expect(onFullScreen).toHaveBeenCalled();
  });

  it('a layout the form has stored in an older form is read as the preset it means', () => {
    setup({ settings: { honeypotEnabled: true, layout: 'two_column' } });
    expect(screen.getByTestId('studio')).toHaveTextContent('compact|');
  });

  it('on a small screen the layout tiles and a notice are shown (detailed branding needs a larger screen)', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Choose a layout' })).toBeInTheDocument();
    expect(screen.getByText('Detailed branding needs a larger screen')).toBeInTheDocument();
  });

  it('choosing a layout sets it and applies that preset\'s look to the branding, in one click', async () => {
    const { onLayoutChange, onBrandingUpdate } = setup();
    await userEvent.click(within(screen.getByRole('group', { name: 'Layout' })).getByRole('button', { name: /Guided/ }));
    expect(onLayoutChange).toHaveBeenCalledWith('guided');
    expect(onBrandingUpdate).toHaveBeenCalledWith(expect.objectContaining({ fontFamily: LAYOUT_LOOKS.guided.font, cardStyle: LAYOUT_LOOKS.guided.cardStyle, primaryColor: LAYOUT_LOOKS.guided.color }));
  });

  it('keeps a colour the owner picked when the layout changes', async () => {
    const { onBrandingUpdate } = setup({ branding: { primaryColor: '#123ABC' } });
    await userEvent.click(within(screen.getByRole('group', { name: 'Layout' })).getByRole('button', { name: /Guided/ }));
    expect(onBrandingUpdate.mock.calls[0][0]).not.toHaveProperty('primaryColor');
  });
});
