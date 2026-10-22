'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IMAGE_ACCEPT, imageSettings, validateImage } from '@/lib/fieldDisplay';
import type { FileUploadRendererProps } from '@/types/publicForm';
import { FieldShell } from './FieldShell';

interface Picked {
  id: string;
  file: File;
  url: string;
}

/**
 * One or more images, checked in the browser (type, size, count) before they are ever sent — the server checks
 * again. Like FileUploadRenderer, nothing is uploaded here: the Files go up with the final submit, and RHF only
 * holds the file names as a "something was chosen" placeholder for the required check.
 */
export function ImageUploadRenderer({ field, setValue, trigger, error, disabled, inline, onFilesChange }: FileUploadRendererProps) {
  const settings = imageSettings(field);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // The live list, for the unmount cleanup below (a closure over `picked` would only see the first render).
  const pickedRef = useRef<Picked[]>([]);

  useEffect(() => {
    return () => pickedRef.current.forEach((p) => URL.revokeObjectURL(p.url));
  }, []);

  function commit(next: Picked[]) {
    pickedRef.current = next;
    setPicked(next);
    setValue(field.fieldId, next.length ? next.map((p) => p.file.name).join(', ') : undefined);
    onFilesChange?.(next.map((p) => p.file));
    if (next.length) void trigger(field.fieldId);
  }

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    // A single-image field replaces what is there, so all of its room is free; a multi-image field only has what is left.
    const room = settings.allowMultiple ? settings.maxImages - picked.length : settings.maxImages;
    const accepted: Picked[] = [];
    let message: string | null = null;
    for (const file of Array.from(list)) {
      const invalid = validateImage(file, settings.maxSizeMb);
      if (invalid) {
        message = `${file.name}: ${invalid}`;
        continue;
      }
      if (accepted.length >= room) {
        message = `You can upload up to ${settings.maxImages} image${settings.maxImages === 1 ? '' : 's'}.`;
        break;
      }
      accepted.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) });
    }
    setProblem(message);
    // A single-image field swaps the image instead of refusing the second one.
    if (!settings.allowMultiple && accepted.length) {
      picked.forEach((p) => URL.revokeObjectURL(p.url));
      commit(accepted.slice(0, 1));
    } else if (accepted.length) {
      commit([...picked, ...accepted]);
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  function remove(id: string) {
    const target = picked.find((p) => p.id === id);
    if (target) URL.revokeObjectURL(target.url);
    setProblem(null);
    commit(picked.filter((p) => p.id !== id));
  }

  const full = picked.length >= settings.maxImages;
  const remaining = settings.maxImages - picked.length;
  const addLabel = `Add ${remaining} more image${remaining === 1 ? '' : 's'}`;

  return (
    <FieldShell fieldId={field.fieldId} label={field.label} required={field.required} helpText={field.helpText} error={error} inline={inline}>
      <input
        ref={inputRef}
        type="file"
        id={field.fieldId}
        accept={IMAGE_ACCEPT}
        multiple={settings.allowMultiple}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => addFiles(e.target.files)}
      />

      {!full && picked.length === 0 && (
        <div
          role="button"
          tabIndex={0}
          aria-label={settings.allowMultiple ? 'Add images — click or drag and drop' : 'Add an image — click or drag and drop'}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
          className={cn(
            'flex w-full min-h-30 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-(--border-default) px-4 py-6 text-center transition-colors hover:border-(--border-strong)',
            disabled && 'pointer-events-none cursor-not-allowed opacity-60'
          )}
        >
          <ImagePlus size={20} className="text-(--text-disabled)" aria-hidden="true" />
          <p className="bg-body-sm text-(--text-primary)">
            {settings.allowMultiple ? 'Click or drag and drop images' : 'Click or drag and drop an image'}
          </p>
          <p className="bg-caption text-(--text-disabled)">
            JPG, PNG or WebP · up to {settings.maxSizeMb} MB{settings.allowMultiple ? ` each · up to ${settings.maxImages} images` : ''}
          </p>
        </div>
      )}

      {problem && (
        <p role="alert" className="bg-caption font-semibold text-(--error-text)">
          {problem}
        </p>
      )}

      {picked.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {picked.map((p) => (
            <li key={p.id} className="relative overflow-hidden rounded-md border border-(--border-default) bg-(--bg-subtle)">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL of a file the browser has not uploaded yet */}
              <img src={p.url} alt={p.file.name} className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(p.id)}
                disabled={disabled}
                aria-label={`Remove ${p.file.name}`}
                className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-(--surface-card) text-(--text-primary) shadow-(--shadow-sm) hover:bg-(--surface-hover)"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
          {!full && (
            <li>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  addFiles(e.dataTransfer.files);
                }}
                disabled={disabled}
                aria-label={settings.allowMultiple ? addLabel : 'Replace image'}
                className={cn(
                  'flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-(--border-default) bg-(--surface-card) p-3 text-center transition-colors hover:border-(--border-strong)',
                  disabled && 'cursor-not-allowed opacity-60'
                )}
              >
                <ImagePlus size={22} className="text-(--text-disabled)" aria-hidden="true" />
                <span className="bg-body-sm text-(--text-secondary)">{settings.allowMultiple ? addLabel : 'Replace image'}</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </FieldShell>
  );
}
