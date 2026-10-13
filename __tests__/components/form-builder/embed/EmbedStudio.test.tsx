import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmbedStudio } from '@/components/form-builder/embed/EmbedStudio';
import { EMBED_MSG } from '@/lib/embed/embedParams';
import { makeField } from '../builderTestUtils';
import type { FormField, FormPage } from '@/types/form';
import type { EmbedContext } from '@/lib/embed/buildEmbedSnippet';

const ctx: EmbedContext = { origin: 'https://app.test', slug: 'abc', formTitle: 'Survey' };
const pages: FormPage[] = [{ id: 'page-1', order: 0 }];
const email = makeField('email', { label: 'Work email' });

function setup(over: { ctx?: EmbedContext | null; fields?: FormField[]; pages?: FormPage[] } = {}) {
  const onCopy = vi.fn();
  const utils = render(
    <EmbedStudio ctx={over.ctx === undefined ? ctx : over.ctx} fields={over.fields ?? [email]} pages={over.pages ?? pages} onCopy={onCopy} />
  );
  return { onCopy, ...utils };
}

const pickMethod = (name: RegExp) => userEvent.click(screen.getByRole('radio', { name }));
const codeTab = () => userEvent.click(screen.getByRole('button', { name: /Code to paste|^Link$/ }));

describe('EmbedStudio', () => {
  it('asks to publish first when there is no public link, but still shows the settings', () => {
    setup({ ctx: null });
    expect(screen.getByText('Publish the form to get its embed code.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Copy code/ })).not.toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'How to embed' })).toBeInTheDocument();
  });

  it('defaults to the inline auto-height method with a live preview', () => {
    setup();
    expect(screen.getByRole('radio', { name: /Inline, auto-height/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Live preview' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTitle('Live preview of Survey')).toBeInTheDocument();
  });

  it('the code tab shows the snippet for the chosen method and keeps the preview mounted', async () => {
    setup();
    await codeTab();
    const pre = screen.getByLabelText('Embed code');
    expect(pre).toHaveTextContent('data-beginso-form="abc"');
    expect(pre).toHaveTextContent('https://app.test/embed.js');
    expect(pre).toHaveAttribute('tabindex', '0');
    expect(screen.getByTitle('Live preview of Survey')).toBeInTheDocument();
  });

  it('every control changes the code immediately (no Generate button)', async () => {
    setup();
    await userEvent.click(screen.getByRole('switch', { name: /Show cover/ }));
    await codeTab();
    expect(screen.getByLabelText('Embed code')).toHaveTextContent('cover=0');
    expect(screen.queryByRole('button', { name: /Generate/ })).not.toBeInTheDocument();
  });

  it('fixed method emits an iframe with a fallback link', async () => {
    setup();
    await pickMethod(/Inline, fixed size/);
    await codeTab();
    expect(screen.getByLabelText('Embed code')).toHaveTextContent('<iframe');
    expect(screen.getByLabelText('Embed code')).toHaveTextContent('https://app.test/f/abc?embed=1');
  });

  it('popup and drawer emit a trigger button', async () => {
    setup();
    await pickMethod(/^Popup/);
    await codeTab();
    expect(screen.getByLabelText('Embed code')).toHaveTextContent('data-beginso-popup="abc"');
    await userEvent.click(screen.getByRole('button', { name: 'Live preview' }));
    await pickMethod(/Slide-over drawer/);
    await codeTab();
    expect(screen.getByLabelText('Embed code')).toHaveTextContent('data-beginso-drawer="abc"');
  });

  it('link method shows just the public URL and relabels the tab and copy button', async () => {
    const { onCopy } = setup();
    await pickMethod(/Full-page link/);
    await codeTab();
    expect(screen.getByLabelText('Link').textContent).toBe('https://app.test/f/abc');
    await userEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(onCopy).toHaveBeenCalledWith('https://app.test/f/abc', 'Link copied to clipboard.');
  });

  it('Copy code passes the exact snippet and a message', async () => {
    const { onCopy } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(onCopy).toHaveBeenCalledTimes(1);
    const [text, message] = onCopy.mock.calls[0];
    expect(text).toContain('data-beginso-form="abc"');
    expect(message).toBe('Embed code copied.');
  });

  it('explains the no-JavaScript fallback for script-based methods only', async () => {
    setup();
    await codeTab();
    expect(screen.getByText(/Without JavaScript the visitor sees a plain link/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Live preview' }));
    await pickMethod(/Inline, fixed size/);
    await codeTab();
    expect(screen.queryByText(/Without JavaScript/)).not.toBeInTheDocument();
  });

  it('includes a valid pre-fill row in the output and drops invalid ones', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /Add pre-fill/ }));
    await userEvent.click(screen.getByRole('button', { name: /Add pre-fill/ }));
    fireEvent.change(screen.getByLabelText('Pre-fill field 1'), { target: { value: 'Work email' } });
    fireEvent.change(screen.getByLabelText('Pre-fill value 1'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('Pre-fill field 2'), { target: { value: 'No such field' } });
    fireEvent.change(screen.getByLabelText('Pre-fill value 2'), { target: { value: 'zzz' } });
    await codeTab();
    const code = screen.getByLabelText('Embed code').textContent!;
    expect(code).toContain('prefill[Work%20email]=a%40b.co');
    expect(code).not.toContain('No such field');
  });

  it('lists every parameter under Advanced, with defaults', () => {
    setup();
    expect(screen.getByText('Advanced: every parameter')).toBeInTheDocument();
    expect(screen.getAllByRole('term').length).toBeGreaterThan(3);
  });

  it('warns when a fixed frame is shorter than the form, and clears when the height is raised', async () => {
    const many = [makeField('short_text'), makeField('short_text'), makeField('short_text'), makeField('short_text')];
    setup({ fields: many });
    await pickMethod(/Inline, fixed size/);
    fireEvent.change(screen.getByLabelText('Height'), { target: { value: '200' } });
    expect(screen.getByText('This frame is shorter than your form.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Height'), { target: { value: '2000' } });
    expect(screen.queryByText('This frame is shorter than your form.')).not.toBeInTheDocument();
  });

  it('never warns about height for auto-height or when the form is short', async () => {
    setup();
    expect(screen.queryByText('This frame is shorter than your form.')).not.toBeInTheDocument();
    await pickMethod(/Inline, fixed size/);
    expect(screen.queryByText('This frame is shorter than your form.')).not.toBeInTheDocument();
  });

  it('a taller measurement from the live preview can trigger the warning', async () => {
    setup();
    await pickMethod(/Inline, fixed size/);
    fireEvent.change(screen.getByLabelText('Height'), { target: { value: '600' } });
    expect(screen.queryByText('This frame is shorter than your form.')).not.toBeInTheDocument();
    const frame = screen.getByTitle('Live preview of Survey') as HTMLIFrameElement;
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { type: EMBED_MSG.height, height: 1500 }, origin: window.location.origin, source: frame.contentWindow }));
    });
    expect(screen.getByText('This frame is shorter than your form.')).toBeInTheDocument();
  });

  it('offers no way to hide Beginso branding anywhere in the studio', async () => {
    setup();
    expect(screen.queryByText(/branding/i)).not.toBeInTheDocument();
    for (const name of [/Inline, fixed size/, /^Popup/, /Slide-over drawer/, /Full-page link/]) {
      await pickMethod(name);
      expect(screen.queryByText(/branding/i)).not.toBeInTheDocument();
    }
  });
});
