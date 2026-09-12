/**
 * __tests__/components/ui/Tooltip.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tooltip } from '@/components/ui/Tooltip';

describe('Tooltip component', () => {
  it('wraps the trigger with data-tip content, shown by beginso-ui.css on hover/focus-within', () => {
    render(
      <Tooltip content="Delete this form">
        <button>Delete</button>
      </Tooltip>
    );
    const wrapper = screen.getByRole('button', { name: 'Delete' }).parentElement;
    expect(wrapper).toHaveAttribute('data-tip', 'Delete this form');
    expect(wrapper?.className).toMatch(/bg-tooltip/);
  });
});
