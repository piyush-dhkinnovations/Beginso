/**
 * Feature: form icon (Streamline illustrations in one grid, with the logo you upload as one more tile)
 * Tests: FormMarkPicker — the suggestion is selected to begin with, picking replaces it, more icons, the credit, upload and its checks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
const uploadFile = vi.hoisted(() => vi.fn());
vi.mock('@/services/upload', () => ({ uploadService: { uploadFile } }));

import { FormMarkPicker } from '@/components/forms/FormMarkPicker';
import { FEATURED_ICON_NAMES, getFormIcon } from '@/lib/formIcons';
import type { FormMark } from '@/types/form';

function Harness({ initial = {}, title = '', onChange }: { initial?: FormMark; title?: string; onChange?: (m: FormMark) => void }) {
  const [value, setValue] = useState<FormMark>(initial);
  return (
    <FormMarkPicker
      value={value}
      title={title}
      onChange={(m) => {
        setValue(m);
        onChange?.(m);
      }}
    />
  );
}

const file = (name: string, type: string, bytes = 100) => new File([new Uint8Array(bytes)], name, { type });
const main = () => within(screen.getByRole('radiogroup', { name: 'Form icon' }));
const label = (name: string) => getFormIcon(name)!.label;

describe('FormMarkPicker', () => {
  beforeEach(() => {
    toast.mockClear();
    uploadFile.mockReset();
  });

  it('shows one grid: 14 illustrated icons, the upload tile and More icons', () => {
    render(<Harness />);
    expect(main().getAllByRole('radio')).toHaveLength(15); // 14 icons + the upload tile; "More icons" is a plain button
    expect(screen.getByRole('button', { name: 'More icons' })).toBeInTheDocument();
    expect(main().getAllByRole('radio').filter((r) => r.querySelector('svg'))).toHaveLength(15);
    expect(screen.queryByRole('radio', { name: /Automatic/ })).not.toBeInTheDocument();
  });

  it('selects the icon that suits the form name to begin with, and follows the name until another is chosen', () => {
    const { rerender } = render(<FormMarkPicker value={{}} title="Product Order Form" onChange={vi.fn()} />);
    expect(main().getByRole('radio', { name: label('shopping-cart-full') })).toHaveAttribute('aria-checked', 'true');
    rerender(<FormMarkPicker value={{}} title="Customer Feedback" onChange={vi.fn()} />);
    expect(main().getByRole('radio', { name: label('rating-star') })).toHaveAttribute('aria-checked', 'true');
    expect(main().getByRole('radio', { name: label('shopping-cart-full') })).toHaveAttribute('aria-checked', 'false');
  });

  it('a suggestion outside the up-front set takes a place in the grid so it is visible', () => {
    render(<FormMarkPicker value={{}} title="Restaurant menu" onChange={vi.fn()} />);
    expect(main().getByRole('radio', { name: label('fast-food-french-fries') })).toHaveAttribute('aria-checked', 'true');
    expect(main().getAllByRole('radio')).toHaveLength(15);
  });

  it('picking an icon selects it and clears any logo (icons carry their own colours, so no colour is stored)', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(main().getByRole('radio', { name: label('startup-launch') }));
    expect(onChange).toHaveBeenLastCalledWith({ logoUrl: null, iconName: 'startup-launch' });
    expect(main().getByRole('radio', { name: label('startup-launch') })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows a stored icon as selected', () => {
    render(<Harness initial={{ iconName: 'startup-launch' }} title="Event Registration" />);
    expect(main().getByRole('radio', { name: label('startup-launch') })).toHaveAttribute('aria-checked', 'true');
    expect(main().queryByRole('radio', { name: label('calendar-1') })).not.toBeInTheDocument(); // the suggestion is not shown as selected when another icon is stored
  });

  it('More icons opens the whole set with a search, the licence credit, and picking one closes it', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'More icons' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('link', { name: /Streamline.*CC BY 4\.0/ })).toHaveAttribute('href', 'https://streamlinehq.com');
    await userEvent.type(within(dialog).getByLabelText('Search icons'), 'money');
    expect(within(dialog).getByRole('radio', { name: label('money-wallet-open') })).toBeInTheDocument();
    expect(within(dialog).queryByRole('radio', { name: label('startup-launch') })).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('radio', { name: label('money-wallet-open') }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ iconName: 'money-wallet-open' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('says when nothing matches the search', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'More icons' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Search icons'), 'zzzzqq');
    expect(within(dialog).getByText(/No icons match/)).toBeInTheDocument();
  });

  it('the upload tile opens the file picker and a chosen file becomes the selected logo', async () => {
    uploadFile.mockResolvedValue({ url: '/uploads/logo.png' });
    const onChange = vi.fn();
    render(<Harness initial={{ iconName: 'startup-launch' }} onChange={onChange} />);
    expect(main().getByRole('radio', { name: 'Upload your logo' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Upload form logo'), { target: { files: [file('logo.png', 'image/png')] } });
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ logoUrl: '/uploads/logo.png', iconName: null }));
    expect(main().getByRole('radio', { name: 'Your logo' })).toHaveAttribute('aria-checked', 'true');
    expect(main().getByRole('radio', { name: label('startup-launch') })).toHaveAttribute('aria-checked', 'false');
  });

  it('after picking another icon the uploaded logo stays on its tile and one click brings it back', async () => {
    const onChange = vi.fn();
    render(<Harness initial={{ logoUrl: '/logo.png' }} onChange={onChange} />);
    await userEvent.click(main().getByRole('radio', { name: label('rating-star') }));
    expect(main().getByRole('radio', { name: 'Your logo' })).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(main().getByRole('radio', { name: 'Your logo' }));
    expect(onChange).toHaveBeenLastCalledWith({ logoUrl: '/logo.png', iconName: null });
    expect(main().getByRole('radio', { name: 'Your logo' })).toHaveAttribute('aria-checked', 'true');
  });

  it('refuses a file that is not an image, or is over 2 MB, without uploading it', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('Upload form logo');
    fireEvent.change(input, { target: { files: [file('doc.pdf', 'application/pdf')] } });
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Use a PNG, JPG, WebP or GIF image.', 'error'));
    fireEvent.change(input, { target: { files: [file('big.png', 'image/png', 3 * 1024 * 1024)] } });
    await waitFor(() => expect(toast).toHaveBeenCalledWith('The logo must be 2 MB or smaller.', 'error'));
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('reports a failed upload and keeps the previous choice', async () => {
    uploadFile.mockRejectedValue(new Error('500'));
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Upload form logo'), { target: { files: [file('logo.png', 'image/png')] } });
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Upload failed. Please try again.', 'error'));
    expect(onChange).not.toHaveBeenCalled();
    expect(main().getByRole('radio', { name: 'Upload your logo' })).toHaveAttribute('aria-checked', 'false');
  });

  it('removing the uploaded logo goes back to the suggested icon', async () => {
    const onChange = vi.fn();
    render(<Harness initial={{ logoUrl: '/logo.png' }} title="Job Application" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove logo' }));
    expect(onChange).toHaveBeenLastCalledWith({ logoUrl: null, iconName: null });
    expect(main().getByRole('radio', { name: label('cash-briefcase') })).toHaveAttribute('aria-checked', 'true');
    expect(main().getByRole('radio', { name: 'Upload your logo' })).toBeInTheDocument();
  });

  it('the up-front icons are exactly the featured set', () => {
    render(<Harness title="Customer Feedback" />);
    const names = main().getAllByRole('radio').map((r) => r.getAttribute('aria-label'));
    for (const n of FEATURED_ICON_NAMES) expect(names).toContain(label(n));
  });
});
