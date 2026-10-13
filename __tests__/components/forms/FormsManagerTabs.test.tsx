import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormsManagerTabs } from '@/components/forms/FormsManagerTabs';

describe('FormsManagerTabs', () => {
  it('renders the six chips in order inside a labelled group', () => {
    render(<FormsManagerTabs activeTab="recent" onChange={vi.fn()} />);
    expect(screen.getByRole('group', { name: 'Filter forms by status' })).toBeInTheDocument();
    expect(screen.getAllByRole('button').map((b) => b.textContent?.trim())).toEqual(['All', 'Published', 'Draft', 'Closed', 'Pinned', 'Archived']);
  });

  it('marks only the active tab as pressed', () => {
    render(<FormsManagerTabs activeTab="draft" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Draft' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows counts only for tabs that have one (including zero)', () => {
    render(<FormsManagerTabs activeTab="recent" onChange={vi.fn()} counts={{ recent: 12, draft: 0 }} />);
    expect(screen.getByRole('button', { name: 'All 12' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Draft 0' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Closed' })).toBeInTheDocument();
  });

  it('calls onChange with the tab id', async () => {
    const onChange = vi.fn();
    render(<FormsManagerTabs activeTab="recent" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Archived' }));
    expect(onChange).toHaveBeenCalledWith('archived');
  });
});
