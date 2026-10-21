import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OwnerMonogram } from '@/components/forms/OwnerMonogram';

describe('OwnerMonogram', () => {
  it('shows first and last initials, upper-cased, with an "Owned by" label', () => {
    render(<OwnerMonogram name="ada king lovelace" title="T" />);
    const el = screen.getByRole('img', { name: 'Owned by ada king lovelace' });
    expect(el).toHaveTextContent('AL');
  });

  it('shows one initial for a single-word name', () => {
    render(<OwnerMonogram name="  priya " title="T" />);
    expect(screen.getByRole('img')).toHaveTextContent('P');
  });

  it('falls back to an "Owner unknown" icon when there is no name', () => {
    render(<OwnerMonogram title="T" />);
    const el = screen.getByRole('img', { name: 'Owner unknown' });
    expect(el).toHaveTextContent('');
    expect(el.querySelector('svg')).not.toBeNull();
  });

  it('uses the brand colour as background, with dark ink on a light brand and white ink on a dark brand', () => {
    const { rerender } = render(<OwnerMonogram name="A B" brandColor="#ffff00" title="T" />);
    expect(screen.getByRole('img')).toHaveStyle({ backgroundColor: '#ffff00', color: '#111827' });

    rerender(<OwnerMonogram name="A B" brandColor="#000080" title="T" />);
    expect(screen.getByRole('img')).toHaveStyle({ backgroundColor: '#000080', color: '#ffffff' });
  });

  it('ignores a malformed brand colour and uses white ink on the derived fallback', () => {
    render(<OwnerMonogram name="A B" brandColor="not-a-colour" title="T" />);
    const el = screen.getByRole('img');
    expect(el.style.backgroundColor).not.toBe('not-a-colour');
    expect(el).toHaveStyle({ color: '#ffffff' });
  });
  it("shows the owner's picture when there is one, and the initials again if it cannot load", () => {
    const { container } = render(<OwnerMonogram name="Ada Lovelace" avatarUrl="https://cdn.example.com/ada.png" title="T" />);
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/ada.png');
    expect(screen.queryByText('AL')).not.toBeInTheDocument();
    fireEvent.error(img);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('shows initials when the owner has no picture', () => {
    const { container } = render(<OwnerMonogram name="Ada Lovelace" avatarUrl={null} title="T" />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('AL')).toBeInTheDocument();
  });
});
