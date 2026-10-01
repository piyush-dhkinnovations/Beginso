'use client';

import { useState } from 'react';
import { Archive, Download, File, FileAudio, FileText, Film, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { IResponseFile } from '@/types/response';

interface UploadedFilesPreviewProps {
  responseId: string;
  files: IResponseFile[];
}

function fileKind(type: string) {
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  if (type === 'application/pdf') return 'pdf';
  return 'file';
}

function FileTypeIcon({ type, size = 20 }: { type: string; size?: number }) {
  const props = { size, 'aria-hidden': true as const };
  if (type.startsWith('image/')) return <ImageIcon {...props} />;
  if (type.startsWith('video/')) return <Film {...props} />;
  if (type.startsWith('audio/')) return <FileAudio {...props} />;
  if (type.includes('zip')) return <Archive {...props} />;
  if (type.includes('pdf') || type.includes('document') || type.startsWith('text/')) return <FileText {...props} />;
  return <File {...props} />;
}

export function UploadedFilesPreview({ responseId, files }: UploadedFilesPreviewProps) {
  const [selectedId, setSelectedId] = useState(files[0]?.id ?? '');

  if (files.length === 0) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-(--border-default) bg-(--bg-subtle) px-6 text-center">
        <File size={24} className="text-(--text-disabled)" aria-hidden="true" />
        <p className="bg-body-sm font-medium text-(--text-secondary)">No uploaded files</p>
        <p className="bg-caption text-(--text-disabled)">This response does not include an attachment.</p>
      </div>
    );
  }

  const selected = files.find((file) => file.id === selectedId) ?? files[0];
  const previewUrl = `/api/responses/${encodeURIComponent(responseId)}/file/${encodeURIComponent(selected.id)}`;
  const kind = fileKind(selected.type);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border border-(--border-default) bg-(--bg-subtle)">
        <div className="flex min-h-60 items-center justify-center bg-(--bg-sunken) lg:min-h-72">
          {kind === 'image' && (
            // The route is an authenticated same-origin proxy and never exposes the storage URL.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={`Preview of ${selected.name}`} className="max-h-80 w-full object-contain" />
          )}
          {kind === 'pdf' && <iframe src={previewUrl} title={`Preview of ${selected.name}`} className="h-80 w-full bg-(--surface-card)" />}
          {kind === 'video' && (
            <video src={previewUrl} controls className="max-h-80 w-full bg-(--surface-inverse)" aria-label={`Preview of ${selected.name}`} />
          )}
          {kind === 'audio' && (
            <div className="flex w-full flex-col items-center gap-5 px-8 py-12 text-(--text-muted)">
              <FileAudio size={40} aria-hidden="true" />
              <audio src={previewUrl} controls className="w-full max-w-sm" aria-label={`Preview of ${selected.name}`} />
            </div>
          )}
          {kind === 'file' && (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center text-(--text-muted)">
              <FileTypeIcon type={selected.type} size={40} />
              <p className="bg-body-sm font-medium text-(--text-secondary)">Preview is not available for this file type</p>
              <p className="bg-caption text-(--text-disabled)">{selected.name}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-(--border-default) bg-(--surface-card) p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-(--bg-sunken) text-(--text-muted)">
            <FileTypeIcon type={selected.type} size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate bg-body-sm font-semibold text-(--text-primary)" title={selected.name}>{selected.name}</p>
            <p className="bg-caption text-(--text-disabled)">{formatFileSize(selected.size)}</p>
          </div>
          <Button variant="secondary" size="small" onClick={() => undefined} aria-label={`Download ${selected.name}`} className="gap-1.5">
            <Download size={14} aria-hidden="true" />
            Download
          </Button>
        </div>
      </div>

      {files.length > 1 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {files.map((file) => {
            const isSelected = file.id === selected.id;
            return (
              <button
                key={file.id}
                type="button"
                onClick={() => setSelectedId(file.id)}
                aria-pressed={isSelected}
                className={cn(
                  'flex min-h-14 items-center gap-2 rounded-md border bg-(--surface-card) p-2 text-left outline-none transition-colors hover:bg-(--surface-hover) focus:ring-2 focus:ring-(--border-strong)',
                  isSelected ? 'border-(--border-focus) bg-(--accent-soft)' : 'border-(--border-default)'
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-(--bg-sunken) text-(--text-muted)">
                  <FileTypeIcon type={file.type} size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate bg-caption font-semibold text-(--text-secondary)" title={file.name}>{file.name}</span>
                  <span className="block bg-caption text-(--text-disabled)">{formatFileSize(file.size)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
