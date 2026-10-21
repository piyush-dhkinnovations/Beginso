import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel, type SettingsPanelProps } from '@/components/form-builder/SettingsPanel';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));

function setup(over: Partial<SettingsPanelProps> = {}) {
  const onUpdate = vi.fn();
  const utils = render(<SettingsPanel settings={{ honeypotEnabled: true }} status="draft" onUpdate={onUpdate} {...over} />);
  return { onUpdate, ...utils };
}

beforeEach(() => {
  toast.mockReset();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true });
});

describe('SettingsPanel: access mode', () => {
  it('defaults to "anyone with the link" with its explanation', () => {
    setup();
    expect((screen.getByLabelText('Who can respond') as HTMLSelectElement).value).toBe('open');
    expect(screen.getByText(/No email and no tracking/)).toBeInTheDocument();
  });

  it('changing it reports the new mode', async () => {
    const { onUpdate } = setup();
    await userEvent.selectOptions(screen.getByLabelText('Who can respond'), 'tracked');
    expect(onUpdate).toHaveBeenCalledWith({ accessMode: 'tracked' });
  });

  it('tracked mode explains the verification and that the emails never contain answers', () => {
    setup({ settings: { honeypotEnabled: true, accessMode: 'tracked' } });
    expect(screen.getByText(/press Verify beside it/)).toBeInTheDocument();
    expect(screen.getByText(/The emails never contain their answers/)).toBeInTheDocument();
    expect(screen.queryByText('Add an Email question to use this')).not.toBeInTheDocument();
  });

  it('tracked mode on a form with no Email question says to add one', () => {
    setup({ settings: { honeypotEnabled: true, accessMode: 'tracked' }, hasEmailField: false });
    expect(screen.getByText('Add an Email question to use this')).toBeInTheDocument();
  });

  it('other modes never ask for an Email question', () => {
    setup({ settings: { honeypotEnabled: true, accessMode: 'open' }, hasEmailField: false });
    expect(screen.queryByText('Add an Email question to use this')).not.toBeInTheDocument();
  });

  it('login mode warns about reduced completions', () => {
    setup({ settings: { honeypotEnabled: true, accessMode: 'login' } });
    expect(screen.getByText('Requiring login reduces completions')).toBeInTheDocument();
    expect(screen.getByText(/confirmation email and can also see their submission under My submissions/)).toBeInTheDocument();
  });
});

describe('SettingsPanel: response limit', () => {
  it('is off by default and hides the number input', () => {
    setup();
    expect(screen.getByRole('switch', { name: 'Limit responses' })).not.toBeChecked();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('turning it on sends BOTH the limit and the enabled flag (the backend enforces off the flag)', async () => {
    const { onUpdate } = setup();
    await userEvent.click(screen.getByRole('switch', { name: 'Limit responses' }));
    expect(onUpdate).toHaveBeenCalledWith({ responseLimit: 1, responseLimitEnabled: true });
  });

  it('turning it off clears the limit and the flag', async () => {
    const { onUpdate } = setup({ settings: { honeypotEnabled: true, responseLimit: 50, responseLimitEnabled: true } });
    await userEvent.click(screen.getByRole('switch', { name: 'Limit responses' }));
    expect(onUpdate).toHaveBeenCalledWith({ responseLimit: undefined, responseLimitEnabled: false });
  });

  it('an explicit responseLimitEnabled=false wins over a leftover limit value', () => {
    setup({ settings: { honeypotEnabled: true, responseLimit: 50, responseLimitEnabled: false } });
    expect(screen.getByRole('switch', { name: 'Limit responses' })).not.toBeChecked();
  });

  it('forms saved before the flag existed infer enabled from the limit', () => {
    setup({ settings: { honeypotEnabled: true, responseLimit: 50 } });
    expect(screen.getByRole('switch', { name: 'Limit responses' })).toBeChecked();
    expect(screen.getByRole('spinbutton')).toHaveValue(50);
  });

  it('commits a valid integer on blur', async () => {
    const { onUpdate } = setup({ settings: { honeypotEnabled: true, responseLimit: 5, responseLimitEnabled: true } });
    const input = screen.getByRole('spinbutton');
    await userEvent.clear(input);
    await userEvent.type(input, '25');
    await userEvent.tab();
    expect(onUpdate).toHaveBeenCalledWith({ responseLimit: 25, responseLimitEnabled: true });
  });

  it.each(['0', '-3', '2.5', ''])('rejects %j with an inline error and does not save', async (value) => {
    const { onUpdate } = setup({ settings: { honeypotEnabled: true, responseLimit: 5, responseLimitEnabled: true } });
    const input = screen.getByRole('spinbutton');
    await userEvent.clear(input);
    if (value) await userEvent.type(input, value);
    await userEvent.tab();
    expect(screen.getByText('Enter a positive whole number')).toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('the error clears when the saved limit changes from outside', () => {
    const { rerender, onUpdate } = setup({ settings: { honeypotEnabled: true, responseLimit: 5, responseLimitEnabled: true } });
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '0' } });
    fireEvent.blur(screen.getByRole('spinbutton'));
    expect(screen.getByText('Enter a positive whole number')).toBeInTheDocument();
    rerender(<SettingsPanel settings={{ honeypotEnabled: true, responseLimit: 9, responseLimitEnabled: true }} status="draft" onUpdate={onUpdate} />);
    expect(screen.queryByText('Enter a positive whole number')).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue(9);
  });
});

describe('SettingsPanel: close date', () => {
  it('is off by default', () => {
    setup();
    expect(screen.getByRole('switch', { name: 'Auto-close on a date' })).not.toBeChecked();
  });

  it('turning it on stores an ISO instant', async () => {
    const { onUpdate } = setup();
    await userEvent.click(screen.getByRole('switch', { name: 'Auto-close on a date' }));
    expect(onUpdate).toHaveBeenCalledWith({ closeDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/) });
  });

  it('turning it off clears it', async () => {
    const { onUpdate } = setup({ settings: { honeypotEnabled: true, closeDate: '2099-01-01T00:00:00.000Z' } });
    await userEvent.click(screen.getByRole('switch', { name: 'Auto-close on a date' }));
    expect(onUpdate).toHaveBeenCalledWith({ closeDate: undefined });
  });

  it('shows the stored instant in local time and writes picks back as UTC ISO', () => {
    const iso = new Date(2099, 5, 15, 16, 30).toISOString();
    const { onUpdate, container } = setup({ settings: { honeypotEnabled: true, closeDate: iso } });
    const input = container.querySelector('#close-date-value') as HTMLInputElement;
    expect(input.value).toBe('2099-06-15T16:30');
    fireEvent.change(input, { target: { value: '2099-07-01T09:15' } });
    expect(onUpdate).toHaveBeenCalledWith({ closeDate: new Date(2099, 6, 1, 9, 15).toISOString() });
  });

  it('clearing the picker removes the date', () => {
    const { onUpdate, container } = setup({ settings: { honeypotEnabled: true, closeDate: '2099-01-01T00:00:00.000Z' } });
    fireEvent.change(container.querySelector('#close-date-value')!, { target: { value: '' } });
    expect(onUpdate).toHaveBeenCalledWith({ closeDate: undefined });
  });

  it('warns when the date is in the past, not when it is in the future', () => {
    const { unmount } = setup({ settings: { honeypotEnabled: true, closeDate: '2001-01-01T00:00:00.000Z' } });
    expect(screen.getByText(/This date is in the past/)).toBeInTheDocument();
    unmount();
    setup({ settings: { honeypotEnabled: true, closeDate: '2099-01-01T00:00:00.000Z' } });
    expect(screen.queryByText(/This date is in the past/)).not.toBeInTheDocument();
  });
});

describe('SettingsPanel: success message, honeypot and public URL', () => {
  it('commits the success message on blur and counts characters', async () => {
    const { onUpdate } = setup({ settings: { honeypotEnabled: true, successMessage: 'Hi' } });
    expect(screen.getByText('2/500')).toBeInTheDocument();
    const box = screen.getByPlaceholderText('Thank you for your response!');
    expect(box).toHaveAttribute('maxlength', '500');
    await userEvent.type(box, ' there');
    expect(screen.getByText('8/500')).toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(onUpdate).toHaveBeenCalledWith({ successMessage: 'Hi there' });
  });

  it('follows an external change to the success message', () => {
    const { rerender, onUpdate } = setup({ settings: { honeypotEnabled: true, successMessage: 'A' } });
    rerender(<SettingsPanel settings={{ honeypotEnabled: true, successMessage: 'B' }} status="draft" onUpdate={onUpdate} />);
    expect(screen.getByPlaceholderText('Thank you for your response!')).toHaveValue('B');
  });

  it('the honeypot switch reflects and toggles the setting', async () => {
    const { onUpdate } = setup();
    const sw = screen.getByRole('switch', { name: 'Honeypot spam protection' });
    expect(sw).toBeChecked();
    await userEvent.click(sw);
    expect(onUpdate).toHaveBeenCalledWith({ honeypotEnabled: false });
  });

  it('shows no public URL for a draft, or for a published form without a slug', () => {
    const { unmount } = setup({ status: 'draft', slug: 'abc' });
    expect(screen.queryByText('Public URL')).not.toBeInTheDocument();
    unmount();
    setup({ status: 'published' });
    expect(screen.queryByText('Public URL')).not.toBeInTheDocument();
  });

  it('a published form shows its link and copies it', async () => {
    const { container } = setup({ status: 'published', slug: 'abc' });
    expect((container.querySelector('#public-url') as HTMLInputElement).value).toMatch(/\/f\/abc$/);
    await userEvent.click(screen.getByRole('button', { name: 'Copy public URL' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringMatching(/\/f\/abc$/));
    expect(toast).toHaveBeenCalledWith('Link copied to clipboard.', 'success');
  });
});
