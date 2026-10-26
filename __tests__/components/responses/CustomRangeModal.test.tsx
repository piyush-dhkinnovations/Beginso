import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomRangeModal } from '@/components/responses/CustomRangeModal';
import { localDayEndIso, localDayStartIso } from '@/lib/dateRange';

const draw = (props: Partial<React.ComponentProps<typeof CustomRangeModal>> = {}) => {
  const onApply = vi.fn();
  const onClose = vi.fn();
  render(<CustomRangeModal isOpen onClose={onClose} onApply={onApply} {...props} />);
  return { onApply, onClose };
};
const pick = async (label: string, value: string) => {
  const input = screen.getByLabelText(label);
  await userEvent.clear(input);
  await userEvent.type(input, value);
};

describe('CustomRangeModal', () => {
  it('applies a range from the start of the first day to the end of the last, both days included, and closes', async () => {
    const { onApply, onClose } = draw();
    await pick('From', '2026-10-01');
    await pick('To', '2026-10-15');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith({ from: localDayStartIso('2026-10-01'), to: localDayEndIso('2026-10-15') });
    expect(onClose).toHaveBeenCalled();
  });

  it('asks for both dates', async () => {
    const { onApply } = draw();
    await pick('From', '2026-10-01');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose both a start and an end date.');
    expect(onApply).not.toHaveBeenCalled();
  });

  it('refuses an end before the start, in words, and applies nothing', async () => {
    const { onApply } = draw();
    await pick('From', '2026-10-20');
    await pick('To', '2026-10-05');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('starts from the range that is on now', () => {
    draw({ from: localDayStartIso('2026-09-02'), to: localDayEndIso('2026-09-09') });
    expect(screen.getByLabelText('From')).toHaveValue('2026-09-02');
    expect(screen.getByLabelText('To')).toHaveValue('2026-09-09');
  });
});
