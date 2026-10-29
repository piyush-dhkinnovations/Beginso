import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShareView } from '@/components/form-builder/ShareView';
import { makeForm } from '../forms/formsTestUtils';
import type { Form } from '@/types/form';

const toast = vi.hoisted(() => vi.fn());
const getFormById = vi.hoisted(() => vi.fn());
const listWorkspaces = vi.hoisted(() => vi.fn());
const toDataURL = vi.hoisted(() => vi.fn());
const studioProps = vi.hoisted(() => ({ last: null as null | { ctx: unknown; fields: unknown[]; pages: unknown[]; onCopy: (t: string, m: string) => void } }));

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/services/forms', () => ({ formsService: { getFormById: (...a: unknown[]) => getFormById(...a) } }));
vi.mock('@/services/workspaces', () => ({ workspacesService: { list: (...a: unknown[]) => listWorkspaces(...a) } }));
vi.mock('qrcode', () => ({ toDataURL: (...a: unknown[]) => toDataURL(...a) }));
vi.mock('@/components/form-builder/embed/EmbedStudio', () => ({
  EmbedStudio: (p: NonNullable<typeof studioProps.last>) => {
    studioProps.last = p;
    return <div data-testid="studio">{p.ctx ? 'studio-live' : 'studio-draft'}</div>;
  },
}));

const published = (over: Partial<Form> = {}) => makeForm({ _id: 'f1', title: 'My Survey', status: 'published', slug: 'abc', ...over });

const openEmbed = async () => userEvent.click(await screen.findByRole('button', { name: 'Set up embed' }));

function renderView(props: Partial<React.ComponentProps<typeof ShareView>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ShareView formId="f1" {...props} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  toast.mockReset();
  studioProps.last = null;
  getFormById.mockReset().mockResolvedValue(published());
  listWorkspaces.mockReset().mockResolvedValue([{ id: 'w1', slug: 'acme', name: 'Acme', role: 'owner' }]);
  toDataURL.mockReset().mockResolvedValue('data:image/png;base64,AAA');
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true });
});

describe('ShareView: loading and errors', () => {
  it('shows a loading skeleton first', () => {
    getFormById.mockReturnValue(new Promise(() => {}));
    renderView();
    expect(screen.getByLabelText('Loading Share & Embed')).toBeInTheDocument();
  });

  it.each([
    [403, 'You do not have access to this form.'],
    [404, 'This form could not be found.'],
  ])('a %s shows its own empty state', async (status, text) => {
    getFormById.mockRejectedValue({ response: { status } });
    renderView();
    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  it('any other failure shows an error with a Retry that refetches', async () => {
    getFormById.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(published());
    renderView();
    expect(await screen.findByText('We could not load this form.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Public link')).toBeInTheDocument();
    expect(getFormById).toHaveBeenCalledTimes(2);
  });
});

describe('ShareView: roles', () => {
  it('a personal form is always the caller\'s own, so sharing is available', async () => {
    renderView();
    expect(await screen.findByText('Public link')).toBeInTheDocument();
    expect(listWorkspaces).not.toHaveBeenCalled();
  });

  it('a Reviewer on a workspace form gets "Sharing is not available for your role."', async () => {
    getFormById.mockResolvedValue(published({ workspaceId: 'w1' }));
    listWorkspaces.mockResolvedValue([{ id: 'w1', slug: 'acme', name: 'Acme', role: 'viewer' }]);
    renderView();
    expect(await screen.findByText('Sharing is not available for your role.')).toBeInTheDocument();
    expect(screen.queryByTestId('studio')).not.toBeInTheDocument();
  });

  it('fails closed when the workspace of a shared form is not in the caller\'s list', async () => {
    getFormById.mockResolvedValue(published({ workspaceId: 'someone-elses' }));
    renderView();
    expect(await screen.findByText('Sharing is not available for your role.')).toBeInTheDocument();
  });

  it('an Editor can share but cannot publish from here', async () => {
    getFormById.mockResolvedValue(published({ workspaceId: 'w1', status: 'draft', slug: 'abc' }));
    listWorkspaces.mockResolvedValue([{ id: 'w1', slug: 'acme', name: 'Acme', role: 'member' }]);
    renderView();
    expect(await screen.findByText(/Your Editor role cannot publish/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish now' })).not.toBeInTheDocument();
  });
});

describe('ShareView: draft', () => {
  const draft = () => getFormById.mockResolvedValue(makeForm({ _id: 'f1', title: 'My Survey', status: 'draft', slug: 'reserved' }));

  it('warns, disables the link and copy, and hands the studio no context', async () => {
    draft();
    renderView();
    expect(await screen.findByText('This form is not published yet.')).toBeInTheDocument();
    expect(screen.getByLabelText('Public form link')).toBeDisabled();
    expect(screen.getByLabelText('Public form link')).toHaveValue('');
    expect(screen.getByRole('button', { name: /Copy/ })).toBeDisabled();
    expect(screen.queryByRole('link', { name: /Open form/ })).not.toBeInTheDocument();
    await openEmbed();
    expect(screen.getByTestId('studio')).toHaveTextContent('studio-draft');
    expect(toDataURL).not.toHaveBeenCalled();
  });

  it('standalone: links to the editor to publish', async () => {
    draft();
    renderView();
    expect(await screen.findByRole('link', { name: 'Publish in the editor' })).toHaveAttribute('href', '/forms/f1/edit');
  });

  it('embedded: opens the publish dialog via the callback', async () => {
    draft();
    const onOpenPublish = vi.fn();
    renderView({ embedded: true, onOpenPublish });
    await userEvent.click(await screen.findByRole('button', { name: 'Publish now' }));
    expect(onOpenPublish).toHaveBeenCalledTimes(1);
  });

  it('a "published" form with no slug is treated as not live', async () => {
    getFormById.mockResolvedValue(makeForm({ _id: 'f1', status: 'published' }));
    renderView();
    expect(await screen.findByText('This form is not published yet.')).toBeInTheDocument();
  });
});

describe('ShareView: live', () => {
  it('shows the public link, an Open form link and the studio with an absolute origin context', async () => {
    renderView();
    const input = (await screen.findByLabelText('Public form link')) as HTMLInputElement;
    expect(input.value).toMatch(/\/f\/abc$/);
    expect(input).toHaveAttribute('readonly');
    expect(input).toBeEnabled();
    const open = screen.getByRole('link', { name: /Open form/ });
    expect(open).toHaveAttribute('target', '_blank');
    expect(open).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByTestId('studio')).not.toBeInTheDocument(); // the embed builder opens on request
    await openEmbed();
    expect(screen.getByTestId('studio')).toHaveTextContent('studio-live');
    expect(studioProps.last?.ctx).toMatchObject({ slug: 'abc', formTitle: 'My Survey' });
    expect((studioProps.last?.ctx as { origin: string }).origin).toMatch(/^https?:\/\//);
  });

  it('prefers publishedSlug over slug', async () => {
    getFormById.mockResolvedValue(published({ publishedSlug: 'pub9', slug: 'old' }));
    renderView();
    expect(((await screen.findByLabelText('Public form link')) as HTMLInputElement).value).toMatch(/\/f\/pub9$/);
  });

  it('Copy writes the link and confirms; failure is reported', async () => {
    renderView();
    await userEvent.click(await screen.findByRole('button', { name: /Copy/ }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringMatching(/\/f\/abc$/));
    expect(toast).toHaveBeenCalledWith('Link copied to clipboard.', 'success');

    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('x')) }, configurable: true });
    await userEvent.click(screen.getByRole('button', { name: /Copy/ }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Could not copy. Select the text and copy it manually.', 'error'));
  });

  it('copying from the studio uses the same clipboard path with the studio\'s message', async () => {
    renderView();
    await openEmbed();
    await screen.findByTestId('studio');
    studioProps.last!.onCopy('<iframe/>', 'Embed code copied.');
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('<iframe/>'));
    expect(toast).toHaveBeenCalledWith('Embed code copied.', 'success');
  });

  it('generates a QR code for the link and shows it', async () => {
    renderView();
    const img = await screen.findByAltText('QR code linking to the public form');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,AAA');
    expect(toDataURL).toHaveBeenCalledWith(expect.stringMatching(/\/f\/abc$/), { width: 200, margin: 1 });
  });

  it('Download QR saves a file named after the form', async () => {
    const clicks: HTMLAnchorElement[] = [];
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      clicks.push(this);
    };
    try {
      getFormById.mockResolvedValue(published({ title: 'My Survey #1!' }));
      renderView();
      await screen.findByAltText('QR code linking to the public form');
      await userEvent.click(screen.getByRole('button', { name: /Download QR/ }));
      expect(clicks).toHaveLength(1);
      expect(clicks[0].download).toBe('my-survey--1--qr.png');
      expect(clicks[0].href).toBe('data:image/png;base64,AAA');
    } finally {
      HTMLAnchorElement.prototype.click = orig;
    }
  });

  it('if the QR encoder fails, says so and disables the download', async () => {
    toDataURL.mockRejectedValue(new Error('x'));
    renderView();
    expect(await screen.findByText('QR code could not be generated.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download QR/ })).toBeDisabled();
  });
});

describe('ShareView: layout', () => {
  it('standalone shows a page header with a breadcrumb through Forms and the form', async () => {
    renderView();
    expect(await screen.findByRole('heading', { name: 'Share & Embed', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forms' })).toHaveAttribute('href', '/forms');
    expect(screen.getByRole('link', { name: 'My Survey' })).toHaveAttribute('href', '/forms/f1/overview');
  });

  it('workspace forms use the workspace in the breadcrumb', async () => {
    getFormById.mockResolvedValue(published({ workspaceId: 'w1' }));
    renderView();
    expect(await screen.findByRole('link', { name: 'Acme' })).toHaveAttribute('href', '/w/acme');
  });

  it('embedded drops the page header and breadcrumb but keeps the status badge', async () => {
    renderView({ embedded: true });
    expect(await screen.findByRole('heading', { name: 'Share & Embed', level: 2 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Forms' })).not.toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('says who can respond and sends the owner to Settings to change it', async () => {
    const onOpenSettings = vi.fn();
    renderView({ embedded: true, onOpenSettings });
    expect(await screen.findByText(/Anyone with the link can respond/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Change who can respond in Settings' }));
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it('passes the form\'s fields and pages to the embed studio', async () => {
    getFormById.mockResolvedValue(published({ pages: [{ id: 'p', order: 0 }] }));
    renderView();
    await openEmbed();
    await screen.findByTestId('studio');
    expect(studioProps.last?.pages).toHaveLength(1);
  });
});
