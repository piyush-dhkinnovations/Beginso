import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmbedConfigPanel, EmbedMethodPicker } from '@/components/form-builder/embed/EmbedConfigPanel';
import { DEFAULT_EMBED_CONFIG, EMBED_METHODS, LIMITS, type EmbedConfig } from '@/lib/embed/buildEmbedSnippet';
import { makeField } from '../builderTestUtils';
import type { FormField } from '@/types/form';

/** Controlled harness: the panel is stateless, so a real parent state makes every control behave as in the app. */
function Harness({ initial, fields = [], onState }: { initial: Partial<EmbedConfig>; fields?: FormField[]; onState: (c: EmbedConfig) => void }) {
  const [config, setConfig] = useState<EmbedConfig>({ ...DEFAULT_EMBED_CONFIG, ...initial });
  onState(config);
  return (
    <>
      <EmbedMethodPicker config={config} onChange={(p) => setConfig((c) => ({ ...c, ...p }))} />
      <EmbedConfigPanel config={config} onChange={(p) => setConfig((c) => ({ ...c, ...p }))} fields={fields} />
    </>
  );
}

function setup(initial: Partial<EmbedConfig> = {}, fields: FormField[] = []) {
  let latest = { ...DEFAULT_EMBED_CONFIG, ...initial };
  render(<Harness initial={initial} fields={fields} onState={(c) => (latest = c)} />);
  return { get: () => latest };
}

describe('EmbedMethodPicker', () => {
  it('offers the five methods as one radio group with the current one selected', () => {
    setup({ method: 'popup' });
    const group = screen.getByRole('radiogroup', { name: 'How to embed' });
    expect(within(group).getAllByRole('radio')).toHaveLength(EMBED_METHODS.length);
    expect(within(group).getByRole('radio', { name: /Popup/ })).toBeChecked();
    expect(within(group).getByRole('radio', { name: /Inline, auto-height/ })).not.toBeChecked();
  });

  it('choosing a method changes the config', async () => {
    const s = setup();
    await userEvent.click(screen.getByRole('radio', { name: /Slide-over drawer/ }));
    expect(s.get().method).toBe('drawer');
  });
});

describe('EmbedConfigPanel: controls shown per method', () => {
  it('auto: width and frame styling only (no height, no button settings)', () => {
    setup({ method: 'auto' });
    expect(screen.getByLabelText('Width')).toBeInTheDocument();
    expect(screen.queryByLabelText('Height')).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Border' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Rounded corners/ })).toBeInTheDocument();
    expect(screen.queryByLabelText('Button text')).not.toBeInTheDocument();
  });

  it('fixed adds a Height control', () => {
    setup({ method: 'fixed' });
    expect(screen.getByLabelText('Height')).toBeInTheDocument();
  });

  it('popup: button settings and modal width, no frame controls', () => {
    setup({ method: 'popup' });
    expect(screen.getByLabelText('Button text')).toBeInTheDocument();
    expect(screen.getByLabelText('Modal width')).toBeInTheDocument();
    expect(screen.queryByLabelText('Drawer width')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Width')).not.toBeInTheDocument();
  });

  it('drawer: side and drawer width', () => {
    setup({ method: 'drawer' });
    expect(screen.getByLabelText('Opens from')).toBeInTheDocument();
    expect(screen.getByLabelText('Drawer width')).toBeInTheDocument();
    expect(screen.queryByLabelText('Modal width')).not.toBeInTheDocument();
  });

  it('link: nothing to configure and no shared options', () => {
    setup({ method: 'link' });
    expect(screen.getByText(/Nothing to configure/)).toBeInTheDocument();
    expect(screen.queryByText('Options for every embed')).not.toBeInTheDocument();
  });
});

describe('EmbedConfigPanel: no Beginso-branding control', () => {
  it.each(['auto', 'fixed', 'popup', 'drawer', 'link'] as const)('%s offers no way to hide Beginso branding', (method) => {
    setup({ method });
    expect(screen.queryByText(/Hide Beginso branding/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/branding/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /brand/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /brand/i })).not.toBeInTheDocument();
  });
});

describe('EmbedConfigPanel: inline sizing', () => {
  it('shows the percent range and unit by default', () => {
    setup();
    expect(screen.getByText(/10 to 100 %/)).toBeInTheDocument();
    expect((screen.getByLabelText('Width unit') as HTMLSelectElement).value).toBe('%');
  });

  it('switching to px resets the width to 640 and shows the px range; switching back resets to 100', async () => {
    const s = setup();
    await userEvent.selectOptions(screen.getByLabelText('Width unit'), 'px');
    expect(s.get()).toMatchObject({ widthUnit: 'px', widthValue: 640 });
    expect(screen.getByText(/200 to 2000 px/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Width unit'), '%');
    expect(s.get()).toMatchObject({ widthUnit: '%', widthValue: 100 });
  });

  it('typing a width updates it live', () => {
    const s = setup({ widthUnit: 'px', widthValue: 640 });
    fireEvent.change(screen.getByLabelText('Width'), { target: { value: '800' } });
    expect(s.get().widthValue).toBe(800);
  });

  it('on blur an out-of-range width snaps into the allowed range', () => {
    const s = setup({ widthUnit: 'px', widthValue: 5000 });
    fireEvent.blur(screen.getByLabelText('Width'));
    expect(s.get().widthValue).toBe(LIMITS.widthPx[1]);
  });

  it('on blur an emptied (NaN) number falls back to the range minimum', () => {
    const s = setup({ method: 'fixed', height: 600 });
    const h = screen.getByLabelText('Height');
    fireEvent.change(h, { target: { value: '' } });
    expect(s.get().height).toBeNaN();
    fireEvent.blur(h);
    expect(s.get().height).toBe(LIMITS.height[0]);
  });

  it('border and rounded switches toggle', async () => {
    const s = setup({ border: false, rounded: true });
    await userEvent.click(screen.getByRole('switch', { name: 'Border' }));
    await userEvent.click(screen.getByRole('switch', { name: /Rounded corners/ }));
    expect(s.get()).toMatchObject({ border: true, rounded: false });
  });
});

describe('EmbedConfigPanel: button methods', () => {
  it('button text is limited in length and editable', () => {
    const s = setup({ method: 'popup' });
    const input = screen.getByLabelText('Button text');
    expect(input).toHaveAttribute('maxlength', String(LIMITS.buttonText));
    fireEvent.change(input, { target: { value: 'Book a demo' } });
    expect(s.get().buttonText).toBe('Book a demo');
  });

  it('button colour is upper-cased and shown as hex', () => {
    const s = setup({ method: 'popup', buttonColor: '#1D4ED8' });
    fireEvent.change(screen.getByLabelText('Button colour'), { target: { value: '#00ff00' } });
    expect(s.get().buttonColor).toBe('#00FF00');
    expect(screen.getByText('#00FF00')).toBeInTheDocument();
  });

  it('an invalid stored colour falls back to the default in the picker', () => {
    setup({ method: 'popup', buttonColor: 'red' });
    expect((screen.getByLabelText('Button colour') as HTMLInputElement).value).toBe('#1d4ed8');
  });

  it('button size, drawer side and widths are editable', async () => {
    const s = setup({ method: 'drawer' });
    await userEvent.selectOptions(screen.getByLabelText('Button size'), 'large');
    await userEvent.selectOptions(screen.getByLabelText('Opens from'), 'left');
    fireEvent.change(screen.getByLabelText('Drawer width'), { target: { value: '600' } });
    expect(s.get()).toMatchObject({ buttonSize: 'large', side: 'left', drawerWidth: 600 });
  });

  it('popup edits the modal width', () => {
    const s = setup({ method: 'popup' });
    fireEvent.change(screen.getByLabelText('Modal width'), { target: { value: '900' } });
    expect(s.get().modalWidth).toBe(900);
  });
});

describe('EmbedConfigPanel: options for every embed', () => {
  it('toggles cover, background, progress and hide title', async () => {
    const s = setup();
    await userEvent.click(screen.getByRole('switch', { name: /Show cover/ }));
    await userEvent.click(screen.getByRole('switch', { name: /Show page background/ }));
    await userEvent.click(screen.getByRole('switch', { name: /Show progress/ }));
    await userEvent.click(screen.getByRole('switch', { name: /Hide form title/ }));
    expect(s.get()).toMatchObject({ cover: false, background: false, progress: false, hideTitle: true });
  });

  it('picks a theme', async () => {
    const s = setup();
    expect((screen.getByLabelText('Theme') as HTMLSelectElement).value).toBe('light');
    await userEvent.selectOptions(screen.getByLabelText('Theme'), 'auto');
    expect(s.get().theme).toBe('auto');
  });
});

describe('EmbedConfigPanel: pre-fill', () => {
  const email = makeField('email', { label: 'Work email' });
  const file = makeField('file_upload', { label: 'Resume' });
  const gone = makeField('short_text', { label: 'Deleted one', deleted: true });

  it('suggests only fillable, live fields', () => {
    const { container } = render(<Harness initial={{}} fields={[email, file, gone]} onState={() => {}} />);
    const options = Array.from(container.querySelectorAll('#embed-prefill-keys option')).map((o) => o.getAttribute('value'));
    expect(options).toEqual(['Work email']);
  });

  it('adds and removes rows', async () => {
    const s = setup({}, [email]);
    await userEvent.click(screen.getByRole('button', { name: /Add pre-fill/ }));
    expect(s.get().prefill).toHaveLength(1);
    expect(screen.getByLabelText('Pre-fill field 1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove pre-fill 1' }));
    expect(s.get().prefill).toHaveLength(0);
  });

  it('typing edits the right row only', async () => {
    const s = setup({ prefill: [{ id: 'a', key: '', value: '' }, { id: 'b', key: '', value: '' }] }, [email]);
    fireEvent.change(screen.getByLabelText('Pre-fill field 2'), { target: { value: 'Work email' } });
    fireEvent.change(screen.getByLabelText('Pre-fill value 2'), { target: { value: 'a@b.co' } });
    expect(s.get().prefill).toEqual([{ id: 'a', key: '', value: '' }, { id: 'b', key: 'Work email', value: 'a@b.co' }]);
  });

  it('flags a key that matches no field', () => {
    setup({ prefill: [{ id: 'a', key: 'Nope', value: 'x' }] }, [email]);
    expect(screen.getByText(/No field of this form has that id or label/)).toBeInTheDocument();
  });

  it('flags a value the matched field cannot hold', () => {
    setup({ prefill: [{ id: 'a', key: 'Work email', value: 'not-an-email' }] }, [email]);
    expect(screen.getByText('Use a valid email address.')).toBeInTheDocument();
  });

  it('shows no error for a good row', () => {
    setup({ prefill: [{ id: 'a', key: 'Work email', value: 'a@b.co' }] }, [email]);
    expect(screen.queryByText(/Use a valid|No field of this form/)).not.toBeInTheDocument();
  });

  it('disables Add pre-fill at the row limit', () => {
    const rows = Array.from({ length: LIMITS.prefillRows }, (_, i) => ({ id: String(i), key: '', value: '' }));
    setup({ prefill: rows });
    expect(screen.getByRole('button', { name: /Add pre-fill/ })).toBeDisabled();
  });
});
