import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileBuildBar } from '@/components/form-builder/MobileBuildBar';

describe('MobileBuildBar', () => {
  it('Add field fires its callback, is the only control, and is hidden once the field rail appears', async () => {
    const onAddField = vi.fn();
    const { container } = render(<MobileBuildBar onAddField={onAddField} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(container.firstElementChild).toHaveClass('sm:hidden');
    await userEvent.click(screen.getByRole('button', { name: /Add field/ }));
    expect(onAddField).toHaveBeenCalledTimes(1);
  });
});
