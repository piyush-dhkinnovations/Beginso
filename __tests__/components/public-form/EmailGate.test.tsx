import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn(), GoogleAuthProvider: vi.fn(), signInWithPopup: vi.fn() }));
const mockAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockAuth() }));
const loginWithGoogle = vi.hoisted(() => vi.fn());
vi.mock('@/services/auth', () => ({ authService: { loginWithGoogle } }));
const svc = vi.hoisted(() => ({ requestEmailVerification: vi.fn(), checkEmailCode: vi.fn() }));
vi.mock('@/services/publicForm', () => ({ publicFormService: svc }));

import { EmailGate } from '@/components/public-form/EmailGate';

const login = vi.fn();
const onVerified = vi.fn();
const mount = (notice?: string) => render(<EmailGate slug="my form" formTitle="Film submissions" notice={notice} onVerified={onVerified} />);

beforeEach(() => {
  sessionStorage.clear();
  onVerified.mockReset();
  login.mockReset().mockResolvedValue(undefined);
  loginWithGoogle.mockReset().mockResolvedValue(undefined);
  mockAuth.mockReset().mockReturnValue({ user: null, login });
  svc.requestEmailVerification.mockReset().mockResolvedValue({ verificationId: 'vid-1234567890123456789012' });
  svc.checkEmailCode.mockReset().mockResolvedValue({ state: 'verified', email: 'a@b.co' });
});

// The code boxes: click the first and type; each digit moves on to the next.
async function typeCode(code: string) {
  await userEvent.click(await screen.findByLabelText('Digit 1 of 6'));
  await userEvent.keyboard(code);
}

async function sendCodeTo(address: string) {
  await userEvent.type(screen.getByLabelText('Email address'), address);
  await userEvent.click(screen.getByRole('button', { name: 'Send code' }));
}

describe('EmailGate', () => {
  it('starts with only an email field, Send code, and Google; no password and no Create account', () => {
    mount();
    expect(screen.getByRole('heading', { name: 'Confirm your email to respond' })).toBeInTheDocument();
    expect(screen.getByText('Film submissions')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send code' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue with Google/ })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Password/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Create account/i)).not.toBeInTheDocument();
  });

  it('refuses an address that is not an email without asking the backend', async () => {
    mount();
    await sendCodeTo('nope');
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(svc.requestEmailVerification).not.toHaveBeenCalled();
  });

  it('sends the code, then asks for it with the address shown', async () => {
    mount();
    await sendCodeTo('a@b.co');
    expect(svc.requestEmailVerification).toHaveBeenCalledWith('my form', 'a@b.co');
    expect(await screen.findByRole('heading', { name: 'Enter your code' })).toBeInTheDocument();
    expect(screen.getByText('a@b.co')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '6-digit code' })).toBeInTheDocument();
    expect(screen.getAllByLabelText(/^Digit \d of 6$/)).toHaveLength(6);
    expect(screen.getByLabelText('Digit 1 of 6')).toHaveAttribute('autocomplete', 'one-time-code');
    expect(screen.getByLabelText('Digit 1 of 6')).toHaveFocus();
  });

  it('checks the code by itself on the sixth digit and hands the proof up', async () => {
    mount();
    await sendCodeTo('a@b.co');
    await typeCode('123456');
    await waitFor(() => expect(svc.checkEmailCode).toHaveBeenCalledWith('my form', 'vid-1234567890123456789012', '123456'));
    expect(onVerified).toHaveBeenCalledWith({ kind: 'code', email: 'a@b.co', verificationId: 'vid-1234567890123456789012' });
  });

  it('only digits go in, one per box', async () => {
    mount();
    await sendCodeTo('a@b.co');
    await userEvent.click(await screen.findByLabelText('Digit 1 of 6'));
    await userEvent.keyboard('1a2-3');
    expect(['Digit 1 of 6', 'Digit 2 of 6', 'Digit 3 of 6', 'Digit 4 of 6'].map((n) => (screen.getByLabelText(n) as HTMLInputElement).value)).toEqual(['1', '2', '3', '']);
  });

  it('a pasted code fills all six boxes, spaces and dashes and all', async () => {
    mount();
    await sendCodeTo('a@b.co');
    await userEvent.click(await screen.findByLabelText('Digit 1 of 6'));
    await userEvent.paste('482 913');
    await waitFor(() => expect(svc.checkEmailCode).toHaveBeenCalledWith('my form', 'vid-1234567890123456789012', '482913'));
    expect(onVerified).toHaveBeenCalled();
  });

  it('a code pasted into a later box still replaces the whole code', async () => {
    mount();
    await sendCodeTo('a@b.co');
    await userEvent.click(await screen.findByLabelText('Digit 4 of 6'));
    await userEvent.paste('482913');
    await waitFor(() => expect(svc.checkEmailCode).toHaveBeenCalledWith('my form', 'vid-1234567890123456789012', '482913'));
  });

  it('an autofill of the whole code into the first box spreads across the boxes', async () => {
    mount();
    await sendCodeTo('a@b.co');
    fireEvent.change(await screen.findByLabelText('Digit 1 of 6'), { target: { value: '482913' } });
    await waitFor(() => expect(svc.checkEmailCode).toHaveBeenCalledWith('my form', 'vid-1234567890123456789012', '482913'));
  });

  it('Backspace steps back to the previous box and clears it', async () => {
    mount();
    await sendCodeTo('a@b.co');
    await userEvent.click(await screen.findByLabelText('Digit 1 of 6'));
    await userEvent.keyboard('12');
    await userEvent.keyboard('{Backspace}'); // box 3 is empty: clears box 2 and moves there
    expect((screen.getByLabelText('Digit 2 of 6') as HTMLInputElement).value).toBe('');
    expect(screen.getByLabelText('Digit 2 of 6')).toHaveFocus();
    expect((screen.getByLabelText('Digit 1 of 6') as HTMLInputElement).value).toBe('1');
  });

  it('says how many tries are left after a wrong code, and clears the box', async () => {
    svc.checkEmailCode.mockResolvedValue({ state: 'wrong', attemptsLeft: 4 });
    mount();
    await sendCodeTo('a@b.co');
    await typeCode('000000');
    expect(await screen.findByText('That code is not right. 4 tries left.')).toBeInTheDocument();
    expect(screen.getByLabelText('Digit 1 of 6')).toHaveValue('');
    await waitFor(() => expect(screen.getByLabelText('Digit 1 of 6')).toHaveFocus()); // ready to type again
    expect(onVerified).not.toHaveBeenCalled();
  });

  it.each([
    ['locked', /Too many wrong codes/],
    ['expired', /has expired/],
    ['invalid', /no longer works/],
  ])('explains a %s code and offers a new one', async (state, text) => {
    svc.checkEmailCode.mockResolvedValue({ state });
    mount();
    await sendCodeTo('a@b.co');
    await typeCode('000000');
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send a new code/ })).toBeInTheDocument();
  });

  it('a new code cannot be asked for twice in a row', async () => {
    mount();
    await sendCodeTo('a@b.co');
    const again = await screen.findByRole('button', { name: /Send a new code \(\d+s\)/ });
    expect(again).toBeDisabled();
  });

  it('"Change email" goes back to the email step', async () => {
    mount();
    await sendCodeTo('a@b.co');
    await userEvent.click(await screen.findByRole('button', { name: 'Change email' }));
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
  });

  it('says so when the code could not be sent', async () => {
    svc.requestEmailVerification.mockRejectedValue(new Error('We could not send the code. Please try again.'));
    mount();
    await sendCodeTo('a@b.co');
    expect(await screen.findByText('We could not send the code. Please try again.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
  });

  it('after Google the reload goes straight in as that account: no "Continue as" screen', async () => {
    sessionStorage.setItem('beginso:gate-google:my form', '1');
    mockAuth.mockReturnValue({ user: { email: 'me@x.co' }, login });
    mount();
    expect(screen.queryByRole('button', { name: /Continue as/ })).not.toBeInTheDocument();
    await waitFor(() => expect(onVerified).toHaveBeenCalledWith({ kind: 'account' }));
    expect(sessionStorage.getItem('beginso:gate-google:my form')).toBeNull(); // used once
  });

  it('signing in with Google leaves the one-time flag, then goes to this same form', async () => {
    mount();
    await userEvent.click(screen.getByRole('button', { name: /Continue with Google/ }));
    await waitFor(() => expect(login).toHaveBeenCalledWith('/f/my%20form'));
    expect(loginWithGoogle).toHaveBeenCalled();
    expect(sessionStorage.getItem('beginso:gate-google:my form')).toBe('1');
  });

  it('a signed-in account continues in one click, with no code; "Use a different email" opens the code step', async () => {
    mockAuth.mockReturnValue({ user: { email: 'me@x.co' }, login });
    mount();
    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Continue as me@x.co' }));
    expect(onVerified).toHaveBeenCalledWith({ kind: 'account' });
    await userEvent.click(screen.getByRole('button', { name: 'Use a different email' }));
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
  });

  it('shows a notice above the gate when there is one', () => {
    mount('Your confirmation ran out.');
    expect(screen.getByRole('status')).toHaveTextContent('Your confirmation ran out.');
  });
});
