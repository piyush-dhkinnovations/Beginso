import http from 'node:http';
import { mockPublicFormSchema } from '../src/lib/mocks/publicFormMocks.ts';
import type { PublicFormSchema } from '../src/types/publicForm.ts';

/**
 * Standalone mock backend for the E2E suite. `getFormSchema` runs server-side
 * during Next.js SSR, so Playwright's browser-level `page.route()` can't intercept
 * it — this process stands in for the real backend instead, pointed to via
 * NEXT_PUBLIC_API_URL (set in playwright.config.ts's webServer env).
 *
 * Stateless by design (test scenario is encoded in the slug itself) so it's safe
 * under Playwright's parallel test execution — no shared mutable state to race on.
 *
 * Slug conventions:
 *   contains "not-found"    -> GET returns 404
 *   contains "closed-date"  -> GET returns the mock schema with a past closeDate
 *   contains "submit-422"   -> POST .../submit returns 422
 *   contains "submit-429"   -> POST .../submit returns 429
 *   contains "submit-500"   -> POST .../submit returns 500
 *   anything else           -> GET returns the mock schema as-is; submit returns 200
 */
const PORT = 3101;

function schemaFor(slug: string): PublicFormSchema {
  if (slug.includes('closed-date')) {
    return {
      ...mockPublicFormSchema,
      settings: { ...mockPublicFormSchema.settings, closeDate: '2020-01-01T00:00:00.000Z' },
    };
  }
  return mockPublicFormSchema;
}

const server = http.createServer(async (req, res) => {
  // The GET schema fetch happens server-side (Next.js SSR, no CORS involved), but the
  // submit POST is a client-side browser fetch to a different port/origin — needs
  // CORS headers or the browser silently blocks the response from ever resolving.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const match = url.pathname.match(/^\/api\/public\/([^/]+)(\/submit)?\/?$/);

  if (!match) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Not found' }));
    return;
  }

  const [, slug, isSubmitSuffix] = match;

  if (isSubmitSuffix) {
    // Drain the multipart body — content doesn't matter, the mock's behavior is slug-driven.
    for await (const _chunk of req) {
      /* discard */
    }

    if (slug.includes('submit-422')) {
      res.writeHead(422, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Email is required.' } }));
      return;
    }
    if (slug.includes('submit-429')) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Rate limited' } }));
      return;
    }
    if (slug.includes('submit-500')) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Internal error' } }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // GET schema
  if (slug.includes('not-found')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Form not found' }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(schemaFor(slug)));
});

server.listen(PORT, () => {
  console.log(`[e2e mock backend] listening on http://localhost:${PORT}`);
});
