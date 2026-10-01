/**
 * __tests__/components/dev/UiGalleryContent.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/Toast';
import { UiGalleryContent } from '@/components/dev/UiGalleryContent';

describe('UiGalleryContent', () => {
  it('renders every primitive section from Phases 2-5 without throwing', () => {
    render(
      <ToastProvider>
        <UiGalleryContent />
      </ToastProvider>
    );
    expect(screen.getByRole('heading', { name: 'Form controls' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Layout, data, feedback' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Navigation, structure' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'App shell' })).toBeInTheDocument();
  });

  it('applies the gallery-root id the parent shell targets to set data-theme', () => {
    const { container } = render(
      <ToastProvider>
        <UiGalleryContent />
      </ToastProvider>
    );
    expect(container.querySelector('#gallery-root')).toBeInTheDocument();
  });
});
