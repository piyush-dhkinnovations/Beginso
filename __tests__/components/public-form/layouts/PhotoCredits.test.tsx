import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhotoCredits } from '@/components/public-form/layouts/shared';
import type { PublicFormBranding } from '@/types/publicForm';

const A = { name: 'Ada Lovelace', url: 'https://unsplash.com/@ada?utm_source=beginso&utm_medium=referral' };
const PIC = 'https://images.unsplash.com/p1?w=1920';

describe('PhotoCredits', () => {
  it('credits the photographer and Unsplash, with links that open in a new tab', () => {
    render(<PhotoCredits branding={{ coverImageUrl: PIC, theme: { v: 1, credit: { cover: A } } } as PublicFormBranding} />);
    const photographer = screen.getByRole('link', { name: 'Ada Lovelace' });
    expect(photographer).toHaveAttribute('href', A.url);
    expect(photographer).toHaveAttribute('target', '_blank');
    expect(photographer.getAttribute('rel')).toContain('noopener');
    expect(screen.getByRole('link', { name: 'Unsplash' }).getAttribute('href')).toMatch(/^https:\/\/unsplash\.com\/\?utm_source=beginso/);
  });

  it('shows nothing when the picture is not an Unsplash photo, or there is no credit', () => {
    const { container, rerender } = render(<PhotoCredits branding={{ coverImageUrl: '/api/upload/file/x.png', theme: { v: 1, credit: { cover: A } } } as PublicFormBranding} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<PhotoCredits branding={{ coverImageUrl: PIC } as PublicFormBranding} />);
    expect(container).toBeEmptyDOMElement();
  });
});
