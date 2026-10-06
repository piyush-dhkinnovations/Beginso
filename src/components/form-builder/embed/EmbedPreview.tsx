'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { EMBED_MSG, clampHeight } from '@/lib/embed/embedParams';
import { buildQuery, buttonStyle, triggerAttrs, normalizeConfig, type EmbedConfig, type EmbedContext } from '@/lib/embed/buildEmbedSnippet';

interface Props {
  ctx: EmbedContext;
  config: EmbedConfig;
  /** The form's height as reported by the live preview (px). */
  onMeasured: (px: number) => void;
}

const cssTextToStyle = (css: string): CSSProperties =>
  Object.fromEntries(
    css
      .split(';')
      .filter(Boolean)
      .map((d) => {
        const i = d.indexOf(':');
        return [d.slice(0, i).trim().replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase()), d.slice(i + 1).trim()];
      })
  );

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// The preview loads the REAL form (same origin, so it is always the code that is deployed) with the REAL query the
// snippet carries, plus preview=1 so nothing is submitted or counted as a view. Popup and drawer use the REAL
// public/embed.js: the button below carries exactly the attributes the snippet does.
export function EmbedPreview({ ctx, config, onMeasured }: Props) {
  const c = normalizeConfig(config);
  const inline = c.method === 'fixed' || c.method === 'auto';
  const button = c.method === 'popup' || c.method === 'drawer';
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [autoHeight, setAutoHeight] = useState<number | null>(null);

  const query = useDebounced(buildQuery(c), 300);
  const src = `/f/${ctx.slug}?${query}&preview=1`;
  const auto = c.method === 'auto';

  useEffect(() => {
    if (!inline) return;
    const origin = window.location.origin;
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: unknown; height?: unknown } | null;
      if (e.origin !== origin || e.source !== iframeRef.current?.contentWindow || !d || d.type !== EMBED_MSG.height) return;
      const h = clampHeight(d.height);
      if (h === null) return;
      onMeasured(h);
      if (auto) setAutoHeight(h);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [inline, auto, onMeasured, src]);

  // Auto-height: greet the form like embed.js does (the form may hydrate after load, so retry briefly).
  const greet = () => {
    if (!auto) return;
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let tries = 0;
    const t = setInterval(() => {
      iframeRef.current?.contentWindow?.postMessage({ type: EMBED_MSG.hello, scheme: dark ? 'dark' : 'light', autoHeight: true }, window.location.origin);
      if (++tries >= 6) clearInterval(t);
    }, 500);
  };

  useEffect(() => {
    if (!button || document.querySelector('script[data-beginso-preview]')) return;
    const s = document.createElement('script');
    s.src = '/embed.js';
    s.async = true;
    s.setAttribute('data-beginso-preview', '');
    document.body.appendChild(s);
  }, [button]);

  if (inline) {
    return (
      <div className="overflow-x-auto rounded-md border border-dashed border-(--border-strong) bg-(--bg-subtle) p-3">
        <iframe
          key={src}
          ref={iframeRef}
          src={src}
          title={`Live preview of ${ctx.formTitle || 'the form'}`}
          onLoad={greet}
          style={{
            display: 'block',
            width: `${c.widthValue}${c.widthUnit}`,
            maxWidth: '100%',
            height: auto ? (autoHeight ?? 600) : c.height,
            border: c.border ? '1px solid #D0D5DD' : '0',
            borderRadius: c.rounded ? 8 : 0,
            background: 'transparent',
          }}
        />
        <p className="mt-2 bg-caption text-(--text-muted)">
          {auto ? 'The frame is resizing to the form as you move through it.' : `Fixed frame: ${c.widthValue}${c.widthUnit} wide, ${c.height}px tall.`}
        </p>
      </div>
    );
  }

  if (button) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-(--border-strong) bg-(--bg-subtle) p-6">
        {/* Same attributes as the snippet (plus preview=1); embed.js opens it. */}
        <button type="button" {...Object.fromEntries(triggerAttrs(ctx, c, '&preview=1'))} style={cssTextToStyle(buttonStyle(c))}>
          {c.buttonText}
        </button>
        <p className="bg-caption text-(--text-muted)">
          Click the button to try the {c.method === 'popup' ? 'popup' : `drawer from the ${c.side}`}. Escape or the close button dismisses it and focus returns here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-dashed border-(--border-strong) bg-(--bg-subtle) p-4 bg-body-sm text-(--text-muted)">
      A full-page link opens the form on its own page, so there is nothing to embed. Copy the address below or use the QR code in Public link.
    </div>
  );
}
