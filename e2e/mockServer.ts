import http from 'node:http';
import { mockPublicFormSchema } from './mocks/publicFormMocks.ts';
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
 *   contains "load-500"     -> GET returns 500
 *   contains "closed-date"  -> GET returns the mock schema with a past closeDate
 *   contains "submit-422"   -> POST .../submit returns 422
 *   contains "submit-429"   -> POST .../submit returns 429
 *   contains "submit-500"   -> POST .../submit returns 500
 *   anything else           -> GET returns the mock schema as-is; submit returns 200
 */
const PORT = Number(process.env.E2E_MOCK_PORT ?? 3101);

const builderForms = new Map<string, { label: string; version: number }>();
const builderForm = (id: string, s: { label: string; version: number }) => ({
  _id: id, workspaceId: null, title: 'E2E form', description: '', status: 'draft', schemaVersion: 1, responseCount: 0, contentVersion: s.version,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  pages: [{ id: 'p1', order: 0, title: 'E2E form' }], branding: {}, settings: { honeypotEnabled: true },
  fields: [{ fieldId: 'f1', pageId: 'p1', label: s.label, type: 'short_text', required: false, deleted: false, order: 0 }],
});

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

  // The Next.js edge guard (src/proxy.ts) asks the backend whether a session cookie is valid before it serves an app page.
  // Builder specs set a fake session cookie; this stateless answer lets them through.
  if (url.pathname === '/api/auth/me') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, user: { id: 'e2e-user', name: 'E2E User', email: 'e2e@example.com', onboardingCompleted: true } }));
    return;
  }

  // The one stateful corner of this mock: a form the builder can load and save, so a spec can close a real tab mid-save and then
  // ask what the server actually received (a request interrupted by a closing page never reaches Playwright's own route hooks).
  // Keyed by form id, one id per spec, so parallel specs never share state.
  const formMatch = url.pathname.match(/^\/api\/forms\/([^/]+)\/?$/);
  const probe = url.pathname.match(/^\/__e2e\/forms\/([^/]+)\/label$/);
  if (probe) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(builderForms.get(probe[1])?.label ?? 'Original question');
    return;
  }
  if (formMatch && (req.method === 'GET' || req.method === 'PATCH')) {
    const id = formMatch[1];
    const state = builderForms.get(id) ?? { label: 'Original question', version: 1 };
    if (req.method === 'PATCH') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw || '{}') as { fields?: { label?: string }[] };
      if (body.fields?.[0]?.label) state.label = body.fields[0].label;
      state.version += 1;
    }
    builderForms.set(id, state);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(builderForm(id, state)));
    return;
  }

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

  if (slug.includes('load-500')) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Backend unavailable' }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(schemaFor(slug)));
});

server.listen(PORT, () => {
  console.log(`[e2e mock backend] listening on http://localhost:${PORT}`);
});
