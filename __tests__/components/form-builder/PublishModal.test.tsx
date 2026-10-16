import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublishModal, type PublishFlowProps } from '@/components/form-builder/PublishModal';

const toast = vi.hoisted(() => vi.fn());
const svc = vi.hoisted(() => ({
  getReadiness: vi.fn(),
  publishForm: vi.fn(),
  unpublishForm: vi.fn(),
  regenerateLink: vi.fn(),
}));
const pref = vi.hoisted(() => ({ value: { preference: 'all' as string | undefined, isError: false } }));

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/services/forms', () => ({ formsService: svc }));
vi.mock('@/hooks/useWorkspaceTimezone', () => ({ useWorkspaceTimezone: () => 'UTC' }));
vi.mock('@/hooks/useMyNotificationPreference', () => ({ useMyNotificationPreference: () => pref.value }));

function props(over: Partial<PublishFlowProps> = {}): PublishFlowProps {
  return {
    isOpen: true,
    onClose: vi.fn(),
    formId: 'f1',
    formTitle: 'Survey',
    status: 'draft',
    slug: 'abc123',
    settings: { honeypotEnabled: true },
    scope: 'acme',
    canPublish: true,
    onStatusChange: vi.fn(),
    onChangeSetting: vi.fn(),
    onFixField: vi.fn(),
    ...over,
  };
}

function renderModal(p: PublishFlowProps) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <PublishModal {...p} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  toast.mockReset();
  Object.values(svc).forEach((f) => f.mockReset());
  svc.getReadiness.mockResolvedValue({ ready: true, blocking: [], warnings: [] });
  svc.publishForm.mockResolvedValue({ slug: 'abc123' });
  pref.value = { preference: 'all', isError: false };
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true });
});

describe('PublishModal: pre-flight', () => {
  it('renders nothing while closed', () => {
    renderModal(props({ isOpen: false }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(svc.getReadiness).not.toHaveBeenCalled();
  });

  it('is titled with the form name and checks readiness on the server', async () => {
    renderModal(props());
    expect(screen.getByRole('dialog', { name: 'Publish Survey' })).toBeInTheDocument();
    await screen.findByText('Public URL');
    expect(svc.getReadiness).toHaveBeenCalledWith('f1');
  });

  it('falls back to a generic title for an untitled form', () => {
    renderModal(props({ formTitle: '' }));
    expect(screen.getByRole('dialog', { name: 'Publish form' })).toBeInTheDocument();
  });

  it('shows a skeleton and a disabled Publish while the check is running', () => {
    svc.getReadiness.mockReturnValue(new Promise(() => {}));
    renderModal(props());
    expect(screen.getByLabelText('Checking your form')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('summarises URL, access, closing date and notifications', async () => {
    renderModal(props({ settings: { honeypotEnabled: true, accessMode: 'tracked', closeDate: '2026-12-31T10:00:00.000Z' } }));
    // No URL before publishing: the draft's slug is not the one issued at publish (QA A4-006 / A14-001).
    expect(await screen.findByText(/A link will be created when you publish/)).toBeInTheDocument();
    expect(screen.queryByText(/\/f\/abc123/)).not.toBeInTheDocument();
    expect(screen.getByText(/asked for their email/)).toBeInTheDocument();
    expect(screen.getByText(/31 Dec 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Email me on every response/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/w/acme/settings?tab=notifications');
  });

  it('defaults to "anyone with the link", "No closing date" and says a link will be created when there is no slug yet', async () => {
    renderModal(props({ slug: undefined }));
    expect(await screen.findByText(/Anyone with the link — no email, no tracking/)).toBeInTheDocument();
    expect(screen.getByText('No closing date')).toBeInTheDocument();
    expect(screen.getByText(/A link will be created/)).toBeInTheDocument();
  });

  it('warns that requiring login reduces completions', async () => {
    renderModal(props({ settings: { honeypotEnabled: true, accessMode: 'login' } }));
    expect(await screen.findByText('Requiring login reduces completions on public forms.')).toBeInTheDocument();
  });

  it('personal forms have no email notifications and link to personal settings', async () => {
    renderModal(props({ scope: 'personal' }));
    expect(await screen.findByText('No email notifications on personal forms')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
  });

  it.each([
    ['mine', /assigned to me or on forms I created/],
    ['none', /No response emails/],
  ])('shows the %s notification preference', async (preference, text) => {
    pref.value = { preference, isError: false };
    renderModal(props());
    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  it('shows "Unavailable" when the preference failed to load', async () => {
    pref.value = { preference: undefined, isError: true };
    renderModal(props());
    expect(await screen.findByText('Unavailable')).toBeInTheDocument();
  });

  it('"Change" buttons open Settings', async () => {
    const p = props();
    renderModal(p);
    await userEvent.click(await screen.findByRole('button', { name: 'Change who can respond' }));
    await userEvent.click(screen.getByRole('button', { name: 'Change the closing date' }));
    expect(p.onChangeSetting).toHaveBeenCalledTimes(2);
  });

  it('publishing sends the chosen access mode and close date, then reports the new slug', async () => {
    svc.publishForm.mockResolvedValue({ slug: 'newslug' });
    const p = props({ settings: { honeypotEnabled: true, accessMode: 'login', closeDate: '2026-12-31T10:00:00.000Z' } });
    renderModal(p);
    await userEvent.click(await screen.findByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(p.onStatusChange).toHaveBeenCalledWith('published', 'newslug'));
    expect(svc.publishForm).toHaveBeenCalledWith('f1', { accessMode: 'login', closeDate: '2026-12-31T10:00:00.000Z' });
    expect(toast).toHaveBeenCalledWith('Form published successfully!', 'success');
  });

  it('publishing with nothing configured sends an empty body', async () => {
    renderModal(props());
    await userEvent.click(await screen.findByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(svc.publishForm).toHaveBeenCalledWith('f1', {}));
  });

  it('a failed publish toasts the error and does not change status', async () => {
    svc.publishForm.mockRejectedValue(new Error('nope'));
    const p = props();
    renderModal(p);
    await userEvent.click(await screen.findByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.any(String), 'error'));
    expect(p.onStatusChange).not.toHaveBeenCalled();
  });

  it('blocking issues stop Publish and offer "Fix in editor" for field issues', async () => {
    svc.getReadiness.mockResolvedValue({
      ready: false,
      blocking: [{ code: 'NO_FIELDS', message: 'Add at least one field.' }, { code: 'BAD_OPTIONS', fieldId: 'fx', message: 'Dropdown needs options.' }],
      warnings: [],
    });
    const p = props();
    renderModal(p);
    expect(await screen.findByText('Fix these before publishing')).toBeInTheDocument();
    expect(screen.getByText('Add at least one field.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    const buttons = screen.getAllByRole('button', { name: 'Fix in editor' });
    expect(buttons).toHaveLength(1);
    await userEvent.click(buttons[0]);
    expect(p.onFixField).toHaveBeenCalledWith('fx');
  });

  it('warnings are listed (singular/plural) but never block Publish', async () => {
    svc.getReadiness.mockResolvedValue({ ready: true, blocking: [], warnings: [{ code: 'W', message: 'No closing date set.' }] });
    renderModal(props());
    expect(await screen.findByText('1 thing to check')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
  });

  it('pluralises several warnings', async () => {
    svc.getReadiness.mockResolvedValue({ ready: true, blocking: [], warnings: [{ code: 'A', message: 'a' }, { code: 'B', message: 'b' }] });
    renderModal(props());
    expect(await screen.findByText('2 things to check')).toBeInTheDocument();
  });

  it('if the readiness check fails the user may still publish, and can retry the check', async () => {
    svc.getReadiness.mockRejectedValueOnce(new Error('down')).mockResolvedValue({ ready: true, blocking: [], warnings: [] });
    renderModal(props());
    expect(await screen.findByText("We couldn't check this form")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByText("We couldn't check this form")).not.toBeInTheDocument());
    expect(svc.getReadiness).toHaveBeenCalledTimes(2);
  });

  it('Cancel closes', async () => {
    const p = props();
    renderModal(p);
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(p.onClose).toHaveBeenCalled();
  });

  it('without publish rights the dialog only explains and offers Close (no readiness call)', () => {
    const p = props({ canPublish: false });
    renderModal(p);
    expect(screen.getByText('Only Owners and Admins can publish')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
  });
});

describe('PublishModal: live', () => {
  const live = (over: Partial<PublishFlowProps> = {}) => props({ status: 'published', ...over });

  it('shows the live state with the public link and shortcuts', () => {
    renderModal(live());
    expect(screen.getByRole('dialog', { name: 'Form is live' })).toBeInTheDocument();
    expect((screen.getByLabelText('Public link') as HTMLInputElement).value).toMatch(/\/f\/abc123$/);
    expect(screen.getByRole('link', { name: /Share & embed/ })).toHaveAttribute('href', '/forms/f1/edit?tab=share');
    const view = screen.getByRole('link', { name: /View live form/ });
    expect(view).toHaveAttribute('target', '_blank');
    expect(view).toHaveAttribute('rel', 'noopener noreferrer');
    expect(svc.getReadiness).not.toHaveBeenCalled();
  });

  it('Copy writes the link to the clipboard and confirms', async () => {
    renderModal(live());
    await userEvent.click(screen.getByRole('button', { name: /Copy/ }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringMatching(/\/f\/abc123$/));
    expect(toast).toHaveBeenCalledWith('Link copied to clipboard', 'success');
  });

  it('Copy reports failure when the clipboard is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('x')) }, configurable: true });
    renderModal(live());
    await userEvent.click(screen.getByRole('button', { name: /Copy/ }));
    expect(toast).toHaveBeenCalledWith('Could not copy. Select the link and copy it manually.', 'error');
  });

  it('Unpublish sets the form back to draft, closes, and offers an Undo that republishes', async () => {
    svc.unpublishForm.mockResolvedValue({});
    svc.publishForm.mockResolvedValue({ slug: 'abc123' });
    const p = live();
    renderModal(p);
    await userEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
    await waitFor(() => expect(p.onStatusChange).toHaveBeenCalledWith('draft', 'abc123'));
    expect(p.onClose).toHaveBeenCalled();
    const call = toast.mock.calls.find(([m]) => m === 'Form unpublished')!;
    expect(call[1]).toBe('success');
    expect(call[3].label).toBe('Undo');
    call[3].onClick();
    await waitFor(() => expect(p.onStatusChange).toHaveBeenLastCalledWith('published', 'abc123'));
    expect(toast).toHaveBeenCalledWith('Form is live again', 'success');
  });

  it('a failed Undo toasts an error', async () => {
    svc.unpublishForm.mockResolvedValue({});
    svc.publishForm.mockRejectedValue(new Error('x'));
    renderModal(live());
    await userEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
    await waitFor(() => expect(toast.mock.calls.some(([m]) => m === 'Form unpublished')).toBe(true));
    toast.mock.calls.find(([m]) => m === 'Form unpublished')![3].onClick();
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.any(String), 'error'));
  });

  it('a failed unpublish toasts an error and leaves status alone', async () => {
    svc.unpublishForm.mockRejectedValue(new Error('x'));
    const p = live();
    renderModal(p);
    await userEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.any(String), 'error'));
    expect(p.onStatusChange).not.toHaveBeenCalled();
  });

  it('generating a new link needs an explicit confirmation, and can be backed out of', async () => {
    renderModal(live());
    await userEvent.click(screen.getByRole('button', { name: 'Generate a new link' }));
    expect(screen.getByText(/Anything already shared with the old link/)).toBeInTheDocument();
    expect(svc.regenerateLink).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Keep current link' }));
    expect(screen.queryByText(/Anything already shared/)).not.toBeInTheDocument();
  });

  it('confirming generates the link and reports the new slug', async () => {
    svc.regenerateLink.mockResolvedValue({ slug: 'fresh' });
    const p = live();
    renderModal(p);
    await userEvent.click(screen.getByRole('button', { name: 'Generate a new link' }));
    await userEvent.click(screen.getByRole('button', { name: 'Generate new link' }));
    await waitFor(() => expect(p.onStatusChange).toHaveBeenCalledWith('published', 'fresh'));
    expect(svc.regenerateLink).toHaveBeenCalledWith('f1');
    expect(toast).toHaveBeenCalledWith('New link generated. The old link no longer works.', 'success');
  });

  it('without publish rights there is no Unpublish and no link regeneration; Done closes', async () => {
    const p = live({ canPublish: false });
    renderModal(p);
    expect(screen.queryByRole('button', { name: 'Unpublish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generate a new link' })).not.toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Done' }));
    expect(p.onClose).toHaveBeenCalled();
  });
});
