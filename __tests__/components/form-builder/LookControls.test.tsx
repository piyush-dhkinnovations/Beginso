/**
 * The studio's controls for form colours, fields look and exact sizes: drawn choices, a Custom badge with an Undo when an exact value is in use,
 * one-tap fixes for hard-to-read colours, and options a layout cannot show left out, with a line saying so.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { BrandingStudio } from '@/components/form-builder/BrandingStudio';
import { LookScope } from '@/components/public-form/layouts/shared';
import { MultipleChoiceRenderer } from '@/components/public-form/fields/MultipleChoiceRenderer';
import { CheckboxRenderer } from '@/components/public-form/fields/CheckboxRenderer';
import { readabilityChecks } from '@/components/form-builder/LookControls';
import type { FormBranding, LayoutPreset } from '@/types/form';
import type { FieldRendererProps } from '@/types/publicForm';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/services/upload', () => ({ uploadService: { uploadFile: vi.fn() } }));
vi.mock('@/components/form-builder/LiveFormPreview', () => ({ LiveFormPreview: (props: { screen?: string }) => <div data-testid="live-preview" data-screen={props.screen} /> }));

beforeEach(() => toast.mockClear());

function draw(branding: FormBranding = { primaryColor: '#1D4ED8' }, layout: LayoutPreset = 'classic') {
  const onBrandingUpdate = vi.fn();
  render(<BrandingStudio formId="f1" branding={branding} layout={layout} fieldCount={3} isPublic={false} onBrandingUpdate={onBrandingUpdate} onLayoutChange={vi.fn()} />);
  return onBrandingUpdate;
}
const open = (name: string) => userEvent.click(screen.getByRole('tab', { name }));

describe('Colours section: form colours and readability', () => {
  it('has a row for each of the six colours, and saving one sets it in branding.theme', async () => {
    const update = draw();
    await open('Colours');
    for (const label of ['Text', 'Headings', 'Card', 'Fields', 'Field border', 'Button text']) expect(screen.getByLabelText(label)).toBeInTheDocument();
    const text = screen.getByLabelText('Text');
    await userEvent.type(text, '#222222{Enter}');
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, colors: { text: '#222222' } } });
  });

  it('refuses a colour that is not a hex', async () => {
    const update = draw();
    await open('Colours');
    await userEvent.type(screen.getByLabelText('Headings'), 'purple{Enter}');
    expect(update).not.toHaveBeenCalled();
  });

  it('resets one colour, and clears the whole theme when it was the last thing in it', async () => {
    const update = draw({ primaryColor: '#1D4ED8', theme: { v: 1, colors: { heading: '#7C3AED' } } });
    await open('Colours');
    await userEvent.click(screen.getByRole('button', { name: 'Set headings back to the default' }));
    expect(update).toHaveBeenLastCalledWith({ theme: null });
  });

  it('measures the four pairs, says so when a pair cannot be measured, and fixes a failing one in one tap', async () => {
    const update = draw({ primaryColor: '#1D4ED8', backgroundStyle: 'image', theme: { v: 1, colors: { text: '#AAAAAA' } } });
    await open('Colours');
    // only what needs fixing is listed to begin with; every check is one click away
    expect(within(screen.getByRole('list', { name: 'Readability of the colours' })).getAllByRole('listitem').length).toBeLessThan(7);
    expect(screen.getByRole('status')).toHaveTextContent(/to fix/);
    await userEvent.click(screen.getByRole('button', { name: 'Show all checks' }));
    const list = screen.getByRole('list', { name: 'Readability of the colours' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(7);
    expect(rows[0]).toHaveTextContent('Text on the card');
    expect(rows[0]).toHaveTextContent('Needs 4.5');
    expect(rows[2]).toHaveTextContent("Can't check: the page has a picture");
    await userEvent.click(within(rows[0]).getByRole('button', { name: /^Fix: text on the card/ }));
    const sent = update.mock.calls.at(-1)![0].theme.colors.text as string;
    expect(sent).toMatch(/^#[0-9A-F]{6}$/);
    expect(sent).not.toBe('#AAAAAA');
  });

  it('says "All the colours are easy to read" and lists nothing when every check passes', async () => {
    draw({ primaryColor: '#1D4ED8', backgroundStyle: 'plain', theme: { v: 1, colors: { fieldBorder: '#6B7280' } } });
    await open('Colours');
    expect(screen.getByRole('status')).toHaveTextContent('All the colours are easy to read');
    expect(screen.queryByRole('list', { name: 'Readability of the colours' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show all checks' }));
    expect(within(screen.getByRole('list', { name: 'Readability of the colours' })).getAllByRole('listitem').length).toBeGreaterThanOrEqual(6);
    await userEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.queryByRole('list', { name: 'Readability of the colours' })).not.toBeInTheDocument();
  });

  it('checks the field border at 3 to 1 and the button text on the button', () => {
    const checks = readabilityChecks({ primaryColor: '#FFFF00', theme: { v: 1, colors: { buttonText: '#FFFFFF', fieldBorder: '#DDDDDD' } } });
    const by = Object.fromEntries(checks.map((c) => [c.id, c]));
    expect(by.border.need).toBe(3);
    expect(by.border.ratio!).toBeLessThan(3);
    expect(by.border.fix).toBeDefined();
    expect(by.button.ratio!).toBeLessThan(4.5);
    expect(by.button.fix?.key).toBe('buttonText');
  });

  it('an outline button is measured as the brand colour on white, with no one-tap fix (the brand colour is the one to change)', () => {
    const b = readabilityChecks({ primaryColor: '#FFFF00', buttonStyle: 'outline' }).find((c) => c.id === 'button')!;
    expect(b.ratio!).toBeLessThan(4.5);
    expect(b.fix).toBeUndefined();
  });

  it('measures what people type on the field colour, headings on the card and the page, and the brand colour on the card and the page', () => {
    const by = (b: FormBranding) => Object.fromEntries(readabilityChecks(b).map((c) => [c.id, c]));
    const low = by({ primaryColor: '#FFFF00', backgroundStyle: 'plain', theme: { v: 1, colors: { text: '#111111', field: '#222222', heading: '#EEEEEE' } } });
    expect(low['text-field'].ratio!).toBeLessThan(4.5);
    expect(low['text-field'].fix?.key).toBe('text');
    expect(low['heading-card'].ratio!).toBeLessThan(4.5);
    expect(low['heading-page'].ratio!).toBeLessThan(4.5);
    expect(low['brand-card'].need).toBe(3);
    expect(low['brand-card'].ratio!).toBeLessThan(3);
    expect(low['brand-card'].fix?.key).toBe('brand');
    expect(low['brand-page'].ratio!).toBeLessThan(3);
    expect(by({ primaryColor: '#1D4ED8' })['heading-card']).toBeUndefined();
  });

  it('the brand colour fix changes the brand colour, not a theme colour', async () => {
    const update = draw({ primaryColor: '#FFFF00' });
    await open('Colours');
    await userEvent.click(screen.getByRole('button', { name: /^Fix: brand colour on the card/ }));
    expect(update.mock.calls.at(-1)![0]).toHaveProperty('primaryColor');
    expect(update.mock.calls.at(-1)![0]).not.toHaveProperty('theme');
  });

  it('a chosen heading colour is measured on the coloured header, and not when the header is a picture', () => {
    const h = (over: Partial<FormBranding>) => readabilityChecks({ primaryColor: '#1D4ED8', theme: { v: 1, colors: { heading: '#1E40AF' } }, ...over }).find((c) => c.id === 'heading');
    expect(h({})!.ratio!).toBeLessThan(4.5);
    expect(h({})!.fix?.key).toBe('heading');
    expect(h({ panelTreatment: 'image' })!.unknown).toMatch(/picture/);
    expect(readabilityChecks({ primaryColor: '#1D4ED8' }).find((c) => c.id === 'heading')).toBeUndefined();
  });

  it('a plain or solid page can be measured; a gradient, mesh and tinted page cannot', () => {
    const page = (backgroundStyle: FormBranding['backgroundStyle']) => readabilityChecks({ backgroundStyle }).find((c) => c.id === 'text-page')!;
    expect(page('plain').ratio).not.toBeNull();
    expect(page('solid').ratio).not.toBeNull();
    for (const s of ['gradient', 'mesh', 'wash', 'dots', 'grid', 'image'] as const) expect(page(s).unknown).toBeTruthy();
  });
});

describe('Fields section', () => {
  it('choosing a field style, label position and choice style sets branding.theme.fields', async () => {
    const update = draw();
    await open('Fields');
    await userEvent.click(screen.getByRole('button', { name: 'Filled' }));
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, fields: { style: 'filled' } } });
    await userEvent.click(screen.getByRole('button', { name: 'Beside the field' }));
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, fields: { label: 'start' } } });
    await userEvent.click(screen.getByRole('button', { name: 'Tiles' }));
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, fields: { choice: 'tiles' } } });
  });

  it.each<LayoutPreset>(['guided', 'compact', 'chat', 'focus'])('%s has no label position to choose, and the section says so', async (layout) => {
    draw({ primaryColor: '#1D4ED8', theme: { v: 1, fields: { label: 'start' } } }, layout);
    await open('Fields');
    expect(screen.queryByRole('button', { name: 'Beside the field' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Above the field' })).not.toBeInTheDocument();
    expect(screen.getByText(/does not use labels beside the field, so it is not shown/)).toBeInTheDocument();
  });

  it('Classic offers every option, none switched off', async () => {
    draw();
    await open('Fields');
    for (const name of ['Outlined', 'Filled', 'Underline', 'Square', 'Rounded', 'Pill', 'Above the field', 'Beside the field', 'Plain', 'Tiles']) expect(screen.getByRole('button', { name })).toBeEnabled();
    expect(screen.queryByText(/does not use/)).not.toBeInTheDocument();
  });

  it('an underline field has no corners, so no corner choices are shown', async () => {
    draw({ primaryColor: '#1D4ED8', theme: { v: 1, fields: { style: 'underline' } } });
    await open('Fields');
    expect(screen.queryByRole('group', { name: 'Field corners' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Exact sizes/ })).not.toBeInTheDocument();
  });
});

describe('Custom, and back to the preset with an Undo', () => {
  it('shows Custom on the width, spacing and card groups while an exact value is in use, and no preset looks chosen', async () => {
    draw({ primaryColor: '#1D4ED8', theme: { v: 1, card: { radius: 30 }, layout: { maxWidth: 800, fieldGap: 10 } } });
    await open('Arrange');
    for (const label of ['Form width', 'Spacing']) expect(within(screen.getByRole('group', { name: new RegExp(`^${label}`) })).getByText('Custom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Standard' })).toHaveAttribute('aria-pressed', 'false');
    await open('Background');
    expect(within(screen.getByRole('group', { name: /^Card style/ })).getByText('Custom')).toBeInTheDocument();
  });

  it('has no Custom badge on a form with no exact values', async () => {
    draw();
    await open('Arrange');
    expect(screen.queryByText('Custom')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Standard' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('choosing a preset puts the exact value back to the preset and offers Undo, which restores both', async () => {
    const theme = { v: 1 as const, layout: { maxWidth: 800 }, colors: { text: '#222222' } };
    const update = draw({ primaryColor: '#1D4ED8', formWidth: 'narrow', theme });
    await open('Arrange');
    await userEvent.click(screen.getByRole('button', { name: 'Wide' }));
    expect(update).toHaveBeenLastCalledWith({ formWidth: 'wide', theme: { v: 1, colors: { text: '#222222' } } });
    expect(toast).toHaveBeenCalledWith('The form width is back to the preset.', 'info', undefined, expect.objectContaining({ label: 'Undo' }));
    toast.mock.calls[0][3].onClick();
    expect(update).toHaveBeenLastCalledWith({ formWidth: 'narrow', theme });
  });

  it('choosing a preset with no exact value in use says nothing and has nothing to undo', async () => {
    draw();
    await open('Arrange');
    await userEvent.click(screen.getByRole('button', { name: 'Wide' }));
    expect(toast).not.toHaveBeenCalled();
  });

  it('exact sizes are folded away in the section of the thing they size, and set exact values', async () => {
    const update = draw();
    await open('Arrange');
    expect(screen.queryByLabelText('Biggest form width')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Exact sizes/ }));
    const w = screen.getByLabelText('Biggest form width') as HTMLInputElement;
    expect([w.min, w.max]).toEqual(['360', '1400']);
    expect(screen.getByText(/still fits the screen/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Card corners')).not.toBeInTheDocument();

    await open('Background');
    await userEvent.click(screen.getByRole('button', { name: /Exact sizes/ }));
    const radius = screen.getByLabelText('Card corners') as HTMLInputElement;
    expect([radius.min, radius.max]).toEqual(['0', '40']);
    fireEvent.change(radius, { target: { value: '30' } });
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, card: { radius: 30 } } });
  });

  it('"Back to the presets" clears the exact values of that section', async () => {
    const update = draw({ primaryColor: '#1D4ED8', theme: { v: 1, layout: { maxWidth: 800 } } });
    await open('Arrange');
    await userEvent.click(screen.getByRole('button', { name: /Exact sizes \(in use\)/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Back to the presets' }));
    expect(update).toHaveBeenLastCalledWith({ theme: null });
  });
});

describe('choice tiles stay real radios and checkboxes', () => {
  function Group({ type }: { type: 'multiple_choice' | 'checkbox' }) {
    const { control, register, trigger, setValue } = useForm({ defaultValues: {} });
    const props = { field: { fieldId: 'f', label: 'Pick', type, required: false, options: ['One', 'Two'] }, control, register, trigger, setValue } as unknown as FieldRendererProps;
    return (
      <LookScope branding={{ theme: { v: 1, fields: { choice: 'tiles' } } }}>
        {type === 'multiple_choice' ? <MultipleChoiceRenderer {...props} /> : <CheckboxRenderer {...props} />}
      </LookScope>
    );
  }

  it.each([['multiple_choice', 'radio'], ['checkbox', 'checkbox']] as const)('%s is still %s inputs inside labels, and the keyboard works', async (type, role) => {
    const { container } = render(<Group type={type} />);
    const scope = container.querySelector('.form-look')!;
    expect(scope).toHaveAttribute('data-choice-tiles');
    expect(scope.querySelectorAll('label.form-choice')).toHaveLength(2);
    const inputs = screen.getAllByRole(role);
    expect(inputs).toHaveLength(2);
    await userEvent.tab();
    expect(inputs[0]).toHaveFocus();
    await userEvent.keyboard(type === 'checkbox' ? ' ' : '{ArrowDown}');
    expect(type === 'checkbox' ? inputs[0] : inputs[1]).toBeChecked();
  });

  it('the plain look has no tile attribute, so the CSS for tiles does not apply', () => {
    const { container } = render(
      <LookScope branding={{}}>
        <span />
      </LookScope>,
    );
    expect(container.querySelector('.form-look')!.getAttributeNames().sort()).toEqual(['class']);
  });
});

describe('Fonts section: fonts and the heading font', () => {
  it('lists the fonts in groups, each drawn in its own typeface, and picking one sets the form font', async () => {
    const update = draw();
    await open('Fonts');
    const fonts = screen.getByRole('group', { name: 'Text font' });
    for (const g of ['Modern', 'Serif', 'Friendly', 'Handwritten and display']) expect(within(fonts).getByRole('group', { name: g })).toBeInTheDocument();
    const serif = within(fonts).getByRole('group', { name: 'Serif' });
    expect(within(serif).getAllByRole('button').length).toBeGreaterThanOrEqual(5);
    await userEvent.click(within(serif).getByRole('button', { name: /Playfair Display/ }));
    expect(update).toHaveBeenLastCalledWith({ fontFamily: 'playfair_display' });
  });

  it('the heading font starts as "Same as the text", sets theme.fonts.heading, and clears the theme when put back', async () => {
    const update = draw();
    await open('Fonts');
    const select = screen.getByLabelText('Heading font') as HTMLSelectElement;
    expect(select.value).toBe('');
    await userEvent.selectOptions(select, 'caveat');
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, fonts: { heading: 'caveat' } } });
  });

  it('shows the chosen heading font, and putting it back to "Same as the text" clears it', async () => {
    const update = draw({ primaryColor: '#1D4ED8', theme: { v: 1, fonts: { heading: 'caveat' } } });
    await open('Fonts');
    const select = screen.getByLabelText('Heading font') as HTMLSelectElement;
    expect(select.value).toBe('caveat');
    await userEvent.selectOptions(select, '');
    expect(update).toHaveBeenLastCalledWith({ theme: null });
  });
});

describe('Arrange section: the picture side', () => {
  it('on Split Feature, picking the right puts the picture on the right', async () => {
    const update = draw({ primaryColor: '#1D4ED8' }, 'split_feature');
    await open('Arrange');
    expect(screen.getByRole('button', { name: 'On the left' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'On the right' }));
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, layout: { panelSide: 'end' } } });
  });

  it('shows the saved side, and the left puts it back', async () => {
    const update = draw({ primaryColor: '#1D4ED8', theme: { v: 1, layout: { panelSide: 'end' } } }, 'split_feature');
    await open('Arrange');
    expect(screen.getByRole('button', { name: 'On the right' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'On the left' }));
    expect(update).toHaveBeenLastCalledWith({ theme: null });
  });

  it.each<LayoutPreset>(['classic', 'chat', 'sidebar', 'open', 'focus', 'guided'])('on %s there is no picture side', async (layout) => {
    draw({ primaryColor: '#1D4ED8', theme: { v: 1, layout: { panelSide: 'end' } } }, layout);
    await open('Arrange');
    expect(screen.queryByRole('group', { name: 'Picture side' })).not.toBeInTheDocument();
  });
});

describe('Buttons section: size, width, hover and button text', () => {
  it('has the controls, drawn as tiles, with the usual choice marked', async () => {
    draw();
    await open('Buttons');
    expect(screen.getByRole('group', { name: 'Button size' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Default' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Fill the row' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Nothing' })).toHaveAttribute('aria-pressed', 'true');
  });

  it.each([
    ['Large', { buttons: { size: 'large' } }],
    ['As wide as the words', { buttons: { width: 'auto' } }],
    ['Lift', { buttons: { hover: 'lift' } }],
    ['Darken', { buttons: { hover: 'darken' } }],
  ])('%s is saved in branding.theme', async (tile, group) => {
    const update = draw();
    await open('Buttons');
    await userEvent.click(screen.getByRole('button', { name: tile }));
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, ...group } });
  });

  it('going back to the usual choice takes it out again, and an emptied theme is cleared', async () => {
    const update = draw({ primaryColor: '#1D4ED8', theme: { v: 1, buttons: { size: 'large' } } });
    await open('Buttons');
    expect(screen.getByRole('button', { name: 'Large' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Default' }));
    expect(update).toHaveBeenLastCalledWith({ theme: null });
  });

  it('writes the owner\'s words for the three buttons, and an empty box goes back to the usual word', async () => {
    const update = draw({ primaryColor: '#1D4ED8', theme: { v: 1, labels: { next: 'Continue' } } });
    await open('Buttons');
    expect(screen.getByLabelText('Next button')).toHaveValue('Continue');
    await userEvent.type(screen.getByLabelText('Submit button'), 'S');
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, labels: { next: 'Continue', submit: 'S' } } });
    await userEvent.clear(screen.getByLabelText('Next button'));
    expect(update).toHaveBeenLastCalledWith({ theme: null });
  });

  it('limits the button text to 30 characters, and takes markup out', async () => {
    draw();
    await open('Buttons');
    expect(screen.getByLabelText('Back button')).toHaveAttribute('maxlength', '30');
    expect(screen.getByLabelText('Back button').closest('.bg-field')).toHaveTextContent('0/30');
  });
});

describe('Progress (Arrange) and the footer note (Header)', () => {
  it.each([
    ['Dots', { progress: { style: 'dots' } }],
    ['Steps', { progress: { style: 'steps' } }],
  ])('the %s progress style is saved in branding.theme', async (tile, group) => {
    const update = draw();
    await open('Arrange');
    expect(screen.getByRole('button', { name: 'Bar' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: tile }));
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, ...group } });
  });

  it('offers no progress style while the progress bar is off', async () => {
    draw({ primaryColor: '#1D4ED8', showProgress: false });
    await open('Arrange');
    expect(screen.queryByRole('group', { name: 'Progress style' })).not.toBeInTheDocument();
  });

  it.each<LayoutPreset>(['steps', 'guided', 'chat', 'focus'])('%s shows its own progress, so there is nothing to choose', async (layout) => {
    draw({ primaryColor: '#1D4ED8' }, layout);
    await open('Arrange');
    expect(screen.queryByRole('group', { name: 'Progress style' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /Show the progress bar/ })).not.toBeInTheDocument();
    expect(screen.getByText(/does not use .*a progress bar of your choosing/)).toBeInTheDocument();
  });

  it('writes the note under the form, up to 200 characters', async () => {
    const update = draw();
    await open('Header');
    const note = screen.getByLabelText('Footer note');
    expect(note).toHaveAttribute('maxlength', '200');
    fireEvent.change(note, { target: { value: 'Hi <b>' } }); // markup is taken out
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, footer: { note: 'Hi b' } } });
  });
});

describe('Thank you section', () => {
  it('has its own headline, accent, picture, confetti and redirect controls, with the preview switch on', async () => {
    draw();
    await open('Thank you');
    expect(screen.getByLabelText('Headline')).toHaveAttribute('maxlength', '60');
    expect(screen.getByLabelText('Accent')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Picture' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Confetti/)).not.toBeChecked();
    expect(screen.getByLabelText('Address')).toHaveValue('');
    expect(screen.getByLabelText('Wait before moving on')).toBeDisabled();
    expect(screen.getByLabelText('Show it in the preview')).toBeChecked();
  });

  it('writes the headline, and an empty box goes back to Thank you!', async () => {
    const update = draw({ primaryColor: '#1D4ED8', theme: { v: 1, success: { headline: 'You are in' } } });
    await open('Thank you');
    expect(screen.getByLabelText('Headline')).toHaveValue('You are in');
    await userEvent.clear(screen.getByLabelText('Headline'));
    expect(update).toHaveBeenLastCalledWith({ theme: null });
  });

  it('saves an accent colour, and only a hex', async () => {
    const update = draw();
    await open('Thank you');
    await userEvent.type(screen.getByLabelText('Accent'), 'green{Enter}');
    expect(update).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText('Accent'), '#16A34A{Enter}');
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, success: { colour: '#16A34A' } } });
  });

  it('turns confetti on, and off again takes it out', async () => {
    const update = draw();
    await open('Thank you');
    await userEvent.click(screen.getByLabelText(/Confetti/));
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, success: { confetti: true } } });
  });

  it('chooses a picture from our library only (no Unsplash photos, they would need a credit here)', async () => {
    const update = draw();
    await open('Thank you');
    const group = screen.getByRole('group', { name: 'Picture' });
    await userEvent.click(within(group).getByRole('button', { name: 'All pictures' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('tab', { name: 'Photos from Unsplash' })).not.toBeInTheDocument();
    const first = within(dialog).getAllByRole('listitem')[0].querySelector('button')!;
    await userEvent.click(first);
    const sent = update.mock.calls[update.mock.calls.length - 1][0] as FormBranding;
    expect(sent.theme?.success?.picture).toMatch(/^\/form-pictures\/[a-z0-9-]+\.jpg$/);
  });

  it('saves a redirect only once the address is a whole https one, when the box is left', async () => {
    const update = draw();
    await open('Thank you');
    const address = screen.getByLabelText('Address');
    await userEvent.type(address, 'http://example.com');
    await userEvent.tab();
    expect(await screen.findByText('Use a full address that starts with https://')).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
    await userEvent.clear(address);
    await userEvent.type(address, 'https://example.com/welcome');
    expect(update).not.toHaveBeenCalled(); // not while it is being typed
    await userEvent.tab();
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, success: { redirect: { url: 'https://example.com/welcome' } } } });
  });

  it('with a redirect set, chooses how long people have, and clears it by emptying the address', async () => {
    const update = draw({ primaryColor: '#1D4ED8', theme: { v: 1, success: { redirect: { url: 'https://example.com', seconds: 5 } } } });
    await open('Thank you');
    const seconds = screen.getByLabelText('Wait before moving on');
    expect(seconds).toBeEnabled();
    expect(seconds).toHaveValue('5');
    await userEvent.selectOptions(seconds, '10');
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, success: { redirect: { url: 'https://example.com', seconds: 10 } } } });
    await userEvent.clear(screen.getByLabelText('Address'));
    await userEvent.tab();
    expect(update).toHaveBeenLastCalledWith({ theme: null });
  });

  it('shows the thank-you screen in the preview as soon as the section is opened, and the form again when it is left', async () => {
    draw();
    expect(screen.getByTestId('live-preview')).toHaveAttribute('data-screen', 'form');
    await open('Thank you');
    expect(screen.getByTestId('live-preview')).toHaveAttribute('data-screen', 'thanks');
    await userEvent.click(screen.getByLabelText('Show it in the preview'));
    expect(screen.getByTestId('live-preview')).toHaveAttribute('data-screen', 'form');
    await userEvent.click(screen.getByLabelText('Show it in the preview'));
    await open('Colours');
    expect(screen.getByTestId('live-preview')).toHaveAttribute('data-screen', 'form');
  });
});

describe('Background section: gradient colours and angle, darken and blur over a picture', () => {
  it('a gradient has its own two colours and an angle', async () => {
    const update = draw({ primaryColor: '#1D4ED8', backgroundStyle: 'gradient' });
    await open('Background');
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
    const angle = screen.getByRole('slider', { name: 'Angle' });
    expect(angle).toHaveValue('135'); // the usual one until it is moved
    fireEvent.change(angle, { target: { value: '60' } });
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, background: { angle: 60 } } });
  });

  it('saves a gradient colour, and only a hex', async () => {
    const update = draw({ primaryColor: '#1D4ED8', backgroundStyle: 'gradient' });
    await open('Background');
    await userEvent.type(screen.getByLabelText('From'), 'red{Enter}');
    expect(update).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText('To'), '#9333EA{Enter}');
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, background: { to: '#9333EA' } } });
  });

  it('the angle goes back to the usual one, and an emptied theme is cleared', async () => {
    const update = draw({ primaryColor: '#1D4ED8', backgroundStyle: 'gradient', theme: { v: 1, background: { angle: 60 } } });
    await open('Background');
    await userEvent.click(screen.getByRole('button', { name: 'Set angle back to the preset' }));
    expect(update).toHaveBeenLastCalledWith({ theme: null });
  });

  it('a picture can be darkened and blurred, once there is a picture', async () => {
    const update = draw({ primaryColor: '#1D4ED8', backgroundStyle: 'image', backgroundImageUrl: '/form-pictures/aurora-mint.jpg' });
    await open('Background');
    fireEvent.change(screen.getByRole('slider', { name: 'Darken' }), { target: { value: '40' } });
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, background: { darken: 40 } } });
    fireEvent.change(screen.getByRole('slider', { name: 'Blur' }), { target: { value: '8' } });
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, background: { blur: 8 } } });
  });

  it('no darken or blur without a picture, and no gradient controls on another page background', async () => {
    draw({ primaryColor: '#1D4ED8', backgroundStyle: 'image' });
    await open('Background');
    expect(screen.queryByRole('slider', { name: 'Darken' })).not.toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: 'Angle' })).not.toBeInTheDocument();
  });

  it('the cover has a banner height, from 120 to 480, in the Header tab', async () => {
    const update = draw({ primaryColor: '#1D4ED8' });
    await open('Header');
    const height = screen.getByRole('slider', { name: 'Banner height' });
    expect(height).toHaveAttribute('min', '120');
    expect(height).toHaveAttribute('max', '480');
    expect(height).toHaveValue('176');
    fireEvent.change(height, { target: { value: '300' } });
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, cover: { height: 300 } } });
  });

  it('a cover shown whole has no banner to give a height to', async () => {
    draw({ primaryColor: '#1D4ED8', coverImageUrl: '/form-pictures/aurora-mint.jpg', coverFit: 'original' });
    await open('Header');
    expect(screen.queryByRole('slider', { name: 'Banner height' })).not.toBeInTheDocument();
  });
});
