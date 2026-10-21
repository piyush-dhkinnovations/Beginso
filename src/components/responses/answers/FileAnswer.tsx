'use client';

import { useState } from 'react';
import { Download, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { formatFileSize } from '@/lib/formatters';
import { responsesService } from '@/services/responses';
import type { IResponseFile } from '@/types/response';

interface FileAnswerProps {
  responseId: string;
  file: IResponseFile;
  /** One-line chip (the Table layout) instead of the full card. */
  compact?: boolean;
}

// Only these formats can be previewed, and the blob is re-typed from this list — never from what the server or
// the uploader claimed. A file mislabelled as a PDF therefore cannot be opened as HTML on this site's origin.
const PREVIEWABLE: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

const extensionOf = (name: string): string => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '');

export function FileAnswer({ responseId, file, compact = false }: FileAnswerProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<'download' | 'preview' | null>(null);
  const ext = extensionOf(file.name);
  const previewType = PREVIEWABLE[ext];
  const format = ext ? ext.toUpperCase() : 'File';

  async function run(kind: 'download' | 'preview') {
    setBusy(kind);
    try {
      const raw = await responsesService.getFileBlob(responseId, file.id);
      const blob = new Blob([raw], { type: kind === 'preview' ? previewType : 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      if (kind === 'download') {
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      // Give the browser time to start the download / load the tab before the URL is released.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast(kind === 'download' ? 'Could not download this file. Please try again.' : 'Could not open this file. Please try again.', 'error');
    } finally {
      setBusy(null);
    }
  }

  if (compact) {
    return (
      <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-(--border-default) bg-(--surface-card) py-0.5 pl-2.5 pr-1">
        <FileText size={13} className="shrink-0 text-(--text-muted)" aria-hidden="true" />
        <span className="max-w-56 truncate bg-body-sm font-medium text-(--text-primary)" title={file.name}>{file.name}</span>
        {previewType && (
          <Button variant="ghost" size="small" onClick={() => void run('preview')} isLoading={busy === 'preview'} aria-label={`Preview ${file.name}`} className="px-1.5">
            <Eye size={14} aria-hidden="true" />
          </Button>
        )}
        <Button variant="ghost" size="small" onClick={() => void run('download')} isLoading={busy === 'download'} aria-label={`Download ${file.name}`} className="px-1.5">
          <Download size={14} aria-hidden="true" />
        </Button>
      </span>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-lg border border-(--border-default) bg-(--surface-card) p-3">
      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-md bg-(--bg-subtle) text-(--text-muted)">
        <FileText size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate bg-body-sm font-medium text-(--text-primary)" title={file.name}>{file.name}</p>
        <p className="bg-caption text-(--text-muted)">
          {format} · {formatFileSize(file.size)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {previewType && (
          <Button variant="secondary" size="small" onClick={() => void run('preview')} isLoading={busy === 'preview'} aria-label={`Preview ${file.name}`}>
            <Eye size={14} className="mr-1.5" aria-hidden="true" />
            Preview
          </Button>
        )}
        <Button variant="secondary" size="small" onClick={() => void run('download')} isLoading={busy === 'download'} aria-label={`Download ${file.name}`}>
          <Download size={14} className="mr-1.5" aria-hidden="true" />
          Download
        </Button>
      </div>
    </div>
  );
}
