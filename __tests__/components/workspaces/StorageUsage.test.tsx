import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StorageUsage } from '@/components/workspaces/StorageUsage';

const MB = 1024 * 1024;
const usage = vi.fn();
vi.mock('@/hooks/useAccountUsage', () => ({ useAccountUsage: () => usage() }));

beforeEach(() => usage.mockReset());

describe('StorageUsage', () => {
  it('splits active from Trash', () => {
    usage.mockReturnValue({ storageUsedBytes: 400 * MB, storageTrashBytes: 80 * MB, storageQuotaBytes: 500 * MB });
    render(<StorageUsage />);
    expect(screen.getByText('400 MB of 500 MB')).toBeInTheDocument();
    expect(screen.getByText(/320 MB active, 80 MB in Trash/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /free up space/i })).toBeNull();
  });

  it('links to Trash once full', () => {
    usage.mockReturnValue({ storageUsedBytes: 520 * MB, storageTrashBytes: 100 * MB, storageQuotaBytes: 500 * MB });
    render(<StorageUsage />);
    expect(screen.getByRole('link', { name: /free up space/i })).toHaveAttribute('href', '/trash');
  });

  it('a small amount against a large quota still shows a visible sliver, not an empty bar', () => {
    usage.mockReturnValue({ storageUsedBytes: 5.6 * MB, storageTrashBytes: 0.22 * MB, storageQuotaBytes: 500 * MB });
    render(<StorageUsage />);
    expect(screen.getByText('5.6 MB of 500 MB')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar');
    for (const segment of bar.children) {
      expect(parseFloat((segment as HTMLElement).style.width)).toBeGreaterThanOrEqual(1.5);
    }
  });

  it('renders nothing on a server without the quota fields', () => {
    usage.mockReturnValue({ id: 'u' });
    const { container } = render(<StorageUsage />);
    expect(container).toBeEmptyDOMElement();
  });
});
