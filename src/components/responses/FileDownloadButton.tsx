'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Archive, Download, Eye, File, FileText, Film, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/components/common/Toast';
import { responsesService } from '@/services/responses';
import { formatFileSize } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface FileDownloadButtonProps {
  responseId: string;
  fileId: string;
  originalName: string;
  size: number;
  mimeType: string;
  isAvailable: boolean;
}

const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

function renderFileIcon(mimeType: string) {
  const className = 'text-neutral-400 shrink-0';
  if (mimeType.startsWith('image/')) return <ImageIcon size={20} className={className} />;
  if (mimeType === 'video/mp4') return <Film size={20} className={className} />;
  if (mimeType === 'application/zip') return <Archive size={20} className={className} />;
  if (DOCUMENT_MIME_TYPES.has(mimeType)) return <FileText size={20} className={className} />;
  return <File size={20} className={className} />;
}

export function FileDownloadButton({
  responseId,
  fileId,
  originalName,
  size,
  mimeType,
  isAvailable,
}: FileDownloadButtonProps) {
  const [loadingAction, setLoadingAction] = useState<'preview' | 'download' | null>(null);
  const { toast } = useToast();

  // Revoked after a delay rather than immediately — a freshly window.open()'d tab, or the
  // browser's own download handoff, both need the blob: URL to stay alive a little past the
  // synchronous click.
  async function withFileBlob(action: 'preview' | 'download', consume: (blobUrl: string) => void) {
    setLoadingAction(action);
    try {
      const blobUrl = await responsesService.getFileBlobUrl(responseId, fileId);
      consume(blobUrl);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err) {
      // Surface the backend's actual reason (a real permission error vs. a CORS/network
      // failure look identical as a generic toast otherwise, and need different fixes).
      const serverMessage = isAxiosError(err) ? (err.response?.data as { message?: string } | undefined)?.message : undefined;
      if (isAxiosError(err)) {
        console.error(
          `File ${action} failed:`,
          err.response ? `${err.response.status} ${JSON.stringify(err.response.data)}` : `network/CORS error — ${err.message}`
        );
      }
      const fallback = action === 'preview' ? 'Failed to open file. Please try again.' : 'Failed to download file. Please try again.';
      toast(serverMessage ?? fallback, 'error');
    } finally {
      setLoadingAction(null);
    }
  }

  const handlePreview = () => withFileBlob('preview', (blobUrl) => window.open(blobUrl, '_blank'));

  const handleDownload = () =>
    withFileBlob('download', (blobUrl) => {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = originalName;
      link.click();
    });

  return (
    <div
      className={cn('flex items-center gap-2', !isAvailable && 'opacity-60 cursor-not-allowed')}
      title={!isAvailable ? 'File no longer available' : undefined}
    >
      {renderFileIcon(mimeType)}
      <span className="text-body-sm font-medium text-neutral-700 break-words min-w-0 flex-1" title={originalName}>
        {originalName}
      </span>
      <span className="text-caption text-neutral-400 shrink-0">{formatFileSize(size)}</span>
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="ghost"
          size="small"
          aria-label={loadingAction === 'preview' ? `Opening ${originalName}…` : `Preview ${originalName}`}
          aria-busy={loadingAction === 'preview'}
          onClick={handlePreview}
          disabled={!isAvailable || loadingAction !== null}
          className="w-8 h-8 p-0"
        >
          {loadingAction === 'preview' ? <LoadingSpinner variant="inline" /> : <Eye size={16} />}
        </Button>
        <Button
          variant="ghost"
          size="small"
          aria-label={loadingAction === 'download' ? `Downloading ${originalName}…` : `Download ${originalName}`}
          aria-busy={loadingAction === 'download'}
          onClick={handleDownload}
          disabled={!isAvailable || loadingAction !== null}
          className="w-8 h-8 p-0"
        >
          {loadingAction === 'download' ? <LoadingSpinner variant="inline" /> : <Download size={16} />}
        </Button>
      </div>
    </div>
  );
}
