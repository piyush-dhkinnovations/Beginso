/**
 * __tests__/components/settings/BrandingTab.test.tsx
 * Feature: sprint-6-settings
 * Tests: BrandingTab — loads workspace branding, forwards updates to the save mutation with a
 * toast, "new forms only" helper text present, loading/error states
 * Requirements: 6.1-6.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetWorkspace = vi.fn();
const mockUpdateWorkspace = vi.fn();
vi.mock('@/services/settings', () => ({
  settingsService: {
    getWorkspace: (...args: unknown[]) => mockGetWorkspace(...args),
    updateWorkspace: (...args: unknown[]) => mockUpdateWorkspace(...args),
  },
}));

const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// BrandingPanel has its own dedicated coverage in the Builder's test suite — mocked here so
// BrandingTab's test stays focused on its own data-loading/save wiring, not the color
// picker/upload-zone UI.
vi.mock('@/components/settings/WorkspaceBrandingEditor', () => ({
  WorkspaceBrandingEditor: ({ branding, onChange: onUpdate }: { branding: { primaryColor?: string }; onChange: (u: object) => void }) => (
    <div data-testid="branding-panel" data-primary-color={branding.primaryColor ?? ''}>
      <button onClick={() => onUpdate({ primaryColor: '#123456' })}>Trigger update</button>
    </div>
  ),
}));

import { BrandingTab } from '@/components/settings/BrandingTab';

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrandingTab />
    </QueryClientProvider>
  );
}

describe('BrandingTab', () => {
  beforeEach(() => {
    mockGetWorkspace.mockReset();
    mockUpdateWorkspace.mockReset();
    mockToast.mockReset();
  });

  it('loads workspace branding and passes it to the editor', async () => {
    mockGetWorkspace.mockResolvedValue({ id: 'w1', name: 'Acme', logoUrl: null, branding: { primaryColor: '#1D4ED8' }, createdAt: '' });
    renderTab();

    const panel = await screen.findByTestId('branding-panel');
    expect(panel).toHaveAttribute('data-primary-color', '#1D4ED8');
  });

  it('shows the "new forms only" helper text', async () => {
    mockGetWorkspace.mockResolvedValue({ id: 'w1', name: 'Acme', logoUrl: null, branding: {}, createdAt: '' });
    renderTab();
    expect(await screen.findByText('These settings apply to new forms only — existing forms keep their own branding.')).toBeInTheDocument();
  });

  it('shows an inline error with retry when branding fails to load', async () => {
    mockGetWorkspace.mockRejectedValue(new Error('fail'));
    renderTab();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('edits are a draft: nothing is saved until Save changes, and Cancel discards them', async () => {
    mockGetWorkspace.mockResolvedValue({ id: 'w1', name: 'Acme', logoUrl: null, branding: { primaryColor: '#1D4ED8' }, createdAt: '' });
    renderTab();

    expect(await screen.findByRole('button', { name: 'Save changes' })).toBeDisabled();
    fireEvent.click(await screen.findByText('Trigger update'));
    expect(screen.getByTestId('branding-panel')).toHaveAttribute('data-primary-color', '#123456');
    expect(mockUpdateWorkspace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByTestId('branding-panel')).toHaveAttribute('data-primary-color', '#1D4ED8');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('Save changes sends the full branding (cleared keys as null) and shows a success toast', async () => {
    mockGetWorkspace.mockResolvedValue({ id: 'w1', name: 'Acme', logoUrl: null, branding: {}, createdAt: '' });
    mockUpdateWorkspace.mockResolvedValue({ id: 'w1', name: 'Acme', logoUrl: null, branding: { primaryColor: '#123456' }, createdAt: '' });
    renderTab();

    fireEvent.click(await screen.findByText('Trigger update'));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mockUpdateWorkspace).toHaveBeenCalledTimes(1));
    const [{ branding }] = mockUpdateWorkspace.mock.calls[0];
    expect(branding.primaryColor).toBe('#123456');
    expect(branding.logoUrl).toBeNull();
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Branding defaults saved.', 'success'));
  });

  it('shows a failure toast when the save fails', async () => {
    mockGetWorkspace.mockResolvedValue({ id: 'w1', name: 'Acme', logoUrl: null, branding: {}, createdAt: '' });
    mockUpdateWorkspace.mockRejectedValue(new Error('network error'));
    renderTab();

    fireEvent.click(await screen.findByText('Trigger update'));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Failed to save branding. Please try again.', 'error'));
  });

  // sprint-11-v2a-hardening 1.4 — token pass regression: no raw neutral/white class left in source.
  it('has no raw bg-white/neutral/gray class in its source', () => {
    const source = readFileSync(join(__dirname, '../../../src/components/settings/BrandingTab.tsx'), 'utf-8');
    expect(source).not.toMatch(/bg-white|text-neutral-|bg-neutral-|border-neutral-|text-gray-|bg-gray-|text-black/);
  });
});
