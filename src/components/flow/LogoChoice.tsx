'use client';

import { useRef, useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { uploadService } from '@/services/upload';

const MAX_MB = 2;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

interface LogoChoiceProps {
  /** URL of the uploaded logo, or null for the BeginSo default. */
  value: string | null;
  onChange: (url: string | null) => void;
  /** What the logo is for — only changes the helper copy. */
  subject: 'form' | 'workspace';
  disabled?: boolean;
}

/**
 * "BeginSo default" or "Upload your logo". Choosing upload opens the file picker straight away; the file is
 * checked (type, 2 MB) and uploaded on the spot, and the card then shows it with a way to remove it.
 * Two real radios underneath, so it works with a keyboard and a screen reader.
 */
export function LogoChoice({ value, onChange, subject, disabled }: LogoChoiceProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // Picking "Upload" before a file exists must show that card as chosen, so the choice is tracked here and
  // not derived from `value` alone.
  const [wantsUpload, setWantsUpload] = useState(Boolean(value));
  const uploadChosen = wantsUpload || Boolean(value);

  async function pick(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return toast('Use a PNG, JPG, WebP or GIF image.', 'error');
    if (file.size > MAX_MB * 1024 * 1024) return toast(`The logo must be ${MAX_MB} MB or smaller.`, 'error');
    setUploading(true);
    try {
      const res = await uploadService.uploadFile(file);
      onChange(res.url);
    } catch {
      toast('Upload failed. Please try again.', 'error');
      if (!value) setWantsUpload(false);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const card = 'relative flex min-h-24 flex-1 cursor-pointer items-center gap-3 rounded-xl border bg-(--surface-card) p-3 transition-all duration-200 has-focus-visible:shadow-(--shadow-focus)';
  const on = 'border-(--primary-500) bg-(--surface-active) shadow-[inset_0_0_0_1px_var(--primary-500)]';
  const off = 'border-(--border-default) hover:border-(--border-strong) hover:bg-(--surface-hover)';

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0" disabled={disabled}>
      <legend className="mb-2 bg-label">{subject === 'form' ? 'Form logo' : 'Workspace logo'}</legend>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className={cn(card, !uploadChosen ? on : off)}>
          <input
            type="radio"
            name={`${subject}-logo`}
            className="bg-radio shrink-0"
            checked={!uploadChosen}
            onChange={() => {
              setWantsUpload(false);
              onChange(null);
            }}
          />
          <span className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-(--border-default) bg-(--surface-card)">
            {/* eslint-disable-next-line @next/next/no-img-element -- local brand mark */}
            <img src="/favicon.svg" alt="" className="size-8" />
          </span>
          <span className="min-w-0">
            <span className="block bg-body-sm font-semibold text-(--text-primary)">BeginSo default</span>
            <span className="block bg-caption text-(--text-muted)">Use the BeginSo logo</span>
          </span>
        </label>

        <label className={cn(card, uploadChosen ? on : off)}>
          <input
            type="radio"
            name={`${subject}-logo`}
            className="bg-radio shrink-0"
            checked={uploadChosen}
            onChange={() => {
              setWantsUpload(true);
              if (!value) inputRef.current?.click();
            }}
          />
          <span
            className={cn(
              'flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-(--surface-card)',
              value ? 'border-(--border-default)' : 'border-dashed border-(--border-strong)'
            )}
          >
            {uploading ? (
              <Loader2 size={20} className="animate-spin text-(--text-muted)" aria-label="Uploading" />
            ) : value ? (
              // eslint-disable-next-line @next/next/no-img-element -- backend-served upload, not a static asset
              <img src={value} alt="Your uploaded logo" className="size-full object-cover" />
            ) : (
              <Upload size={20} className="text-(--text-muted)" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block bg-body-sm font-semibold text-(--text-primary)">{value ? 'Your logo' : 'Upload your logo'}</span>
            <span className="block bg-caption text-(--text-muted)">
              {value ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    inputRef.current?.click();
                  }}
                  className="underline hover:text-(--text-primary)"
                >
                  Replace
                </button>
              ) : (
                `Use your custom logo · PNG, JPG up to ${MAX_MB} MB`
              )}
            </span>
          </span>
          {value && (
            <button
              type="button"
              aria-label="Remove logo"
              onClick={(e) => {
                e.preventDefault();
                setWantsUpload(false);
                onChange(null);
              }}
              className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--error-text)"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
          <input ref={inputRef} type="file" accept={ACCEPTED.join(',')} className="sr-only" tabIndex={-1} aria-label={`Upload ${subject} logo`} onChange={(e) => void pick(e.target.files?.[0])} />
        </label>
      </div>
      <p className="mt-2 bg-caption text-(--text-muted)">
        {subject === 'form' ? 'Shown on the form card and at the top of your public form. You can change it any time.' : 'Shown in the sidebar next to your workspace name. You can change it any time in Settings.'}
      </p>
    </fieldset>
  );
}
