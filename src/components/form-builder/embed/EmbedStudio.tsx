'use client';

import { useCallback, useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import type { FormField, FormPage } from '@/types/form';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { buildAdvancedRows, buildSnippet, DEFAULT_EMBED_CONFIG, estimateFormHeight, normalizeConfig, type EmbedConfig, type EmbedContext } from '@/lib/embed/buildEmbedSnippet';
import { checkPrefillRow } from '@/lib/embed/prefill';
import { EmbedConfigPanel } from './EmbedConfigPanel';
import { EmbedPreview } from './EmbedPreview';

interface Props {
  /** null until the form is published (no slug, nothing to embed). */
  ctx: EmbedContext | null;
  fields: FormField[];
  pages: FormPage[];
  onCopy: (text: string, message: string) => void;
}

// Share & Embed, CF6.2a. One state object drives the code block, the live preview and the Advanced list through
// the same pure functions (lib/embed/buildEmbedSnippet), so every control changes the output the moment it moves
// and there is no Generate button.
export function EmbedStudio({ ctx, fields, pages, onCopy }: Props) {
  const [config, setConfig] = useState<EmbedConfig>(DEFAULT_EMBED_CONFIG);
  const [measured, setMeasured] = useState(0);
  const onMeasured = useCallback((px: number) => setMeasured(px), []);
  const patch = useCallback((p: Partial<EmbedConfig>) => setConfig((c) => ({ ...c, ...p })), []);

  // A pre-fill row the form would ignore (unknown field, value the field cannot hold) is flagged in the panel and
  // left out of the output, so the snippet never carries parameters that do nothing.
  const effective = useMemo(
    () => normalizeConfig({ ...config, prefill: config.prefill.filter((r) => { const k = checkPrefillRow(fields, r.key, r.value); return r.key.trim() && r.value.trim() && !k.error; }) }),
    [config, fields]
  );

  const snippet = ctx ? buildSnippet(ctx, effective) : '';
  const rows = useMemo(() => buildAdvancedRows(effective), [effective]);
  const needed = Math.max(estimateFormHeight(fields, pages, effective), measured);
  const tooShort = config.method === 'fixed' && effective.height < needed;

  return (
    <section aria-labelledby="embed-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="embed-heading" className="bg-h5 font-semibold">Embed on your website</h2>
        <p className="bg-body-sm text-(--text-muted)">Pick a method, set it up, and copy the code. It updates as you change anything.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <EmbedConfigPanel config={config} onChange={patch} fields={fields} />

        <div className="flex flex-col gap-4 min-w-0 lg:sticky lg:top-4">
          {!ctx ? (
            <Alert variant="info" title="Publish the form to get its embed code.">
              The preview and the code appear here once the form has a public link.
            </Alert>
          ) : (
            <>
              <Card className="flex flex-col gap-3">
                <h3 className="bg-h5 font-semibold">Live preview</h3>
                {tooShort && (
                  <Alert variant="warning" title="This frame is shorter than your form.">
                    The form needs about {needed}px on its tallest page but the frame is {effective.height}px, so visitors would get a scrollbar inside the frame or lose the submit button. Raise the height to at least {needed}px, or use auto-height.
                  </Alert>
                )}
                <EmbedPreview ctx={ctx} config={effective} onMeasured={onMeasured} />
              </Card>

              <Card className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="bg-h5 font-semibold" id="embed-code-label">{effective.method === 'link' ? 'Link' : 'Code to paste'}</h3>
                  <Button type="button" variant="secondary" size="small" onClick={() => onCopy(snippet, effective.method === 'link' ? 'Link copied to clipboard.' : 'Embed code copied.')} className="min-h-11">
                    <Copy size={16} aria-hidden="true" /> Copy
                  </Button>
                </div>
                {/* Focusable so a keyboard user can scroll a long line. */}
                <pre tabIndex={0} aria-labelledby="embed-code-label" className="rounded-md border-2 border-(--border-default) bg-(--bg-subtle) p-3 bg-body-sm font-mono overflow-x-auto whitespace-pre">
                  {snippet}
                </pre>
                {effective.method === 'auto' || effective.method === 'popup' || effective.method === 'drawer' ? (
                  <p className="bg-caption text-(--text-muted)">Without JavaScript the visitor sees a plain link to the form. Including the script more than once on a page is safe.</p>
                ) : null}
              </Card>
            </>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <details className="rounded-lg border border-(--border-default) bg-(--surface-card) p-4">
          <summary className="cursor-pointer bg-body font-semibold text-(--text-primary)">Advanced: every parameter</summary>
          <p className="mt-2 bg-body-sm text-(--text-muted)">What each option above maps to, for a developer who wants to write the embed by hand.</p>
          <dl className="mt-3 flex flex-col divide-y divide-(--border-default)">
            {rows.map((r) => (
              <div key={`${r.kind}-${r.name}`} className="grid grid-cols-1 gap-1 py-2 md:grid-cols-[minmax(0,16rem)_1fr]">
                <dt className="min-w-0 break-words font-mono bg-body-sm text-(--text-primary)">
                  {r.name}
                  <span className="block bg-caption font-sans text-(--text-muted)">{r.kind}</span>
                </dt>
                <dd className="min-w-0 break-words bg-body-sm text-(--text-secondary)">
                  <code className="font-mono text-(--text-primary)">{r.value}</code>
                  {r.fallback !== '-' && <span className="text-(--text-muted)"> (default {r.fallback})</span>}
                  <span className="block text-(--text-muted)">{r.description}</span>
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </section>
  );
}
