/**
 * The studio's controls for form colours, fields look and exact sizes: drawn choices, a Custom badge with an Undo when an exact value is in use,
 * one-tap fixes for hard-to-read colours, and options a layout cannot show switched off with the reason.
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
vi.mock('@/components/form-builder/LiveFormPreview', () => ({ LiveFormPreview: () => <div data-testid="live-preview" /> }));

beforeEach(() => toast.mockClear());

function draw(branding: FormBranding = { primaryColor: '#1D4ED8' }, layout: LayoutPreset = 'classic') {
  const onBrandingUpdate = vi.fn();
  render(<BrandingStudio formId="f1" branding={branding} layout={layout} fieldCount={3} isPublic={false} onBrandingUpdate={onBrandingUpdate} onLayoutChange={vi.fn()} />);
  return onBrandingUpdate;
}
const open = (name: string) => userEvent.click(screen.getByRole('tab', { name }));

describe('Colour tab: form colours and readability', () => {
  it('has a row for each of the six colours, and saving one sets it in branding.theme', async () => {
    const update = draw();
    await open('Colour');
    for (const label of ['Text', 'Headings', 'Card', 'Fields', 'Field border', 'Button text']) expect(screen.getByLabelText(label)).toBeInTheDocument();
    const text = screen.getByLabelText('Text');
    await userEvent.type(text, '#222222{Enter}');
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, colors: { text: '#222222' } } });
  });

  it('refuses a colour that is not a hex', async () => {
    const update = draw();
    await open('Colour');
    await userEvent.type(screen.getByLabelText('Headings'), 'purple{Enter}');
    expect(update).not.toHaveBeenCalled();
  });

  it('resets one colour, and clears the whole theme when it was the last thing in it', async () => {
    const update = draw({ primaryColor: '#1D4ED8', theme: { v: 1, colors: { heading: '#7C3AED' } } });
    await open('Colour');
    await userEvent.click(screen.getByRole('button', { name: 'Set headings back to the default' }));
    expect(update).toHaveBeenLastCalledWith({ theme: null });
  });

  it('measures the four pairs, says so when a pair cannot be measured, and fixes a failing one in one tap', async () => {
    const update = draw({ primaryColor: '#1D4ED8', backgroundStyle: 'image', theme: { v: 1, colors: { text: '#AAAAAA' } } });
    await open('Colour');
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
    await open('Colour');
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
    await open('Colour');
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

describe('Style tab: fields look', () => {
  it('choosing a field style, label position and choice style sets branding.theme.fields', async () => {
    const update = draw();
    await open('Style');
    await userEvent.click(screen.getByRole('button', { name: 'Filled' }));
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, fields: { style: 'filled' } } });
    await userEvent.click(screen.getByRole('button', { name: 'Beside the field' }));
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, fields: { label: 'start' } } });
    await userEvent.click(screen.getByRole('button', { name: 'Tiles' }));
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, fields: { choice: 'tiles' } } });
  });

  it.each<[LayoutPreset, RegExp]>([['guided', /one question per screen/], ['compact', /two columns/]])('%s: "Beside the field" is off, with the reason', async (layout, why) => {
    draw({ primaryColor: '#1D4ED8', theme: { v: 1, fields: { label: 'start' } } }, layout);
    await open('Style');
    expect(screen.getByRole('button', { name: 'Beside the field' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Above the field' })).toBeDisabled();
    expect(screen.getByText(why)).toBeInTheDocument();
  });

  it('Classic allows every option', async () => {
    draw();
    await open('Style');
    for (const name of ['Outlined', 'Filled', 'Underline', 'Square', 'Rounded', 'Pill', 'Above the field', 'Beside the field', 'Plain', 'Tiles']) expect(screen.getByRole('button', { name })).toBeEnabled();
  });

  it('an underline field has no corners, so the corner tiles are off and say why', async () => {
    draw({ primaryColor: '#1D4ED8', theme: { v: 1, fields: { style: 'underline' } } });
    await open('Style');
    expect(screen.getByRole('button', { name: 'Pill' })).toBeDisabled();
    expect(screen.getByText('Underline fields have no corners.')).toBeInTheDocument();
  });
});

describe('Custom, and back to the preset with an Undo', () => {
  it('shows Custom on the card, width and spacing groups while an exact value is in use, and no preset looks chosen', async () => {
    draw({ primaryColor: '#1D4ED8', theme: { v: 1, card: { radius: 30 }, layout: { maxWidth: 800, fieldGap: 10 } } });
    await open('Style');
    for (const label of ['Card', 'Form width', 'Spacing']) expect(within(screen.getByRole('group', { name: new RegExp(`^${label}`) })).getByText('Custom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Standard' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('has no Custom badge on a form with no exact values', async () => {
    draw();
    await open('Style');
    expect(screen.queryByText('Custom')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Standard' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('choosing a preset puts the exact value back to the preset and offers Undo, which restores both', async () => {
    const theme = { v: 1 as const, layout: { maxWidth: 800 }, colors: { text: '#222222' } };
    const update = draw({ primaryColor: '#1D4ED8', formWidth: 'narrow', theme });
    await open('Style');
    await userEvent.click(screen.getByRole('button', { name: 'Wide' }));
    expect(update).toHaveBeenLastCalledWith({ formWidth: 'wide', theme: { v: 1, colors: { text: '#222222' } } });
    expect(toast).toHaveBeenCalledWith('The form width is back to the preset.', 'info', undefined, expect.objectContaining({ label: 'Undo' }));
    toast.mock.calls[0][3].onClick();
    expect(update).toHaveBeenLastCalledWith({ formWidth: 'narrow', theme });
  });

  it('choosing a preset with no exact value in use says nothing and has nothing to undo', async () => {
    draw();
    await open('Style');
    await userEvent.click(screen.getByRole('button', { name: 'Wide' }));
    expect(toast).not.toHaveBeenCalled();
  });

  it('Fine-tune is folded away, and its sliders set exact values and reset to the preset', async () => {
    const update = draw();
    await open('Style');
    expect(screen.queryByLabelText('Card corners')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Fine-tune/ }));
    const w = screen.getByLabelText('Biggest form width') as HTMLInputElement;
    expect([w.min, w.max]).toEqual(['360', '1400']);
    expect(screen.getByText(/still fits the screen/)).toBeInTheDocument();
    const radius = screen.getByLabelText('Card corners') as HTMLInputElement;
    expect([radius.min, radius.max]).toEqual(['0', '40']);
    fireEvent.change(radius, { target: { value: '30' } });
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, card: { radius: 30 } } });
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

describe('Text tab: fonts and the heading font', () => {
  it('lists the fonts in groups, each drawn in its own typeface, and picking one sets the form font', async () => {
    const update = draw();
    await open('Text');
    const fonts = screen.getByRole('group', { name: 'Font' });
    for (const g of ['Modern', 'Serif', 'Friendly', 'Handwritten and display']) expect(within(fonts).getByRole('group', { name: g })).toBeInTheDocument();
    const serif = within(fonts).getByRole('group', { name: 'Serif' });
    expect(within(serif).getAllByRole('button').length).toBeGreaterThanOrEqual(5);
    await userEvent.click(within(serif).getByRole('button', { name: /Playfair Display/ }));
    expect(update).toHaveBeenLastCalledWith({ fontFamily: 'playfair_display' });
  });

  it('the heading font starts as "Same as the text", sets theme.fonts.heading, and clears the theme when put back', async () => {
    const update = draw();
    await open('Text');
    const select = screen.getByLabelText('Heading font') as HTMLSelectElement;
    expect(select.value).toBe('');
    await userEvent.selectOptions(select, 'caveat');
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, fonts: { heading: 'caveat' } } });
  });

  it('shows the chosen heading font, and putting it back to "Same as the text" clears it', async () => {
    const update = draw({ primaryColor: '#1D4ED8', theme: { v: 1, fonts: { heading: 'caveat' } } });
    await open('Text');
    const select = screen.getByLabelText('Heading font') as HTMLSelectElement;
    expect(select.value).toBe('caveat');
    await userEvent.selectOptions(select, '');
    expect(update).toHaveBeenLastCalledWith({ theme: null });
  });
});

describe('Style tab: the picture side', () => {
  it('on Split Feature, picking the right puts the picture on the right', async () => {
    const update = draw({ primaryColor: '#1D4ED8' }, 'split_feature');
    await open('Style');
    expect(screen.getByRole('button', { name: 'On the left' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'On the right' }));
    expect(update).toHaveBeenLastCalledWith({ theme: { v: 1, layout: { panelSide: 'end' } } });
  });

  it('shows the saved side, and the left puts it back', async () => {
    const update = draw({ primaryColor: '#1D4ED8', theme: { v: 1, layout: { panelSide: 'end' } } }, 'split_feature');
    await open('Style');
    expect(screen.getByRole('button', { name: 'On the right' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'On the left' }));
    expect(update).toHaveBeenLastCalledWith({ theme: null });
  });

  it.each<LayoutPreset>(['classic', 'chat', 'sidebar', 'open', 'focus', 'guided'])('on %s both sides are off, with the reason', async (layout) => {
    draw({ primaryColor: '#1D4ED8', theme: { v: 1, layout: { panelSide: 'end' } } }, layout);
    await open('Style');
    expect(screen.getByRole('button', { name: 'On the left' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'On the right' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'On the right' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Only the Split Feature layout has a picture panel.')).toBeInTheDocument();
  });

  it('Chat and Focus switch off "Beside the field" with their own reason', async () => {
    draw({ primaryColor: '#1D4ED8' }, 'chat');
    await open('Style');
    expect(screen.getByRole('button', { name: 'Beside the field' })).toBeDisabled();
    expect(screen.getByText(/Chat shows one question at a time/)).toBeInTheDocument();
  });
});
