/**
 * The Branding studio: every look setting in five short sections, beside a live preview, each a click or two from the person. Choosing a layout
 * applies it at once; the controls report what they changed and the preview is given the unsaved branding, layout and screen.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrandingStudio } from '@/components/form-builder/BrandingStudio';
import { LAYOUT_LOOKS } from '@/lib/layoutPresets';
import type { FormBranding } from '@/types/form';

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/services/upload', () => ({ uploadService: { uploadFile: vi.fn() } }));

const previewProps = vi.hoisted(() => vi.fn());
vi.mock('@/components/form-builder/LiveFormPreview', () => ({
  LiveFormPreview: (props: Record<string, unknown>) => {
    previewProps(props);
    return <div data-testid="live-preview" />;
  },
}));

function draw(over: Partial<React.ComponentProps<typeof BrandingStudio>> = {}) {
  const onBrandingUpdate = vi.fn();
  const onLayoutChange = vi.fn();
  const branding: FormBranding = { primaryColor: '#1D4ED8' };
  render(<BrandingStudio formId="f1" branding={branding} layout="classic" fieldCount={3} isPublic={false} onBrandingUpdate={onBrandingUpdate} onLayoutChange={onLayoutChange} {...over} />);
  return { onBrandingUpdate, onLayoutChange };
}
const tab = (name: string) => screen.getByRole('tab', { name });

describe('BrandingStudio: one screen', () => {
  it('shows the sections as tabs and the live preview beside them, with nothing to get through first', () => {
    draw();
    expect(within(screen.getByRole('tablist', { name: 'Branding sections' })).getAllByRole('tab').map((t) => t.textContent)).toEqual(['Layout', 'Colour', 'Text', 'Style', 'Header']);
    expect(tab('Layout')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('live-preview')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Layout' })).toBeInTheDocument();
  });

  it('gives the preview the unsaved branding, the layout and the screen chosen, and fills the stage', async () => {
    draw({ branding: { primaryColor: '#123456' }, layout: 'steps' });
    expect(previewProps).toHaveBeenLastCalledWith(expect.objectContaining({ formId: 'f1', branding: { primaryColor: '#123456' }, layout: 'steps', device: 'desktop', fill: true }));
    await userEvent.click(screen.getByRole('button', { name: 'Mobile' }));
    expect(previewProps).toHaveBeenLastCalledWith(expect.objectContaining({ device: 'mobile' }));
  });

  describe('zoom', () => {
    const preview = () => previewProps.mock.calls.at(-1)![0] as { zoom: number };

    it('is 100% to start', () => {
      draw();
      expect(preview().zoom).toBe(1);
      expect(screen.getByRole('button', { name: 'Back to 100%' })).toHaveTextContent('100%');
    });

    it('- and + step through the zoom, and the percentage says where it is', async () => {
      draw();
      await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
      expect(preview().zoom).toBe(0.9);
      expect(screen.getByRole('button', { name: 'Back to 100%' })).toHaveTextContent('90%');
      await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
      expect(preview().zoom).toBe(0.75);
      await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
      await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
      expect(preview().zoom).toBe(1);
      await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
      expect(preview().zoom).toBe(1.25);
    });

    it('the percentage goes back to 100%, and another screen starts from 100% again', async () => {
      draw();
      await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
      await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
      await userEvent.click(screen.getByRole('button', { name: 'Back to 100%' }));
      expect(preview().zoom).toBe(1);
      await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
      await userEvent.click(screen.getByRole('button', { name: 'Tablet' }));
      expect(preview().zoom).toBe(1);
    });

    it('stops at the smallest and the largest zoom', async () => {
      draw();
      for (let i = 0; i < 6; i++) await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
      expect(screen.getByRole('button', { name: 'Back to 100%' })).toHaveTextContent('25%');
      expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
      await userEvent.click(screen.getByRole('button', { name: 'Back to 100%' }));
      await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
      await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
      expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
    });
  });

  it('has a Full screen button that opens the real form in a new tab, when it can', async () => {
    const onFullScreen = vi.fn();
    draw({ onFullScreen });
    await userEvent.click(screen.getByRole('button', { name: /Full screen/ }));
    expect(onFullScreen).toHaveBeenCalledTimes(1);
  });

  it('has no Full screen button without a saved form or without the means to open it', () => {
    draw();
    expect(screen.queryByRole('button', { name: /Full screen/ })).not.toBeInTheDocument();
  });

  it('says to save first when there is no saved form to preview', () => {
    draw({ formId: undefined });
    expect(screen.queryByTestId('live-preview')).not.toBeInTheDocument();
    expect(screen.getByText('Save the form to see a live preview.')).toBeInTheDocument();
  });
});

describe('Layout', () => {
  it('one click on a layout applies it and its look (typeface, card, panel, colour)', async () => {
    const { onLayoutChange, onBrandingUpdate } = draw();
    await userEvent.click(within(screen.getByRole('group', { name: 'Layout' })).getByRole('button', { name: /Split Feature/ }));
    expect(onLayoutChange).toHaveBeenCalledWith('split_feature');
    expect(onBrandingUpdate).toHaveBeenCalledWith(expect.objectContaining({ fontFamily: LAYOUT_LOOKS.split_feature.font, panelTreatment: LAYOUT_LOOKS.split_feature.panel }));
  });

  it('marks the layout in use and suggests one for the number of fields', () => {
    draw({ layout: 'classic', fieldCount: 12 });
    expect(screen.getByRole('button', { name: /Classic/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('button', { name: /Steps/ })).getByText('Suggested')).toBeInTheDocument();
    expect(screen.getByText(/Steps or Card Stack usually outperform/)).toBeInTheDocument();
  });

  it('keeps the "Suggested" label on the layout once it is chosen', async () => {
    const { onLayoutChange } = draw({ layout: 'steps', fieldCount: 12 });
    expect(within(screen.getByRole('button', { name: /Steps/ })).getByText('Suggested')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Steps/ }));
    expect(onLayoutChange).toHaveBeenCalledWith('steps');
    expect(within(screen.getByRole('button', { name: /Steps/ })).getByText('Suggested')).toBeInTheDocument();
  });

  it('has no title row of its own (the tab says Branding); the screen switch is inside the preview', () => {
    draw();
    expect(screen.getByRole('heading', { name: 'Branding' })).toHaveClass('sr-only');
    expect(screen.queryByText('What you change shows in the preview at once.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reset style/ })).not.toBeInTheDocument();
  });

  it('lets the owner pick a logo size: small, medium or large', async () => {
    const { onBrandingUpdate } = draw({ branding: { logoUrl: 'https://x/logo.png' } });
    await userEvent.click(tab('Header'));
    const group = screen.getByRole('group', { name: 'Logo size' });
    expect(within(group).getByRole('button', { name: 'Medium' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(within(group).getByRole('button', { name: 'Large' }));
    expect(onBrandingUpdate).toHaveBeenLastCalledWith({ logoSize: 'lg' });
  });

  it('the Card choice shows a small picture of each of the four looks', async () => {
    const { onBrandingUpdate } = draw();
    await userEvent.click(tab('Style'));
    const group = screen.getByRole('group', { name: 'Card' });
    expect(within(group).getAllByRole('button')).toHaveLength(4);
    await userEvent.click(within(group).getByRole('button', { name: 'Elevated' }));
    expect(onBrandingUpdate).toHaveBeenLastCalledWith({ cardStyle: 'elevated' });
  });

  it('adds, edits and removes links, up to five', async () => {
    const { onBrandingUpdate } = draw({ branding: { bannerLinks: [{ label: 'A', url: 'https://a.com' }] } });
    await userEvent.click(tab('Header'));
    await userEvent.click(screen.getByRole('button', { name: 'Add link' }));
    expect(onBrandingUpdate).toHaveBeenLastCalledWith({ bannerLinks: [{ label: 'A', url: 'https://a.com' }, { url: '' }] });
    await userEvent.type(screen.getByLabelText('Link 1 text'), 'b');
    expect(onBrandingUpdate).toHaveBeenLastCalledWith({ bannerLinks: [{ label: 'Ab', url: 'https://a.com' }] });
    await userEvent.click(screen.getByRole('button', { name: 'Remove link 1' }));
    expect(onBrandingUpdate).toHaveBeenLastCalledWith({ bannerLinks: [] });
  });

  it('has no Add link button once there are five', async () => {
    draw({ branding: { bannerLinks: Array.from({ length: 5 }, () => ({ url: 'https://a.com' })) } });
    await userEvent.click(tab('Header'));
    expect(screen.queryByRole('button', { name: 'Add link' })).not.toBeInTheDocument();
  });

  it('warns that Compact is for internal forms when the form is public', () => {
    draw({ layout: 'compact', isPublic: true });
    expect(screen.getByText('Compact is for internal forms')).toBeInTheDocument();
  });
});

describe('Colour', () => {
  it('a swatch sets the brand colour, a valid hex too, and a bad hex says so and keeps the colour', async () => {
    const { onBrandingUpdate } = draw();
    await userEvent.click(tab('Colour'));
    await userEvent.click(screen.getByRole('button', { name: 'Use #16A34A as the brand colour' }));
    expect(onBrandingUpdate).toHaveBeenLastCalledWith({ primaryColor: '#16A34A' });
    const hex = screen.getByLabelText('Brand colour, hex');
    await userEvent.clear(hex);
    await userEvent.type(hex, '#ABCDEF');
    await userEvent.tab();
    expect(onBrandingUpdate).toHaveBeenLastCalledWith({ primaryColor: '#ABCDEF' });
    await userEvent.clear(hex);
    await userEvent.type(hex, 'nope');
    await userEvent.tab();
    expect(screen.getByText('Enter a hex colour, like #1D4ED8')).toBeInTheDocument();
    expect(hex).toHaveValue('#1D4ED8');
  });

  it('the colour panel is one click', async () => {
    const { onBrandingUpdate } = draw();
    await userEvent.click(tab('Colour'));
    await userEvent.click(within(screen.getByRole('group', { name: 'Colour panel' })).getByRole('button', { name: 'Gradient' }));
    expect(onBrandingUpdate).toHaveBeenLastCalledWith({ panelTreatment: 'gradient' });
  });

  it('the page background is a row of picture tiles, each drawn with its own style; one click chooses it', async () => {
    const { onBrandingUpdate } = draw();
    await userEvent.click(tab('Colour'));
    const group = screen.getByRole('group', { name: 'Page background' });
    expect(within(group).getAllByRole('button')).toHaveLength(8);
    expect(within(group).getByRole('button', { name: 'Soft glow (default)' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(within(group).getByRole('button', { name: 'Dots' }));
    expect(onBrandingUpdate).toHaveBeenLastCalledWith({ backgroundStyle: 'dots' });
    expect(screen.queryByRole('combobox', { name: 'Page background' })).not.toBeInTheDocument();
  });

  it('"Your own image" shows its upload box once it is the chosen background', async () => {
    draw({ branding: { backgroundStyle: 'image' } });
    await userEvent.click(tab('Colour'));
    expect(screen.getByRole('button', { name: 'Your own image' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Click or drag to upload')).toBeInTheDocument();
  });

  it('offers the page colour while the background has one, and a way back to the brand colour', async () => {
    const { onBrandingUpdate } = draw({ branding: { primaryColor: '#1D4ED8', backgroundColor: '#DC2626' } });
    await userEvent.click(tab('Colour'));
    await userEvent.click(screen.getByRole('button', { name: 'Match the brand colour' }));
    expect(onBrandingUpdate).toHaveBeenLastCalledWith({ backgroundColor: undefined });
  });

  it('has no page colour for a plain background', async () => {
    draw({ branding: { backgroundStyle: 'plain' } });
    await userEvent.click(tab('Colour'));
    expect(screen.queryByText('Page colour')).not.toBeInTheDocument();
  });
});

describe('Text, Style and Header', () => {
  it('a font is chosen from a list drawn in the fonts themselves, one click', async () => {
    const { onBrandingUpdate } = draw();
    await userEvent.click(tab('Text'));
    const lora = screen.getByRole('button', { name: /Lora/ });
    expect(lora.getAttribute('style')).toContain('lora');
    await userEvent.click(lora);
    expect(onBrandingUpdate).toHaveBeenLastCalledWith({ fontFamily: 'lora' });
    expect(screen.getByRole('button', { name: /DM Sans/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('headline size, button style and corners are each one click', async () => {
    const { onBrandingUpdate } = draw();
    await userEvent.click(tab('Text'));
    await userEvent.click(screen.getByRole('button', { name: 'Large' }));
    expect(onBrandingUpdate).toHaveBeenLastCalledWith({ typeScale: 'large' });
    await userEvent.click(screen.getByRole('button', { name: 'Outline' }));
    expect(onBrandingUpdate).toHaveBeenLastCalledWith({ buttonStyle: 'outline' });
    await userEvent.click(screen.getByRole('button', { name: 'Pill' }));
    expect(onBrandingUpdate).toHaveBeenLastCalledWith({ buttonRadius: '16px' });
  });

  it('card, width, spacing and field layout are one click, and the progress bar a switch', async () => {
    const { onBrandingUpdate } = draw();
    await userEvent.click(tab('Style'));
    await userEvent.click(screen.getByRole('button', { name: 'Bordered' }));
    expect(onBrandingUpdate).toHaveBeenLastCalledWith({ cardStyle: 'bordered' });
    await userEvent.click(screen.getByRole('button', { name: 'Wide' }));
    expect(onBrandingUpdate).toHaveBeenLastCalledWith({ formWidth: 'wide' });
    await userEvent.click(screen.getByRole('button', { name: 'Spacious' }));
    expect(onBrandingUpdate).toHaveBeenLastCalledWith({ spacing: 'spacious' });
    await userEvent.click(screen.getByRole('button', { name: 'One per row' }));
    expect(onBrandingUpdate).toHaveBeenLastCalledWith({ fieldGrouping: 'single' });
    await userEvent.click(screen.getByRole('switch', { name: 'Show the progress bar' }));
    expect(onBrandingUpdate).toHaveBeenLastCalledWith({ showProgress: false });
  });

  it('shows the logo and the cover, and the cover position only for a banner that has a picture', async () => {
    draw({ branding: { coverImageUrl: 'https://x/cover.png', coverFit: 'banner' } });
    await userEvent.click(tab('Header'));
    expect(screen.getByText('Logo')).toBeInTheDocument();
    expect(screen.getByText('Square, 256 × 256 or larger.')).toBeInTheDocument(); // under the upload box, not cut off inside it
    expect(screen.getByRole('button', { name: 'Wide banner' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Middle' })).toBeInTheDocument();
  });

  it('the Header section edits the form title and adds a description and a link, and the preview is given the unsaved title', async () => {
    const onTitleChange = vi.fn();
    const { onBrandingUpdate } = draw({ formTitle: 'Survey', onTitleChange });
    await userEvent.click(tab('Header'));
    expect(screen.getByLabelText('Form title')).toHaveValue('Survey');
    await userEvent.type(screen.getByLabelText('Form title'), '!');
    expect(onTitleChange).toHaveBeenLastCalledWith('Survey!');
    await userEvent.type(screen.getByLabelText('Description'), 'a');
    expect(onBrandingUpdate).toHaveBeenLastCalledWith({ bannerText: 'a' });
    expect(previewProps).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Survey' }));
  });

  it('warns about a link address that is not http or https', async () => {
    draw({ branding: { bannerLinks: [{ url: 'javascript:alert(1)' }] } });
    await userEvent.click(tab('Header'));
    expect(screen.getByText('Start with http:// or https://')).toBeInTheDocument();
  });
});
