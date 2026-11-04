'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Link2 } from 'lucide-react';
import { useQrDataUrl } from '@/hooks/useQrDataUrl';
import { useToast } from '@/components/ui/Toast';

export interface ShareLinkBannerProps {
  /** The form's public address. */
  url: string;
  /** The form's name, for the file name of the downloaded QR code. */
  formTitle: string;
}

// The Share link card, in the same brand strip as Quick Actions on the Home page: the link, a Copy button that says "Copied" for a moment, and a QR
// code to scan (a click saves it as a picture). The QR sits on white in every theme on purpose: a code needs a light quiet zone around it to scan.
export function ShareLinkBanner({ url, formTitle }: ShareLinkBannerProps) {
  const { toast } = useToast();
  const qr = useQrDataUrl(url);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
      toast('Link copied to clipboard.', 'success');
    } catch {
      toast('Could not copy. Select the link and copy it by hand.', 'error');
    }
  };

  const downloadQr = () => {
    if (!qr) return;
    const link = document.createElement('a');
    link.href = qr;
    link.download = `${formTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'form'}-qr.png`;
    link.click();
  };

  return (
    <section
      aria-label="Share link"
      className="relative flex flex-col gap-4 overflow-hidden rounded-2xl px-5 py-4 text-white shadow-md sm:px-6 md:flex-row md:items-center md:gap-6"
      style={{ background: 'linear-gradient(110deg, var(--primary-700, #1E4FB0) 0%, var(--primary-600, #2A5FC4) 50%, var(--primary-400, #4F8BEF) 100%)' }}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-white/10" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-24 size-48 rounded-full bg-white/5" />

      <div className="relative flex flex-none items-center gap-4">
        <span className="inline-flex size-12 flex-none items-center justify-center rounded-2xl bg-white shadow-sm" style={{ color: 'var(--primary-600, #2A5FC4)' }}>
          <Link2 className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-6">Share link</h2>
          <p className="text-sm leading-5 text-white/80">Anyone with the link can fill in your form.</p>
        </div>
      </div>

      <div className="relative flex min-w-0 flex-1 flex-wrap items-center gap-2.5 md:flex-nowrap">
        <input
          id="overview-public-url"
          aria-label="Public link"
          readOnly
          value={url}
          title={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-h-10 min-w-0 flex-1 basis-60 rounded-xl border border-white/45 bg-white/10 px-3 font-mono text-sm text-white outline-none placeholder:text-white/60 focus-visible:border-white focus-visible:bg-white/20"
        />
        <button
          type="button"
          aria-label="Copy link"
          onClick={() => void copy()}
          className="inline-flex min-h-10 flex-none items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium shadow-sm transition-colors hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          style={{ color: 'var(--primary-700, #1E4FB0)' }}
        >
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>

      <div className="relative flex flex-none items-center">
        <button
          type="button"
          aria-label="Download QR code"
          title="Scan to open the form. Click to download."
          onClick={downloadQr}
          disabled={!qr}
          className="group relative flex size-24 flex-none items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-sm transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-safe:hover:scale-105"
        >
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- a generated data address, nothing to optimise
            <img src={qr} alt="QR code linking to the public form" width={84} height={84} className="size-full" />
          ) : (
            <span className="bg-caption text-(--text-muted)">QR…</span>
          )}
          {qr && (
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Download size={22} />
            </span>
          )}
        </button>
      </div>
    </section>
  );
}
