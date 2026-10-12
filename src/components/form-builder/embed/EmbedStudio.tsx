'use client';

import { useCallback, useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import type { FormField, FormPage } from '@/types/form';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { buildAdvancedRows, buildSnippet, DEFAULT_EMBED_CONFIG, estimateFormHeight, normalizeConfig, type EmbedConfig, type EmbedContext } from '@/lib/embed/buildEmbedSnippet';
import { checkPrefillRow } from '@/lib/embed/prefill';
import { Segmented } from '@/components/ui/Segmented';
import { EmbedConfigPanel, EmbedMethodPicker } from './EmbedConfigPanel';
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
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
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
        <p className="bg-body-sm text-(--text-muted)">Pick a method, set it up, then copy the code. It updates as you change anything.</p>
      </div>

      <EmbedMethodPicker config={config} onChange={patch} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <EmbedConfigPanel config={config} onChange={patch} fields={fields} />

        {/* On desktop the preview is exactly as tall as the settings column beside it (it is taken out of flow, so a tall form cannot
            stretch the row) and scrolls inside. */}
        <div className="min-w-0 lg:relative lg:min-h-44">
          <div className="lg:absolute lg:inset-0">
          {!ctx ? (
            <Alert variant="info" title="Publish the form to get its embed code.">
              The preview and the code appear here once the form has a public link.
            </Alert>
          ) : (
            // Preview and code share one card behind two tabs, so the page is one screen shorter than stacking them.
            <Card className="flex h-full flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Segmented
                  ariaLabel="Preview or code"
                  value={tab}
                  onChange={(id) => setTab(id as 'preview' | 'code')}
                  options={[
                    { id: 'preview', label: 'Live preview' },
                    { id: 'code', label: effective.method === 'link' ? 'Link' : 'Code to paste' },
                  ]}
                />
                <Button type="button" variant="secondary" size="small" onClick={() => onCopy(snippet, effective.method === 'link' ? 'Link copied to clipboard.' : 'Embed code copied.')} className="min-h-11">
                  <Copy size={16} aria-hidden="true" /> {effective.method === 'link' ? 'Copy link' : 'Copy code'}
                </Button>
              </div>

              {/* Kept mounted (just hidden) so switching tabs never reloads the preview frame. */}
              <div className={tab === 'preview' ? 'flex min-h-0 flex-1 flex-col gap-3' : 'hidden'}>
                {tooShort && (
                  <Alert variant="warning" title="This frame is shorter than your form.">
                    The form needs about {needed}px on its tallest page but the frame is {effective.height}px, so visitors would get a scrollbar inside the frame or lose the submit button. Raise the height to at least {needed}px, or use auto-height.
                  </Alert>
                )}
                <EmbedPreview ctx={ctx} config={effective} onMeasured={onMeasured} />
              </div>

              {tab === 'code' && (
                <div className="flex min-h-0 flex-1 flex-col gap-3 lg:overflow-auto">
                  {/* Wraps long attributes (nothing to scroll sideways) and fills the card; focusable so a keyboard user can scroll a long snippet. */}
                  <pre tabIndex={0} aria-label={effective.method === 'link' ? 'Link' : 'Embed code'} className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-(--border-default) bg-(--bg-subtle) p-4 font-mono text-sm leading-relaxed">
                    {snippet}
                  </pre>
                  {effective.method === 'auto' || effective.method === 'popup' || effective.method === 'drawer' ? (
                    <p className="bg-caption text-(--text-muted)">Without JavaScript the visitor sees a plain link to the form. Including the script more than once on a page is safe.</p>
                  ) : null}
                </div>
              )}
            </Card>
          )}
          </div>
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
