import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormIllustration, WorkspaceIllustration } from '@/components/flow/FlowIllustrations';

describe('FlowIllustrations', () => {
  it('FormIllustration shows a sample form and its feature chips', () => {
    render(<FormIllustration />);
    for (const t of ['Event Registration', 'Full Name', 'Submit', 'Add questions', 'Collect images', 'Share anywhere', 'View responses']) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
  });

  it('WorkspaceIllustration shows a sample workspace and its chips', () => {
    render(<WorkspaceIllustration />);
    for (const t of ['Your workspace', 'Invite your team', 'Shared insights']) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
    expect(screen.getByText(/ · .* · /)).toBeInTheDocument();
  });

  it('are purely decorative: no interactive elements', () => {
    const { container } = render(<><FormIllustration /><WorkspaceIllustration /></>);
    expect(container.querySelector('button, a, input')).toBeNull();
  });
});
