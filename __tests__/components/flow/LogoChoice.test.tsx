import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: mockToast }) }));
const mockUpload = vi.fn();
vi.mock('@/services/upload', () => ({ uploadService: { uploadFile: (f: File) => mockUpload(f) } }));

import { LogoChoice } from '@/components/flow/LogoChoice';

const file = (name: string, type: string, size = 100) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

function setup(props: Partial<React.ComponentProps<typeof LogoChoice>> = {}) {
  const onChange = vi.fn();
  render(<LogoChoice value={null} onChange={onChange} subject="form" {...props} />);
  return { onChange };
}
const input = () => screen.getByLabelText(/Upload (form|workspace) logo/) as HTMLInputElement;

describe('LogoChoice', () => {
  beforeEach(() => {
    mockToast.mockReset();
    mockUpload.mockReset();
  });

  it('defaults to the BeginSo logo with helper copy per subject', () => {
    setup();
    expect(screen.getByRole('group', { name: 'Form logo' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /BeginSo default/ })).toBeChecked();
    expect(screen.getByText(/Shown on the form card/)).toBeInTheDocument();
  });

  it('uses workspace wording', () => {
    setup({ subject: 'workspace' });
    expect(screen.getByRole('group', { name: 'Workspace logo' })).toBeInTheDocument();
    expect(screen.getByText(/Shown in the sidebar/)).toBeInTheDocument();
  });

  it('choosing Upload opens the file picker and marks that card chosen', async () => {
    const user = userEvent.setup();
    setup();
    const click = vi.spyOn(input(), 'click');
    await user.click(screen.getByRole('radio', { name: /Upload your logo/ }));
    expect(click).toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: /Upload your logo/ })).toBeChecked();
  });

  it('uploads a valid image and reports its URL', async () => {
    mockUpload.mockResolvedValue({ url: 'https://cdn/x.png' });
    const { onChange } = setup();
    fireEvent.change(input(), { target: { files: [file('a.png', 'image/png')] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('https://cdn/x.png'));
    expect(mockUpload).toHaveBeenCalledTimes(1);
  });

  it('rejects a non-image type without uploading', async () => {
    const { onChange } = setup();
    fireEvent.change(input(), { target: { files: [file('a.pdf', 'application/pdf')] } });
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Use a PNG, JPG, WebP or GIF image.', 'error'));
    expect(mockUpload).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects a file over 2 MB but accepts exactly 2 MB', async () => {
    mockUpload.mockResolvedValue({ url: 'u' });
    const { onChange } = setup();
    fireEvent.change(input(), { target: { files: [file('big.png', 'image/png', 2 * 1024 * 1024 + 1)] } });
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('The logo must be 2 MB or smaller.', 'error'));
    expect(mockUpload).not.toHaveBeenCalled();
    fireEvent.change(input(), { target: { files: [file('ok.png', 'image/png', 2 * 1024 * 1024)] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('u'));
  });

  it('shows an error and falls back to the default choice when the upload fails', async () => {
    const user = userEvent.setup();
    mockUpload.mockRejectedValue(new Error('x'));
    const { onChange } = setup();
    await user.click(screen.getByRole('radio', { name: /Upload your logo/ }));
    fireEvent.change(input(), { target: { files: [file('a.png', 'image/png')] } });
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Upload failed. Please try again.', 'error'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: /BeginSo default/ })).toBeChecked();
  });

  it('shows the uploaded logo with Replace and Remove', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ value: 'https://cdn/x.png' });
    expect(screen.getByAltText('Your uploaded logo')).toHaveAttribute('src', 'https://cdn/x.png');
    expect(screen.getByText('Your logo')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Your logo/ })).toBeChecked();
    const click = vi.spyOn(input(), 'click');
    await user.click(screen.getByRole('button', { name: 'Replace' }));
    expect(click).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Remove logo' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('picking BeginSo default clears the logo', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ value: 'https://cdn/x.png' });
    await user.click(screen.getByRole('radio', { name: /BeginSo default/ }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('disables everything when disabled', () => {
    setup({ disabled: true });
    expect(screen.getByRole('group', { name: 'Form logo' })).toBeDisabled();
  });
});
