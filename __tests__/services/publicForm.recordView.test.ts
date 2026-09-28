import { describe, it, expect, vi, beforeEach } from 'vitest';
import { publicFormService } from '@/services/publicForm';

describe('publicFormService.recordView', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
  });

  it('posts to the view endpoint for the slug, with no body and no credentials', () => {
    publicFormService.recordView('my-form');
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toMatch(/\/api\/public\/my-form\/view$/);
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
    expect(init.credentials).toBeUndefined();
  });

  it('never throws, even when the network fails', () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));
    expect(() => publicFormService.recordView('my-form')).not.toThrow();
  });
});
