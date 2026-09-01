/**
 * __tests__/components/ui/Tag.test.tsx
 * Feature: sprint-7-foundation
 * Tests: Tag — renders text, optional remove button
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tag } from '@/components/ui/Tag';

describe('Tag component', () => {
  it('renders its text with the base class and no remove button by default', () => {
    render(<Tag>Marketing</Tag>);
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a remove button and calls onRemove when clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<Tag onRemove={onRemove}>Marketing</Tag>);
    await user.click(screen.getByRole('button', { name: /remove/i }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
