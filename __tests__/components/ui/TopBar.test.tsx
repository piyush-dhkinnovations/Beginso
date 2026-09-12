/**
 * __tests__/components/ui/TopBar.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopBar } from '@/components/ui/TopBar';

describe('TopBar component', () => {
  it('renders brand and actions, and omits the menu button when onMenuClick is not given', () => {
    render(<TopBar brand="Beginso" actions={<button>Profile</button>} />);
    expect(screen.getByText('Beginso')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Open navigation menu')).not.toBeInTheDocument();
  });

  it('calls onMenuClick when the menu button is clicked', async () => {
    const onMenuClick = vi.fn();
    const user = userEvent.setup();
    render(<TopBar onMenuClick={onMenuClick} />);
    await user.click(screen.getByLabelText('Open navigation menu'));
    expect(onMenuClick).toHaveBeenCalledOnce();
  });
});
