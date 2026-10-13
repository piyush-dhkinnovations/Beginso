import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkspaceLoadError } from '@/components/workspaces/WorkspaceLoadError';

describe('WorkspaceLoadError', () => {
  it('describes a retryable failure and links back to Personal Home', () => {
    render(<WorkspaceLoadError />);
    expect(screen.getByText("Couldn't load this workspace")).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong reaching the server/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Personal Home' })).toHaveAttribute('href', '/dashboard');
  });

  it('does not claim the workspace is missing or forbidden', () => {
    render(<WorkspaceLoadError />);
    expect(screen.queryByText(/access/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
  });
});
