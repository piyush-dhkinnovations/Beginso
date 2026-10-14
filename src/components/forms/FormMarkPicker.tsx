'use client';

import { useRef, useState } from 'react';
import { Ellipsis, Loader2, Search, Upload, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { uploadService } from '@/services/upload';
import { FEATURED_ICON_NAMES, ICON_CREDIT, getFormIcon, searchFormIcons, suggestFormIcon, type FormIconDef } from '@/lib/formIcons';
import { FormIcon } from '@/components/forms/FormIcon';
import type { FormMark } from '@/types/form';

const MAX_MB = 2;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export interface FormMarkPickerProps {
  value: FormMark;
  onChange: (mark: FormMark) => void;
  /** The form's name: the icon that suits it is selected until you choose another. */
  title?: string;
  disabled?: boolean;
}

// Radius is a percentage of the tile, the same one the icon square uses (26%), so the selection ring follows the icon's own curve at any size.
const TILE = 'flex aspect-square items-center justify-center rounded-[26%] outline-none transition-transform hover:scale-105 focus-visible:shadow-(--shadow-focus)';
// A small, even gap (2px) between the icon and its selection ring; the ring and the icon share the same percentage radius, so it follows the curve.
const RING = 'ring-2 ring-(--text-primary) ring-offset-2 ring-offset-(--surface-card)';

/**
 * Choosing a form's icon: one grid of colourful icons, the logo you upload as one more tile, and "More icons" for the rest of
 * the set. The icon that suits the form's name is selected to begin with (so there is nothing to decide), and picking any other
 * tile replaces it. Every tile is a real radio button, so it works with a keyboard and a screen reader.
 */
export function FormMarkPicker({ value, onChange, title = '', disabled }: FormMarkPickerProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // The last logo uploaded here stays on its tile even after another icon is picked, so switching back is one click.
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(value.logoUrl ?? null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [query, setQuery] = useState('');

  const suggestion = suggestFormIcon(title);
  const chosenIcon = value.logoUrl ? undefined : getFormIcon(value.iconName);
  // Nothing chosen yet: the suggestion is what the form gets, so it shows as selected.
  const selectedName = value.logoUrl ? null : (chosenIcon ?? suggestion).name;

  // 14 up-front tiles. A selected icon that is not one of them takes the last place, so the choice is always visible.
  const featured = FEATURED_ICON_NAMES.map((n) => getFormIcon(n)).filter((i): i is FormIconDef => !!i);
  if (selectedName && !featured.some((i) => i.name === selectedName)) featured.splice(featured.length - 1, 1, getFormIcon(selectedName) as FormIconDef);

  const pickIcon = (i: FormIconDef) => {
    onChange({ logoUrl: null, iconName: i.name});
    setMoreOpen(false);
  };

  async function pickFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return toast('Use a PNG, JPG, WebP or GIF image.', 'error');
    if (file.size > MAX_MB * 1024 * 1024) return toast(`The logo must be ${MAX_MB} MB or smaller.`, 'error');
    setUploading(true);
    try {
      const res = await uploadService.uploadFile(file);
      setUploadedUrl(res.url);
      onChange({ logoUrl: res.url, iconName: null});
    } catch {
      toast('Upload failed. Please try again.', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function onUploadTile() {
    if (uploadedUrl) onChange({ logoUrl: uploadedUrl, iconName: null});
    else fileRef.current?.click();
  }

  const logoSelected = Boolean(value.logoUrl);
  const results = searchFormIcons(query);

  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0" disabled={disabled}>
      <legend className="mb-1 bg-label">Form icon</legend>

      <div role="radiogroup" aria-label="Form icon" className="grid grid-cols-8 gap-3">
        {featured.map((i) => (
          <button
            key={i.name}
            type="button"
            role="radio"
            aria-checked={selectedName === i.name}
            aria-label={i.label}
            title={i.label}
            onClick={() => pickIcon(i)}
            className={cn(TILE, selectedName === i.name && RING)}
          >
            <FormIcon name={i.name} size={64} fill />
          </button>
        ))}

        <span className="relative">
          <button
            type="button"
            role="radio"
            aria-checked={logoSelected}
            aria-label={uploadedUrl ? 'Your logo' : 'Upload your logo'}
            title={uploadedUrl ? 'Your logo' : 'Upload your logo'}
            onClick={onUploadTile}
            className={cn(
              TILE,
              'w-full overflow-hidden border border-dashed border-(--border-strong) bg-(--surface-card) text-(--text-muted) hover:text-(--text-primary)',
              logoSelected && RING,
              uploadedUrl && 'border-solid border-(--border-default)'
            )}
          >
            {uploading ? (
              <Loader2 size={20} className="animate-spin" aria-label="Uploading" />
            ) : uploadedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- backend-served upload, not a static asset
              <img src={uploadedUrl} alt="" className="size-full object-contain p-1" />
            ) : (
              <Upload size={20} aria-hidden="true" />
            )}
          </button>
          {uploadedUrl && !uploading && (
            <button
              type="button"
              aria-label="Remove logo"
              onClick={() => {
                setUploadedUrl(null);
                if (value.logoUrl) onChange({ logoUrl: null, iconName: null});
              }}
              className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border border-(--border-default) bg-(--surface-card) text-(--text-muted) shadow-(--shadow-sm) hover:text-(--error-text)"
            >
              <X size={11} aria-hidden="true" />
            </button>
          )}
        </span>

        <button
          type="button"
          aria-label="More icons"
          title="More icons"
          onClick={() => setMoreOpen(true)}
          className={cn(TILE, 'border border-(--border-default) text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary)')}
        >
          <Ellipsis size={20} aria-hidden="true" />
        </button>
      </div>

      <p className="bg-caption text-(--text-muted)">
        {logoSelected ? 'Using your logo.' : value.iconName ? 'Pick another any time, or upload your own logo.' : 'Chosen from the name. Pick another or upload your own logo.'}
      </p>
      <input ref={fileRef} type="file" accept={ACCEPTED.join(',')} className="sr-only" tabIndex={-1} aria-label="Upload form logo" onChange={(e) => void pickFile(e.target.files?.[0])} />

      <Modal isOpen={moreOpen} onClose={() => setMoreOpen(false)} title="All icons" description="Pick one for your form.">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search, e.g. order, health, event"
              aria-label="Search icons"
              className="min-h-10 w-full rounded-lg border border-(--border-default) bg-(--surface-card) pl-9 pr-3 bg-body-sm outline-none focus:border-(--border-strong)"
            />
          </div>
          <div role="radiogroup" aria-label="All icons" className="grid max-h-72 grid-cols-6 gap-2.5 overflow-y-auto p-1.5 sm:grid-cols-8">
            {results.map((i) => (
              <button
                key={i.name}
                type="button"
                role="radio"
                aria-checked={selectedName === i.name}
                aria-label={i.label}
                title={i.label}
                onClick={() => pickIcon(i)}
                className={cn(TILE, selectedName === i.name && RING)}
              >
                <FormIcon name={i.name} size={64} fill />
              </button>
            ))}
            {results.length === 0 && <p className="col-span-full bg-body-sm text-(--text-muted)">No icons match “{query}”.</p>}
          </div>
          {/* The icons are Streamline's free set, which asks for this credit (CC BY 4.0). */}
          <p className="bg-caption text-(--text-muted)">
            <a href={ICON_CREDIT.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-(--text-primary)">{ICON_CREDIT.text}</a>
          </p>
        </div>
      </Modal>
    </fieldset>
  );
}
