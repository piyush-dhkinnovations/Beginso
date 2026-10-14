/**
 * PublicFormShell — the respondent-facing form: page navigation, validation, review step, submission
 * outcomes, access modes, preview mode and logic-hidden fields. Services, router and auth are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const mockAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockAuth() }));

const svc = vi.hoisted(() => ({
  recordView: vi.fn(),
  submitForm: vi.fn(),
  getSubmitTicket: vi.fn(),
}));
vi.mock('@/services/publicForm', () => ({ publicFormService: svc }));

import { PublicFormShell } from '@/components/public-form/PublicFormShell';
import type { PublicFormSchema } from '@/types/publicForm';
import type { FormField } from '@/types/form';
import { makeField } from './fields/harness';

const text = (id: string, label: string, over: Record<string, unknown> = {}): FormField =>
  makeField({ fieldId: id, label, type: 'short_text', ...over });

function schema(over: Partial<PublicFormSchema> = {}, fields?: FormField[], layout?: string): PublicFormSchema {
  return {
    title: 'Contact us',
    pages: [{ id: 'p1', title: 'Contact us', order: 0 }] as PublicFormSchema['pages'],
    fields: fields ?? [text('name', 'Name', { required: true, order: 0 }), text('note', 'Note', { order: 1 })],
    branding: {},
    ...over,
    settings: { ...{ honeypotEnabled: true, layout }, ...(over.settings ?? {}) } as PublicFormSchema['settings'],
  };
}

const twoPage = (): PublicFormSchema =>
  schema({
    pages: [
      { id: 'p1', title: 'Step one', order: 0 },
      { id: 'p2', title: 'Step two', order: 1 },
    ] as PublicFormSchema['pages'],
  }, [
    text('a', 'First', { pageId: 'p1', required: true, order: 0 }),
    text('b', 'Second', { pageId: 'p2', required: true, order: 0 }),
  ]);

beforeEach(() => {
  push.mockReset();
  svc.recordView.mockReset();
  svc.submitForm.mockReset().mockResolvedValue({ ok: true, status: 200 });
  svc.getSubmitTicket.mockReset().mockResolvedValue({ ticket: 'tkt', expiresInSeconds: 120 });
  mockAuth.mockReset().mockReturnValue({ user: null, isLoading: false });
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  sessionStorage.clear();
});

describe('PublicFormShell single page', () => {
  it('renders the page title, the fields and a Submit button (no review for one page)', () => {
    render(<PublicFormShell schema={schema()} slug="s" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Contact us');
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Review answers' })).not.toBeInTheDocument();
  });

  it('shows the required error and does not submit when a required field is empty', async () => {
    render(<PublicFormShell schema={schema()} slug="s" />);
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This field is required');
    expect(svc.submitForm).not.toHaveBeenCalled();
  });

  it('passes a filled honeypot through to the backend so it can discard the bot submission', async () => {
    const { container } = render(<PublicFormShell schema={schema()} slug="s" />);
    await userEvent.type(screen.getByLabelText(/Name/), 'Bot');
    const trap = container.querySelector('input[name="_hp"]') as HTMLInputElement;
    expect(trap).not.toBeNull();
    await userEvent.type(trap, 'gotcha');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(svc.submitForm).toHaveBeenCalledTimes(1));
    expect(svc.submitForm.mock.calls[0][3]).toBe('gotcha');
  });

  it('submits answers, a blank honeypot and navigates to the success page with the title', async () => {
    render(<PublicFormShell schema={schema({ settings: { successMessage: 'Thanks!' } as PublicFormSchema['settings'] })} slug="my-form" />);
    await userEvent.type(screen.getByLabelText(/Name/), 'Asha');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(svc.submitForm).toHaveBeenCalledTimes(1));
    const [slug, data, files, honeypot, opts] = svc.submitForm.mock.calls[0];
    expect(slug).toBe('my-form');
    expect(data.answers).toEqual(expect.arrayContaining([expect.objectContaining({ fieldId: 'name', fieldType: 'short_text', fieldLabel: 'Name', value: 'Asha' })]));
    expect(data).not.toHaveProperty('respondentEmail');
    expect(files).toEqual({});
    expect(honeypot).toBe('');
    expect(opts).toEqual({ ticket: undefined });

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    const url = new URL(push.mock.calls[0][0], 'http://x');
    expect(url.pathname).toBe('/f/my-form/success');
    expect(url.searchParams.get('title')).toBe('Contact us');
    expect(url.searchParams.get('message')).toBe('Thanks!');
  });

  it('records one view per tab session', () => {
    const { unmount } = render(<PublicFormShell schema={schema()} slug="s" />);
    unmount();
    render(<PublicFormShell schema={schema()} slug="s" />);
    expect(svc.recordView).toHaveBeenCalledTimes(1);
    expect(svc.recordView).toHaveBeenCalledWith('s');
  });

});

describe('PublicFormShell submit failures', () => {
  async function submitWith(result: unknown) {
    svc.submitForm.mockResolvedValue(result);
    render(<PublicFormShell schema={schema()} slug="s" />);
    await userEvent.type(screen.getByLabelText(/Name/), 'Asha');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
  }

  it.each([
    [{ ok: false, status: 429 }, /Too many submissions/],
    [{ ok: false, status: 413 }, /answers are too large/],
    [{ ok: false, status: 422, message: 'Phone is invalid' }, /Phone is invalid/],
    [{ ok: false, status: 400, message: 'Field too long' }, /Field too long/],
    [{ ok: false, status: 400 }, /attachment is too large/],
    [{ ok: false, status: 500 }, /Something went wrong/],
    [{ ok: false, status: 401, code: 'LOGIN_REQUIRED' }, /sign-in has expired/],
  ])('maps %j to a friendly message', async (result, message) => {
    await submitWith(result);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
  });

  it('reports a network failure', async () => {
    svc.submitForm.mockRejectedValue(new Error('offline'));
    render(<PublicFormShell schema={schema()} slug="s" />);
    await userEvent.type(screen.getByLabelText(/Name/), 'Asha');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to connect');
  });
});

describe('PublicFormShell multi-page flow', () => {
  it('Next validates the current page, then advances; Back returns with values kept', async () => {
    render(<PublicFormShell schema={twoPage()} slug="s" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Step one');
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('required');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Step one');

    await userEvent.type(screen.getByLabelText(/First/), 'one');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Step two' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review answers' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByLabelText(/First/)).toHaveValue('one');
  });

  it('in preview mode Next moves on without answering a required question, so every page can be seen', async () => {
    render(<PublicFormShell schema={twoPage()} slug="s" previewMode />);
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Step two' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('review shows every page, Back returns to the form, and Submit sends all answers', async () => {
    render(<PublicFormShell schema={twoPage()} slug="s" />);
    await userEvent.type(screen.getByLabelText(/First/), 'one');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await userEvent.type(await screen.findByLabelText(/Second/), 'two');
    await userEvent.click(screen.getByRole('button', { name: 'Review answers' }));

    expect(await screen.findByRole('heading', { name: 'Review your answers' })).toBeInTheDocument();
    expect(screen.getByText('First').nextSibling).toHaveTextContent('one');
    expect(screen.getByText('Second').nextSibling).toHaveTextContent('two');
    expect(svc.submitForm).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByLabelText(/Second/)).toHaveValue('two');

    await userEvent.click(screen.getByRole('button', { name: 'Review answers' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(svc.submitForm).toHaveBeenCalledTimes(1));
    expect(svc.submitForm.mock.calls[0][1].answers.map((a: { fieldId: string }) => a.fieldId)).toEqual(['a', 'b']);
  });

  it('an inline edit on the review screen updates the answer shown', async () => {
    render(<PublicFormShell schema={twoPage()} slug="s" />);
    await userEvent.type(screen.getByLabelText(/First/), 'one');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await userEvent.type(await screen.findByLabelText(/Second/), 'two');
    await userEvent.click(screen.getByRole('button', { name: 'Review answers' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Edit First' }));
    const input = screen.getByLabelText(/First/);
    await userEvent.clear(input);
    await userEvent.type(input, 'changed');
    await userEvent.click(screen.getByRole('button', { name: 'Save answer' }));
    await waitFor(() => expect(screen.getByText('First').nextSibling).toHaveTextContent('changed'));
  });

  it('shows the page description when set', () => {
    const s = twoPage();
    s.pages[0].description = 'Tell us about you';
    render(<PublicFormShell schema={s} slug="s" />);
    expect(screen.getByText('Tell us about you')).toBeInTheDocument();
  });
});

describe('PublicFormShell preview mode', () => {
  it('does not record a view and never submits; shows the preview note', async () => {
    render(<PublicFormShell schema={schema()} slug="s" previewMode />);
    expect(svc.recordView).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText(/Name/), 'Asha');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('This is a preview — nothing was submitted.')).toBeInTheDocument();
    expect(svc.submitForm).not.toHaveBeenCalled();
  });

  it('?preview=1 behaves as preview mode too', () => {
    render(<PublicFormShell schema={schema()} slug="s" search="?preview=1" />);
    expect(svc.recordView).not.toHaveBeenCalled();
  });

  it('onTestSubmit adds a test button that sends validated answers', async () => {
    const onTestSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PublicFormShell schema={schema()} slug="s" previewMode onTestSubmit={onTestSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Send a test submission' }));
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
    expect(onTestSubmit).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText(/Name/), 'Asha');
    await userEvent.click(screen.getByRole('button', { name: 'Send a test submission' }));
    await waitFor(() => expect(onTestSubmit).toHaveBeenCalledTimes(1));
    expect(onTestSubmit.mock.calls[0][0][0]).toMatchObject({ fieldId: 'name', value: 'Asha' });
    expect(await screen.findByText(/Test submission recorded/)).toBeInTheDocument();
  });

  it('shows the error from a rejected test submission', async () => {
    const onTestSubmit = vi.fn().mockRejectedValue(new Error('Not allowed'));
    render(<PublicFormShell schema={schema()} slug="s" previewMode onTestSubmit={onTestSubmit} />);
    await userEvent.type(screen.getByLabelText(/Name/), 'Asha');
    await userEvent.click(screen.getByRole('button', { name: 'Send a test submission' }));
    expect(await screen.findByText('Not allowed')).toBeInTheDocument();
  });
});

describe('PublicFormShell access modes', () => {
  const tracked = () => schema({ settings: { accessMode: 'tracked' } as PublicFormSchema['settings'] });

  it('tracked: refuses an invalid email before sending anything', async () => {
    render(<PublicFormShell schema={tracked()} slug="s" />);
    await userEvent.type(screen.getByLabelText(/Name/), 'Asha');
    await userEvent.type(screen.getByLabelText(/Your email/), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(svc.submitForm).not.toHaveBeenCalled();
  });

  it('tracked: sends the trimmed email outside the answers', async () => {
    render(<PublicFormShell schema={tracked()} slug="s" />);
    await userEvent.type(screen.getByLabelText(/Name/), 'Asha');
    await userEvent.type(screen.getByLabelText(/Your email/), '  a@b.co ');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(svc.submitForm).toHaveBeenCalled());
    const data = svc.submitForm.mock.calls[0][1];
    expect(data.respondentEmail).toBe('a@b.co');
    expect(data.answers.some((a: { fieldId: string }) => a.fieldId === 'respondent-email')).toBe(false);
  });

  it('tracked: shows the server EMAIL_REQUIRED message against the email input', async () => {
    svc.submitForm.mockResolvedValue({ ok: false, status: 422, code: 'EMAIL_REQUIRED', message: 'Email needed' });
    render(<PublicFormShell schema={tracked()} slug="s" />);
    await userEvent.type(screen.getByLabelText(/Name/), 'Asha');
    await userEvent.type(screen.getByLabelText(/Your email/), 'a@b.co');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Email needed')).toBeInTheDocument();
  });

  const login = () => schema({ settings: { accessMode: 'login' } as PublicFormSchema['settings'] });

  it('login: shows a checking state while auth loads', () => {
    mockAuth.mockReturnValue({ user: null, isLoading: true });
    render(<PublicFormShell schema={login()} slug="s" />);
    expect(screen.getByRole('status')).toHaveTextContent('Checking your sign-in');
    expect(screen.queryByLabelText(/Name/)).not.toBeInTheDocument();
  });

  it('login: a signed-out visitor sees the gate instead of the form', () => {
    render(<PublicFormShell schema={login()} slug="s" />);
    expect(screen.getByText('Sign in to respond')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login?next=%2Ff%2Fs');
    expect(screen.queryByLabelText(/Name/)).not.toBeInTheDocument();
  });

  it('login: the owner preview is never gated', () => {
    render(<PublicFormShell schema={login()} slug="s" previewMode />);
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
  });

  it('login: a signed-in respondent submits with a one-shot ticket', async () => {
    mockAuth.mockReturnValue({ user: { email: 'me@x.co' }, isLoading: false });
    render(<PublicFormShell schema={login()} slug="s" />);
    expect(screen.getByText('me@x.co')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Name/), 'Asha');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(svc.submitForm).toHaveBeenCalled());
    expect(svc.submitForm.mock.calls[0][4]).toEqual({ ticket: 'tkt' });
  });

  it('login: "Responding as" is the first thing in the form, above the title and every question', () => {
    mockAuth.mockReturnValue({ user: { email: 'me@x.co' }, isLoading: false });
    const { container } = render(<PublicFormShell schema={login()} slug="s" />);
    const who = screen.getByText('Responding as', { exact: false });
    const form = container.querySelector('form')!;
    expect(form.firstElementChild).toBe(who);
    expect(who.compareDocumentPosition(screen.getByLabelText(/Name/)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(who.compareDocumentPosition(screen.getByRole('button', { name: 'Submit' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('login: a failed ticket request stops the submission with a sign-in message', async () => {
    mockAuth.mockReturnValue({ user: { email: 'me@x.co' }, isLoading: false });
    svc.getSubmitTicket.mockRejectedValue(new Error('401'));
    render(<PublicFormShell schema={login()} slug="s" />);
    await userEvent.type(screen.getByLabelText(/Name/), 'Asha');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not confirm your sign-in');
    expect(svc.submitForm).not.toHaveBeenCalled();
  });
});

describe('PublicFormShell logic and drafts', () => {
  it('a field hidden by a logic rule is not shown, not required and not submitted', async () => {
    const fields = [
      text('kind', 'Kind', { order: 0, logicRules: [{ condition: { fieldId: 'kind', operator: 'equals', value: 'other' }, action: 'show', targetFieldId: 'why' }] }),
      text('why', 'Why', { order: 1, required: true }),
    ];
    render(<PublicFormShell schema={schema({}, fields)} slug="s" />);
    expect(screen.queryByLabelText(/Why/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(svc.submitForm).toHaveBeenCalled());
    expect(svc.submitForm.mock.calls[0][1].answers.map((a: { fieldId: string }) => a.fieldId)).not.toContain('why');
  });

  it('a rule that shows a field reveals it once the source matches', async () => {
    const fields = [
      text('kind', 'Kind', { order: 0, logicRules: [{ condition: { fieldId: 'kind', operator: 'equals', value: 'other' }, action: 'show', targetFieldId: 'why' }] }),
      text('why', 'Why', { order: 1 }),
    ];
    render(<PublicFormShell schema={schema({}, fields)} slug="s" />);
    await userEvent.type(screen.getByLabelText('Kind'), 'other');
    expect(await screen.findByLabelText('Why')).toBeInTheDocument();
  });

  it('restores a saved draft on mount', async () => {
    localStorage.setItem('beginso:draft:s', JSON.stringify({ pageIndex: 0, values: { name: 'Saved' } }));
    render(<PublicFormShell schema={schema()} slug="s" />);
    await waitFor(() => expect(screen.getByLabelText(/Name/)).toHaveValue('Saved'));
  });

  it('?prefill[Name]=... fills a matching field', async () => {
    render(<PublicFormShell schema={schema()} slug="s" search="?prefill[Name]=Asha" />);
    await waitFor(() => expect(screen.getByLabelText(/Name/)).toHaveValue('Asha'));
  });

  it('autosaves the draft after a pause in typing', async () => {
    render(<PublicFormShell schema={schema()} slug="s" />);
    await userEvent.type(screen.getByLabelText(/Name/), 'Asha');
    await waitFor(() => expect(localStorage.getItem('beginso:draft:s')).toContain('Asha'), { timeout: 2000 });
  });
});

describe('PublicFormShell layouts', () => {
  it('guided shows one question at a time with a counter and always ends in review', async () => {
    render(<PublicFormShell schema={schema({}, undefined, 'guided')} slug="s" />);
    expect(await screen.findByText('Question 1 of 2')).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Note')).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Name/), 'Asha');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByLabelText('Note')).toBeInTheDocument();
    expect(screen.getByText('Question 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review answers' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByLabelText(/Name/)).toHaveValue('Asha');
  });

  it('steps layout names the steps', async () => {
    render(<PublicFormShell schema={{ ...twoPage(), settings: { honeypotEnabled: true, layout: 'steps' } as PublicFormSchema['settings'] }} slug="s" />);
    expect(await screen.findByRole('status')).toHaveTextContent('Step 1 of 2: Step one');
  });

  it('card_stack wraps the fields in a fieldset with a screen-reader legend', async () => {
    render(<PublicFormShell schema={schema({}, undefined, 'card_stack')} slug="s" />);
    expect(await screen.findByRole('group', { name: 'Contact us' })).toBeInTheDocument();
  });

  it('embed ?title=1 hides the visible heading text but keeps it for screen readers', () => {
    render(<PublicFormShell schema={schema()} slug="s" search="?title=1" />);
    expect(screen.getByRole('heading', { level: 1 }).className).toContain('sr-only');
  });
});
