'use client';

import { useState } from 'react';
import { Archive, Download, File, FileText, Film, Image as ImageIcon } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const { url } = await responsesService.getFileDownloadUrl(responseId, fileId);
      window.open(url, '_blank');
    } catch {
      toast('Failed to generate download link. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn('flex items-center gap-2', !isAvailable && 'opacity-60 cursor-not-allowed')}
      title={!isAvailable ? 'File no longer available' : undefined}
    >
      {renderFileIcon(mimeType)}
      <span className="text-body-sm font-medium text-neutral-700 truncate max-w-[200px]">{originalName}</span>
      <span className="text-caption text-neutral-400 ml-1">{formatFileSize(size)}</span>
      <Button
        variant="ghost"
        size="small"
        aria-label={isLoading ? `Downloading ${originalName}…` : `Download ${originalName}`}
        aria-busy={isLoading}
        onClick={handleDownload}
        disabled={!isAvailable || isLoading}
        className="w-8 h-8 p-0 ml-auto"
      >
        {isLoading ? <LoadingSpinner variant="inline" /> : <Download size={16} />}
      </Button>
    </div>
  );
}
