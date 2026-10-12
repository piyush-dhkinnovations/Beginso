'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import { validateFile } from '@/lib/validateFile';
import type { FileUploadRendererProps, UploadState } from '@/types/publicForm';
import { FieldShell } from './FieldShell';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The actual file transfer happens at final submit (PublicFormShell hands the
 * File to submitForm's multipart body per the backend's documented contract —
 * see tasks.md task 4.10 for why there's no separate pre-upload endpoint).
 * This renderer only validates client-side and simulates the "Uploading" visual
 * state briefly before settling on "Uploaded" — no real network call happens here.
 */
export function FileUploadRenderer({ field, setValue, error, disabled, onFileChange, onUploadStateChange }: FileUploadRendererProps) {
  const [state, setState] = useState<UploadState>({ status: 'idle' });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Tracked separately from state so the unmount cleanup below always revokes whatever URL is
  // actually live, regardless of render timing — a plain closure over `previewUrl` in that
  // effect would only ever see the value from the render that registered it.
  const previewUrlRef = useRef<string | null>(null);

  // Object URLs are only ever created client-side for a File that hasn't been uploaded
  // anywhere yet (see file-level comment) — they must be revoked or the blob leaks for the
  // life of the tab. Revoke on unmount in case the field/page goes away mid-upload.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function setPreview(file: File | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setPreviewUrl(previewUrlRef.current);
  }

  useEffect(() => {
    onUploadStateChange?.(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire on state change only, onUploadStateChange identity is not meant to retrigger this
  }, [state]);

  useEffect(() => {
    if (state.status !== 'uploading') return;
    const interval = setInterval(() => {
      setState((prev) => {
        if (prev.status !== 'uploading') return prev;
        const nextProgress = Math.min((prev.progress ?? 0) + 25, 100);
        if (nextProgress >= 100) {
          return { status: 'uploaded', fileName: prev.fileName, fileSize: prev.fileSize };
        }
        return { ...prev, progress: nextProgress };
      });
    }, 100);
    return () => clearInterval(interval);
  }, [state.status]);

  function handleFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setPreview(null);
      setState({ status: 'failed', fileName: file.name, error: validationError });
      return;
    }
    setPreview(file);
    setState({ status: 'uploading', fileName: file.name, fileSize: file.size, progress: 0 });
    setValue(field.fieldId, file.name);
    onFileChange?.(file);
  }

  function handleRemove() {
    setPreview(null);
    setState({ status: 'idle' });
    setValue(field.fieldId, undefined);
    onFileChange?.(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <FieldShell fieldId={field.fieldId} label={field.label} required={field.required} helpText={field.helpText} error={error}>
      <input
        ref={inputRef}
        type="file"
        id={field.fieldId}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {state.status === 'idle' && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload a file — click or drag and drop"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-1 w-full min-h-30 rounded-md border-2 border-dashed border-(--border-default) text-center px-4 py-6 cursor-pointer transition-colors',
            'hover:border-(--border-strong)',
            disabled && 'opacity-60 cursor-not-allowed pointer-events-none'
          )}
        >
          <Upload size={20} className="text-(--text-disabled)" />
          <p className="bg-body-sm text-(--text-primary)">Click or drag and drop a file</p>
          <p className="bg-caption text-(--text-disabled)">
            PDF, Word, Excel, images, video (MP4), ZIP, plain text — up to 100 MB
          </p>
        </div>
      )}

      {state.status === 'uploading' && (
        <div className="flex flex-col gap-2 w-full min-h-11 rounded-lg border border-(--border-default) px-3 py-2">
          <div className="flex items-center gap-2">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- ephemeral blob: URL for a file the browser hasn't uploaded anywhere yet, not a static asset
              <img src={previewUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover border border-(--border-default)" />
            )}
            <Spinner />
            <span className="bg-body-sm text-(--text-primary) truncate">{state.fileName}</span>
            <span className="bg-caption text-(--text-disabled) ml-auto">{state.progress ?? 0}%</span>
          </div>
          <div className="h-1 w-full bg-(--border-default) rounded-full overflow-hidden">
            <div
              className="h-full bg-(--action-primary) rounded-full transition-all duration-150"
              style={{ width: `${state.progress ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {state.status === 'uploaded' && (
        <div className="flex items-center gap-2 w-full min-h-11 rounded-lg border border-(--border-default) px-3 py-2">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- ephemeral blob: URL for a file the browser hasn't uploaded anywhere yet, not a static asset
            <img src={previewUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover border border-(--border-default)" />
          ) : (
            // Neutral, not text-(--success-text)/Check-as-done — the real transfer hasn't
            // happened yet (it's part of the final multipart submit), so this
            // state means "ready to submit", not "uploaded".
            <Check size={16} className="text-(--text-disabled) shrink-0" />
          )}
          <span className="bg-body-sm text-(--text-primary) truncate">{state.fileName}</span>
          <span className="bg-caption text-(--text-disabled)">
            Ready{state.fileSize !== undefined ? ` · ${formatFileSize(state.fileSize)}` : ''}
          </span>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="ml-auto min-h-11 px-2 bg-caption text-(--text-muted) hover:text-(--text-primary) underline"
          >
            Remove
          </button>
        </div>
      )}

      {state.status === 'failed' && (
        <div className="flex items-center gap-2 w-full min-h-11 rounded-lg border border-(--error) px-3 py-2">
          <AlertCircle size={16} className="text-(--error-text) shrink-0" />
          <span className="bg-body-sm text-(--text-primary) truncate">{state.fileName}</span>
          <span className="bg-caption text-(--error-text)">{state.error}</span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="ml-auto min-h-11 px-2 bg-caption text-(--text-link) hover:text-(--accent-soft-text) underline"
          >
            Retry
          </button>
        </div>
      )}
    </FieldShell>
  );
}
