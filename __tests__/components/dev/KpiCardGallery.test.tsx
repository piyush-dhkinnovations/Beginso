import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KpiCardGallery } from '@/components/dev/KpiCardGallery';

describe('KpiCardGallery', () => {
  afterEach(() => document.documentElement.removeAttribute('data-theme'));

  it('renders all 20 looks, numbered, on sample data', () => {
    render(<KpiCardGallery />);
    expect(screen.getByRole('heading', { level: 1, name: /20 designs/ })).toBeInTheDocument();
    expect(screen.getByText('Minimal (Clean)')).toBeInTheDocument();
    expect(screen.getByText('With icon list')).toBeInTheDocument();
    expect(screen.getByText('01.')).toBeInTheDocument();
    expect(screen.getByText('20.')).toBeInTheDocument();
  });

  it('toggles the document theme', async () => {
    const user = userEvent.setup();
    render(<KpiCardGallery />);
    await user.click(screen.getByRole('button', { name: 'Dark theme' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    await user.click(screen.getByRole('button', { name: 'Light theme' }));
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });
});
