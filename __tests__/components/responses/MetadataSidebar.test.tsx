/**
 * __tests__/components/responses/MetadataSidebar.test.tsx
 * Feature: sprint-4-responses
 * Tests: MetadataSidebar — ipHash, formatted date, delete callback, isUpdatingStatus passthrough
 * (no Browser/userAgent section — the real backend contract never sends a userAgent field)
 * Requirements: 5.1-5.7
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetadataSidebar } from '@/components/responses/MetadataSidebar';
import { mockResponseDetail } from '@/lib/mocks/responsesMocks';

describe('MetadataSidebar', () => {
  it('renders the ipHash in a code element', () => {
    render(<MetadataSidebar response={mockResponseDetail()} onStatusChange={vi.fn()} onDeleteClick={vi.fn()} isUpdatingStatus={false} />);
    const code = screen.getByText('a1b2c3d4e5f60718');
    expect(code.tagName).toBe('CODE');
  });

  it('renders the formatted submission date', () => {
    render(<MetadataSidebar response={mockResponseDetail()} onStatusChange={vi.fn()} onDeleteClick={vi.fn()} isUpdatingStatus={false} />);
    expect(screen.getByText(/03 Aug 2026/)).toBeInTheDocument();
  });

  it('calls onDeleteClick when Delete Response is clicked', async () => {
    const user = userEvent.setup();
    const onDeleteClick = vi.fn();
    render(<MetadataSidebar response={mockResponseDetail()} onStatusChange={vi.fn()} onDeleteClick={onDeleteClick} isUpdatingStatus={false} />);
    await user.click(screen.getByRole('button', { name: 'Delete Response' }));
    expect(onDeleteClick).toHaveBeenCalledOnce();
  });

  it('passes isUpdatingStatus through to disable the StatusSelector buttons', () => {
    render(<MetadataSidebar response={mockResponseDetail()} onStatusChange={vi.fn()} onDeleteClick={vi.fn()} isUpdatingStatus />);
    expect(screen.getByRole('button', { name: 'New' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'In Progress' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Completed' })).toBeDisabled();
  });
});
