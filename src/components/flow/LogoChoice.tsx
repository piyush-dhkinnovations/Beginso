'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
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

  const pill =
    'relative flex flex-1 cursor-pointer items-center justify-center rounded-lg px-3 py-2 bg-body-sm font-semibold transition-colors has-focus-visible:shadow-(--shadow-focus)';
  const on = 'bg-(--surface-card) text-(--text-primary) shadow-(--shadow-sm)';
  const off = 'text-(--text-muted) hover:text-(--text-primary)';
  const link = 'font-semibold text-(--accent-soft-text) hover:underline';

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0" disabled={disabled}>
      <legend className="mb-2 bg-label">{subject === 'form' ? 'Form logo' : 'Workspace logo'}</legend>
      <div className="flex items-center gap-4">
        {/* The logo as it will appear: the default mark, the uploaded image, or an empty dashed square waiting for one. */}
        <span
          className={cn(
            'flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-(--surface-card) transition-colors',
            uploadChosen && !value ? 'border-2 border-dashed border-(--border-strong)' : 'border border-(--border-default) shadow-(--shadow-sm)'
          )}
        >
          {uploading ? (
            <Loader2 size={24} className="animate-spin text-(--text-muted)" aria-label="Uploading" />
          ) : uploadChosen ? (
            value ? (
              // eslint-disable-next-line @next/next/no-img-element -- backend-served upload, not a static asset
              <img src={value} alt="Your uploaded logo" className="size-full object-cover" />
            ) : (
              <ImagePlus size={26} className="text-(--text-muted)" aria-hidden="true" />
            )
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- local brand mark
            <img src="/favicon.svg" alt="" className="size-11" />
          )}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex gap-1 rounded-xl bg-(--surface-hover) p-1">
            <label className={cn(pill, !uploadChosen ? on : off)}>
              <input
                type="radio"
                name={`${subject}-logo`}
                className="sr-only"
                checked={!uploadChosen}
                onChange={() => {
                  setWantsUpload(false);
                  onChange(null);
                }}
              />
              BeginSo default
            </label>
            <label className={cn(pill, uploadChosen ? on : off)}>
              <input
                type="radio"
                name={`${subject}-logo`}
                className="sr-only"
                checked={uploadChosen}
                onChange={() => {
                  setWantsUpload(true);
                  if (!value) inputRef.current?.click();
                }}
              />
              {value ? 'Your logo' : 'Upload your logo'}
            </label>
          </div>
          <p className="m-0 flex flex-wrap items-center gap-x-3 bg-caption text-(--text-muted)">
            {value ? (
              <>
                <button type="button" onClick={() => inputRef.current?.click()} className={link}>
                  Replace
                </button>
                <button
                  type="button"
                  aria-label="Remove logo"
                  onClick={() => {
                    setWantsUpload(false);
                    onChange(null);
                  }}
                  className="font-semibold hover:text-(--error-text) hover:underline"
                >
                  Remove
                </button>
              </>
            ) : uploadChosen ? (
              <>
                <button type="button" onClick={() => inputRef.current?.click()} className={link}>
                  Choose an image
                </button>
                <span>PNG, JPG up to {MAX_MB} MB</span>
              </>
            ) : (
              `Your ${subject} uses the BeginSo mark until you upload your own.`
            )}
          </p>
        </div>
        <input ref={inputRef} type="file" accept={ACCEPTED.join(',')} className="sr-only" tabIndex={-1} aria-label={`Upload ${subject} logo`} onChange={(e) => void pick(e.target.files?.[0])} />
      </div>
      <p className="mt-3 bg-caption text-(--text-muted)">
        {subject === 'form' ? 'Shown on the form card and at the top of your public form. You can change it any time.' : 'Shown in the sidebar next to your workspace name. You can change it any time in Settings.'}
      </p>
    </fieldset>
  );
}
