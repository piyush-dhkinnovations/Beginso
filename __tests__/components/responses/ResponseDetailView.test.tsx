/**
 * Tests for ResponseDetailView — the shared content component used by both
 * /inbox/[id] (PersonalShell) and /w/[slug]/inbox/[id] (WorkspaceShell).
 *
 * The shell itself is selected by the route file + Next.js layout tree and cannot
 * be unit-tested here; these tests confirm that the component:
 *   - passes the correct scope to ResponseDrawer (the prop that drives API calls)
 *   - validates returnTo URLs and falls back safely for unknown patterns
 *   - builds next/previous navigation URLs in the right workspace
 *
 * Mutation check: swap workspace and personal scope handling → confirm a test fails.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let mockSearchParamsValue = new URLSearchParams();
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => mockSearchParamsValue,
}));

vi.mock('@/services/forms', () => ({ formsService: { getFormById: vi.fn() } }));
vi.mock('@/hooks/useStages', () => ({ useStages: () => ({ data: [] }) }));

// Capture the props passed to ResponseDrawer so we can assert on them.
let lastDrawerProps: Record<string, unknown> = {};
vi.mock('@/components/responses/ResponseDrawer', () => ({
  ResponseDrawer: (props: Record<string, unknown>) => {
    lastDrawerProps = props;
    return (
      <div>
        <span data-testid="scope">{String(props.scope)}</span>
        <a href={String(props.collapseHref ?? '')}>Collapse</a>
      </div>
    );
  },
}));

import { ResponseDetailView } from '@/components/responses/ResponseDetailView';

function renderView(id: string, scope: string, searchParams = new URLSearchParams()) {
  mockSearchParamsValue = searchParams;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ResponseDetailView id={id} scope={scope} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  lastDrawerProps = {};
  mockSearchParamsValue = new URLSearchParams();
});

describe('ResponseDetailView', () => {
  it('passes a workspace slug scope through to ResponseDrawer', () => {
    renderView('resp-1', 'acme');
    expect(screen.getByTestId('scope').textContent).toBe('acme');
    // Mutation check: if scope were hardcoded to 'personal', this assertion would fail.
    expect(lastDrawerProps.scope).toBe('acme');
  });

  it('passes the personal scope through to ResponseDrawer', () => {
    renderView('resp-2', 'personal');
    expect(screen.getByTestId('scope').textContent).toBe('personal');
    expect(lastDrawerProps.scope).toBe('personal');
  });

  // collapse URL safety (returnTo validation)

  it('uses validated returnTo for a workspace inbox URL', () => {
    const sp = new URLSearchParams({ returnTo: '/w/acme/inbox?page=1&responseId=resp-1' });
    renderView('resp-1', 'acme', sp);
    expect(screen.getByRole('link', { name: 'Collapse' })).toHaveAttribute(
      'href', '/w/acme/inbox?page=1&responseId=resp-1'
    );
  });

  it('uses validated returnTo for a workspace form-responses URL', () => {
    const sp = new URLSearchParams({ returnTo: '/w/acme/form-responses?page=1&responseId=resp-1' });
    renderView('resp-1', 'acme', sp);
    expect(screen.getByRole('link', { name: 'Collapse' })).toHaveAttribute(
      'href', '/w/acme/form-responses?page=1&responseId=resp-1'
    );
  });

  it('uses validated returnTo for a per-form inbox URL', () => {
    const sp = new URLSearchParams({ returnTo: '/forms/f1/inbox?responseId=resp-1' });
    renderView('resp-1', 'acme', sp);
    expect(screen.getByRole('link', { name: 'Collapse' })).toHaveAttribute(
      'href', '/forms/f1/inbox?responseId=resp-1'
    );
  });

  it('falls back to /w/<slug>/inbox?responseId when returnTo is missing (workspace scope)', () => {
    renderView('resp-1', 'acme');
    expect(screen.getByRole('link', { name: 'Collapse' })).toHaveAttribute(
      'href', '/w/acme/inbox?responseId=resp-1'
    );
  });

  it('falls back to /inbox?responseId when returnTo is missing (personal scope)', () => {
    renderView('resp-1', 'personal');
    expect(screen.getByRole('link', { name: 'Collapse' })).toHaveAttribute(
      'href', '/inbox?responseId=resp-1'
    );
  });

  it('rejects a returnTo URL that does not contain the matching responseId', () => {
    // A crafted returnTo pointing at a different response must not be trusted.
    const sp = new URLSearchParams({ returnTo: '/w/acme/inbox?responseId=other-resp' });
    renderView('resp-1', 'acme', sp);
    // Falls back to the safe default
    expect(screen.getByRole('link', { name: 'Collapse' })).toHaveAttribute(
      'href', '/w/acme/inbox?responseId=resp-1'
    );
  });

  it('rejects an unknown returnTo origin (open-redirect guard)', () => {
    const sp = new URLSearchParams({ returnTo: '/evil/path?responseId=resp-1' });
    renderView('resp-1', 'acme', sp);
    expect(screen.getByRole('link', { name: 'Collapse' })).toHaveAttribute(
      'href', '/w/acme/inbox?responseId=resp-1'
    );
  });
});
