import { describe, it, expect, vi, afterEach } from 'vitest';

// A .env.local with NEXT_PUBLIC_API_URL=http://localhost:5000/ (a trailing slash) made every address //api/public/..., which the backend
// answers with 404: the form preview in the builder showed "form not found" for a published form.
describe('the API address from the environment', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it.each(['http://localhost:5000/', 'http://localhost:5000//', 'http://localhost:5000'])('%s reaches the public form at /api/public/<slug>, never //api', async (base) => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', base);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true, json: () => Promise.resolve({ title: 'T', pages: [], fields: [], branding: {}, settings: {} }) }));
    vi.resetModules();
    const { publicFormService } = await import('@/services/publicForm');
    await publicFormService.getFormSchema('abc');
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('http://localhost:5000/api/public/abc');
  });
});
