/**
 * __tests__/components/ui/Radio.test.tsx
 * Feature: sprint-7-foundation
 * Tests: Radio — mutually exclusive selection within a named group
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Radio } from '@/components/ui/Radio';

describe('Radio component', () => {
  it('renders label text and selects only one option in a group', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Radio id="a" name="plan" label="Free" />
        <Radio id="b" name="plan" label="Pro" />
      </>
    );
    const free = screen.getByRole('radio', { name: 'Free' });
    const pro = screen.getByRole('radio', { name: 'Pro' });
    await user.click(free);
    expect(free).toBeChecked();
    await user.click(pro);
    expect(pro).toBeChecked();
    expect(free).not.toBeChecked();
  });
});
