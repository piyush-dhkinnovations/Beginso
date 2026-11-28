import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PreviewBar } from '@/components/preview/PreviewBar';

describe('PreviewBar', () => {
  it('offers the three devices as icons and the way back, and says it is a preview', async () => {
    const onDeviceChange = vi.fn();
    render(<PreviewBar device="desktop" onDeviceChange={onDeviceChange} backHref="/forms/abc/edit" />);
    expect(screen.getByRole('link', { name: 'Back to editor' })).toHaveAttribute('href', '/forms/abc/edit');
    expect(screen.getByRole('radio', { name: 'Desktop' })).toBeChecked();
    for (const name of ['Desktop', 'Tablet', 'Mobile']) expect(screen.getByRole('radio', { name }).querySelector('svg')).not.toBeNull();
    await userEvent.click(screen.getByRole('radio', { name: 'Mobile' }));
    expect(onDeviceChange).toHaveBeenCalledWith('mobile');
    expect(screen.getByText('Preview')).toHaveAttribute('title', 'Respondents see this exactly as shown. Nothing is submitted.');
  });
});
