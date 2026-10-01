/**
 * __tests__/components/dev/UiGalleryContent.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/Toast';
import { UiGalleryContent } from '@/components/dev/UiGalleryContent';

describe('UiGalleryContent', () => {
  it('renders every gallery section (primitives, cards, charts, illustrations, shell) without throwing', () => {
    render(
      <ToastProvider>
        <UiGalleryContent />
      </ToastProvider>
    );
    for (const name of [
      'Foundations',
      'Form controls',
      'Feedback',
      'Navigation, structure',
      'Cards',
      'Stat cards with charts',
      'Chart cards',
      'Data, overlays, empty states',
      'Illustrations',
      'App shell',
    ]) {
      expect(screen.getByRole('heading', { name, level: 2 })).toBeInTheDocument();
    }
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
