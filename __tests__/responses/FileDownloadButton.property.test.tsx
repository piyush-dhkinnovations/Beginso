/**
 * __tests__/responses/FileDownloadButton.property.test.tsx
 * Feature: sprint-4-responses, Property 5: FileDownloadButton never caches the URL
 * Requirements: 6.4, 11.5
 */

import { describe, it, vi, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { FileDownloadButton } from '@/components/responses/FileDownloadButton';

vi.mock('@/components/common/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const mockGetFileDownloadUrl = vi.fn();
vi.mock('@/services/responses', () => ({
  responsesService: { getFileDownloadUrl: (...args: unknown[]) => mockGetFileDownloadUrl(...args) },
}));

describe('FileDownloadButton — property test', () => {
  beforeEach(() => {
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('calls getFileDownloadUrl exactly once per click — never a cached value', async () => {
    // Component-mount PBT: fewer iterations than the pure-logic properties above,
    // since each run mounts/clicks/unmounts a real component tree.
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 5 }), async (clicks) => {
        mockGetFileDownloadUrl.mockReset();
        mockGetFileDownloadUrl.mockResolvedValue({ url: 'https://mock-r2.example.com/file.pdf' });

        const user = userEvent.setup();
        render(
          <FileDownloadButton
            responseId="r1"
            fileId="f1"
            originalName="file.pdf"
            size={1024}
            mimeType="application/pdf"
            isAvailable
          />
        );
        const button = screen.getByRole('button', { name: 'Download file.pdf' });
        for (let i = 0; i < clicks; i++) {
          await user.click(button);
        }

        const ok = mockGetFileDownloadUrl.mock.calls.length === clicks;
        cleanup();
        return ok;
      }),
      { numRuns: 25 }
    );
  });
});
