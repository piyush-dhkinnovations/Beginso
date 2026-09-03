/**
 * __tests__/components/ui/Breadcrumb.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

describe('Breadcrumb component', () => {
  it('renders links for every item but the last, and marks the last as the current page', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Forms', href: '/forms' },
          { label: 'My Form', href: '/forms/1' },
          { label: 'Responses' },
        ]}
      />
    );
    expect(screen.getByRole('link', { name: 'Forms' })).toHaveAttribute('href', '/forms');
    expect(screen.getByRole('link', { name: 'My Form' })).toHaveAttribute('href', '/forms/1');
    expect(screen.getByText('Responses')).toHaveAttribute('aria-current', 'page');
  });
});
