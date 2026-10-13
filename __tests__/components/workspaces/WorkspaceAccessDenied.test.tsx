import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkspaceAccessDenied } from '@/components/workspaces/WorkspaceAccessDenied';

describe('WorkspaceAccessDenied', () => {
  it('explains the access problem and links back to Personal Home', () => {
    render(<WorkspaceAccessDenied />);
    expect(screen.getByText("You don't have access to this workspace")).toBeInTheDocument();
    expect(screen.getByText(/Ask a member to invite you/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Personal Home' })).toHaveAttribute('href', '/dashboard');
  });

  it('uses a link, not a button wrapping a link', () => {
    render(<WorkspaceAccessDenied />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
