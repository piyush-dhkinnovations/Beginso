/**
 * __tests__/components/responses/MetadataSidebar.test.tsx
 * Feature: sprint-4-responses
 * Tests: MetadataSidebar — Workflow/Submission section grouping, ipHash, formatted date,
 * Response ID, StatusDropdown wiring. Delete now lives in ResponseDrawer's sticky footer,
 * not here — see ResponseDrawer.test.tsx.
 * (no Reviewer/Priority/Internal Notes/Activity Timeline — none of that data exists in the
 * backend contract; see docs/backend-contract/api-reference.md §3)
 * Requirements: 5.1-5.7
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetadataSidebar } from '@/components/responses/MetadataSidebar';
import { mockResponseDetail } from '@/lib/mocks/responsesMocks';

describe('MetadataSidebar', () => {
  it('renders Workflow and Submission section headings', () => {
    render(<MetadataSidebar response={mockResponseDetail()} onStatusChange={vi.fn()} isUpdatingStatus={false} />);
    expect(screen.getByText('Workflow')).toBeInTheDocument();
    expect(screen.getByText('Submission')).toBeInTheDocument();
  });

  it('uses a compact single-row layout for the workflow status control', () => {
    render(<MetadataSidebar response={mockResponseDetail()} onStatusChange={vi.fn()} isUpdatingStatus={false} />);

    expect(screen.getByRole('group', { name: 'Workflow' })).toHaveClass('items-center', 'justify-between', 'p-3');
  });

  it('renders the ipHash in a code element under Origin', () => {
    render(<MetadataSidebar response={mockResponseDetail()} onStatusChange={vi.fn()} isUpdatingStatus={false} />);
    const code = screen.getByText('a1b2c3d4e5f60718');
    expect(code.tagName).toBe('CODE');
  });

  it('renders the formatted submission date under Date', () => {
    render(<MetadataSidebar response={mockResponseDetail()} onStatusChange={vi.fn()} isUpdatingStatus={false} />);
    expect(screen.getByText(/03 Aug 2026/)).toBeInTheDocument();
  });

  it('renders the shortened Response ID', () => {
    render(<MetadataSidebar response={mockResponseDetail('6b1f0e2a9497f0a0ea093b01')} onStatusChange={vi.fn()} isUpdatingStatus={false} />);
    expect(screen.getByText('093B01')).toBeInTheDocument();
  });

  it('renders the status dropdown pre-set to the current status and fires onStatusChange', async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(<MetadataSidebar response={mockResponseDetail()} onStatusChange={onStatusChange} isUpdatingStatus={false} />);

    const trigger = screen.getByRole('button', { name: 'Response status' });
    expect(trigger).toHaveTextContent('New');

    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: /Completed/ }));
    expect(onStatusChange).toHaveBeenCalledWith('completed');
  });

  it('disables the status dropdown while isUpdatingStatus is true', () => {
    render(<MetadataSidebar response={mockResponseDetail()} onStatusChange={vi.fn()} isUpdatingStatus />);
    expect(screen.getByRole('button', { name: 'Response status' })).toBeDisabled();
  });
});
