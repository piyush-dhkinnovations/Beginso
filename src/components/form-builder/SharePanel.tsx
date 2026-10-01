'use client';

import { useEffect, useState } from 'react';
import { toDataURL } from 'qrcode';
import { Copy, ExternalLink } from 'lucide-react';
import type { FormStatus } from '@/types/form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { PanelCard } from './PanelCard';

export interface SharePanelProps {
  status: FormStatus;
  slug?: string;
  formTitle: string;
  onPublish: () => void;
}

export function SharePanel({ status, slug, formTitle, onPublish }: SharePanelProps) {
  const { toast } = useToast();
  const publicUrl = slug ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/f/${slug}` : '';
  const embedCode = `<iframe src="${publicUrl}" width="100%" height="600" frameborder="0" style="border:none;border-radius:8px;"></iframe>`;

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!publicUrl) return;
    toDataURL(publicUrl, { width: 200, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [publicUrl]);

  const copy = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast(message, 'success');
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${formTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-qr.png`;
    link.click();
  };

  if (status !== 'published') {
    return (
      <div className="max-w-2xl mx-auto">
        <PanelCard
          label="Share"
          description={
            status === 'closed'
              ? 'This form is closed. Re-publish to share again.'
              : 'Publish your form first to get a shareable link.'
          }
        >
          <Button onClick={onPublish} className="self-start">
            {status === 'closed' ? 'Re-publish' : 'Publish now'}
          </Button>
        </PanelCard>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="bg-h4 font-bold text-(--text-primary)">Share</h2>
        <p className="bg-body text-(--text-muted) mt-1">Your form is live — share it however works best.</p>
      </div>

      <PanelCard label="Public link" description="Anyone with this link can respond to your form.">
        <div className="flex items-center gap-2">
          <Input id="share-public-url" value={publicUrl} readOnly className="font-mono" />
          <button
            type="button"
            onClick={() => copy(publicUrl, 'Link copied to clipboard.')}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md p-2 text-(--text-disabled) hover:bg-(--accent-soft) hover:text-(--accent-soft-text)"
            aria-label="Copy link"
          >
            <Copy size={16} />
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-(--text-disabled) hover:text-(--accent-soft-text) hover:bg-(--accent-soft) rounded-md shrink-0 min-w-11 min-h-11 flex items-center justify-center"
            aria-label="Open in new tab"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </PanelCard>

      <PanelCard label="Embed code" description="Paste this into your website to embed the form.">
        <pre className="rounded-md border-2 border-(--border-default) bg-(--bg-subtle) p-3 bg-body-sm font-mono overflow-x-auto whitespace-pre-wrap break-all">
          {embedCode}
        </pre>
        <Button variant="secondary" onClick={() => copy(embedCode, 'Embed code copied.')} className="self-start">
          Copy embed code
        </Button>
      </PanelCard>

      <PanelCard label="QR code" description="Scan to open the form on a phone.">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- client-generated data: URI, not a static asset
          <img src={qrDataUrl} alt="QR code linking to the public form" width={200} height={200} />
        ) : (
          <p className="bg-body-sm text-(--text-muted)">QR code could not be generated</p>
        )}
        <Button variant="secondary" onClick={downloadQr} disabled={!qrDataUrl} className="self-start">
          Download QR
        </Button>
      </PanelCard>
    </div>
  );
}
