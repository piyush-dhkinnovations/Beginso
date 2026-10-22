import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { WorkspaceLogo } from '@/components/workspaces/WorkspaceLogo';

describe('WorkspaceLogo', () => {
  it('shows the logo when there is one', () => {
    const { container } = render(<WorkspaceLogo logo="https://cdn.example.com/l.png" />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn.example.com/l.png');
  });

  it('shows the BeginSo mark when there is no logo', () => {
    const { container } = render(<WorkspaceLogo logo={null} />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/favicon.svg');
  });

  it('goes back to the BeginSo mark if the logo cannot load', () => {
    const { container } = render(<WorkspaceLogo logo="https://cdn.example.com/missing.png" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toHaveAttribute('src', '/favicon.svg');
  });

  it('is decorative and comes in two sizes', () => {
    const md = render(<WorkspaceLogo logo={null} />);
    expect(md.container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(md.container.firstElementChild).toHaveClass('size-11');
    const sm = render(<WorkspaceLogo logo={null} size="sm" />);
    expect(sm.container.firstElementChild).toHaveClass('size-8');
  });
});
