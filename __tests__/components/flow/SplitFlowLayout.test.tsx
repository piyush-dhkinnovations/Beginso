import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SplitFlowLayout } from '@/components/flow/SplitFlowLayout';

function setup(props: Partial<React.ComponentProps<typeof SplitFlowLayout>> = {}) {
  const onClose = vi.fn();
  render(
    <SplitFlowLayout eyebrow="Create form" title="Create a form" description="Describe it" illustration={<div data-testid="art" />} tint="#2f56d8" panelTitle="Panel headline" panelText="Panel line" onClose={onClose} {...props}>
      <p>the task</p>
    </SplitFlowLayout>,
  );
  return { onClose };
}

describe('SplitFlowLayout', () => {
  it('renders eyebrow, title, description and the task', () => {
    setup();
    expect(screen.getByText('Create form')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Create a form' })).toBeInTheDocument();
    expect(screen.getByText('Describe it')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('the task');
  });

  it('hides the decorative illustration from assistive tech', () => {
    setup();
    expect(screen.getByTestId('art').closest('aside')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows the headline and line on a solid-colour panel beside the illustration', () => {
    setup();
    const aside = screen.getByTestId('art').closest('aside') as HTMLElement;
    expect(aside).toHaveStyle({ backgroundColor: '#2f56d8' });
    expect(aside).toHaveTextContent('Panel headline');
    expect(aside).toHaveTextContent('Panel line');
  });

  it('closes with a Cancel button by default, or a custom label', async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses a custom closeLabel', () => {
    setup({ closeLabel: 'Back' });
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });
});
