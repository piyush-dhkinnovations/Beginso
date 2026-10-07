'use client';

import { useId, useRef, useState } from 'react';
import { Loader2, Plus, Upload, X } from 'lucide-react';
import type { ButtonRadius, ButtonStyle, CoverPosition, FormBranding, FormSpacing } from '@/types/form';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { uploadService } from '@/services/upload';
import { useToast } from '@/components/ui/Toast';
import { BrandingLivePreview } from './BrandingLivePreview';
import { ImageCropModal } from './ImageCropModal';
import { PanelCard } from './PanelCard';

const PRESET_COLORS = ['#1D4ED8', '#0F172A', '#16A34A', '#DC2626', '#9333EA'];
const DEFAULT_COLOR = '#1D4ED8';
const HEX_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ─── Image upload zone (shared by Logo + Cover Image sections) ────────────────

export function ImageUploadZone({
  label,
  imageUrl,
  aspect,
  hint,
  compact,
  onUpload,
  onRemove,
}: {
  label: string;
  imageUrl?: string;
  aspect: 'square' | 'banner';
  /** Small format hint under the call to action, e.g. "PNG, SVG (Max 1MB)". */
  hint?: string;
  /** Same fixed height for logo and cover (Settings layout) instead of a tall 16:9 banner. */
  compact?: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  // A picked image goes through the crop dialog first (so any part of it can be used); a GIF skips it because
  // cropping would flatten its animation.
  const [pendingCrop, setPendingCrop] = useState<File | null>(null);

  const uploadNow = async (file: File) => {
    setIsUploading(true);
    try {
      await onUpload(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast('File type not supported. Use JPG, PNG, GIF, or WEBP.', 'error');
      return;
    }
    if (file.type === 'image/gif') {
      await uploadNow(file);
      return;
    }
    setPendingCrop(file);
  };

  const hasImage = Boolean(imageUrl) && !isUploading;

  return (
    <div
      onClick={() => !isUploading && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        void handleFile(e.dataTransfer.files[0]);
      }}
      // Design system "Dashed" pattern (wf-btn-dashed): 1.5px dashed neutral-400 border,
      // neutral-50 fill, darker dashed border on hover — reserved for upload zones.
      className={`relative flex flex-col items-center justify-center gap-1.5 border-[1.5px] border-dashed rounded-lg cursor-pointer overflow-hidden shrink-0 transition-colors ${
        compact
          ? aspect === 'square' ? 'w-full max-w-56 h-36' : 'w-full h-36'
          : aspect === 'square' ? 'w-24 h-24' : 'w-full aspect-video'
      } ${
        isDragging
          ? 'border-(--border-focus) bg-(--accent-soft)'
          : hasImage
          ? 'border-(--border-default) bg-(--surface-card)'
          : 'border-(--border-strong) bg-(--bg-subtle) hover:border-(--border-strong)'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      {isUploading ? (
        <Loader2 size={20} className="animate-spin text-(--text-disabled)" />
      ) : imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary backend-served upload URL, not a static asset
        <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
      ) : (
        <>
          <Upload size={aspect === 'square' ? 16 : 20} className="text-(--text-disabled)" />
          <span className="bg-caption font-semibold text-(--text-muted) text-center px-2">
            {aspect === 'square' ? 'Upload logo' : 'Click or drag to upload'}
          </span>
          {hint && <span className="bg-caption text-(--text-muted) text-center px-2 whitespace-nowrap">{hint}</span>}
        </>
      )}
      {hasImage && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-(--surface-card) border border-(--border-default) flex items-center justify-center text-(--text-muted) hover:text-(--error-text) shadow-(--shadow-sm)"
          aria-label={`Remove ${label.toLowerCase()}`}
        >
          <X size={12} />
        </button>
      )}
      {/* The dialog is a React portal, but React events still bubble through the component tree — without this a click
          or drag inside the crop dialog reached the upload box's onClick and opened the file picker. */}
      <div className="contents" onClick={(e) => e.stopPropagation()} onDragOver={(e) => e.stopPropagation()} onDrop={(e) => e.stopPropagation()}>
        <ImageCropModal
          file={pendingCrop}
          aspect={aspect === 'square' ? 1 : 16 / 5}
          outputWidth={aspect === 'square' ? 512 : 1600}
          mime={aspect === 'square' ? 'image/png' : 'image/jpeg'}
          title={aspect === 'square' ? 'Crop your logo' : 'Crop your cover image'}
          onCancel={() => setPendingCrop(null)}
          onConfirm={(cropped) => {
            setPendingCrop(null);
            void uploadNow(cropped);
          }}
        />
      </div>
    </div>
  );
}

export interface BrandingPanelProps {
  branding: FormBranding;
  formTitle: string;
  onUpdate: (updates: Partial<FormBranding>) => void;
  // Builder tabs have no other label for this section, so it needs its own heading there.
  // Settings' BrandingTab sits under a tab bar that already says "Branding" — a second
  // heading there was redundant and, unlike every other Settings tab, broke the shared
  // flush-left layout those tabs otherwise all match.
  showHeading?: boolean;
}

export function BrandingPanel({ branding, formTitle, onUpdate, showHeading = true }: BrandingPanelProps) {
  const uid = useId();
  const { toast } = useToast();
  const primaryColor = branding.primaryColor ?? DEFAULT_COLOR;
  const [hexInput, setHexInput] = useState(primaryColor);
  const [hexError, setHexError] = useState<string | null>(null);
  const [prevColor, setPrevColor] = useState(primaryColor);

  // Re-sync local hex input when the store's colour changes externally (undo, field switch)
  if (primaryColor !== prevColor) {
    setHexInput(primaryColor);
    setHexError(null);
    setPrevColor(primaryColor);
  }

  const commitColor = (color: string) => onUpdate({ primaryColor: color });

  const commitHexInput = () => {
    const trimmed = hexInput.trim();
    if (!HEX_REGEX.test(trimmed)) {
      setHexError('Enter a valid hex colour, e.g. #1D4ED8');
      setHexInput(primaryColor);
      return;
    }
    setHexError(null);
    commitColor(trimmed);
  };

  // Native <input type="color"> requires a full 6-digit #rrggbb value
  const colorPickerValue =
    primaryColor.length === 4
      ? `#${primaryColor[1]}${primaryColor[1]}${primaryColor[2]}${primaryColor[2]}${primaryColor[3]}${primaryColor[3]}`
      : primaryColor;

  const uploadImage = async (file: File, key: 'logoUrl' | 'coverImageUrl') => {
    try {
      const res = await uploadService.uploadFile(file);
      onUpdate({ [key]: res.url });
    } catch {
      toast('Upload failed. Check your connection.', 'error');
    }
  };

  return (
    // `w-full` is required, not decorative — this div is a flex item inside BrandingTab's
    // `flex flex-col` wrapper, and `mx-auto`'s auto margins override flexbox's default cross-axis
    // stretch, so without an explicit width the browser falls back to sizing this box from its own
    // content. `container-type: inline-size` below forbids exactly that (containment explicitly
    // decouples a container's size from its children), so the two together created a circular
    // dependency that collapsed the whole panel to near-zero width — a real regression caught live.
    <div className="branding-panel-shell w-full max-w-4xl mx-auto flex flex-col gap-6">
      {showHeading && (
        <div>
          <h2 className="bg-h4 font-bold text-(--text-primary)">Branding</h2>
          <p className="bg-body text-(--text-muted) mt-1">
            Set your brand colour, logo, and cover image. This shapes how your workspace looks everywhere.
          </p>
        </div>
      )}

      {/* Side-by-side above ~620px of *available container width* (not viewport) — a container
          query, not a media query, since this component is reused at very different widths: the
          Builder's wide properties panel vs. Settings' 440px-capped content column. A viewport
          media query would incorrectly try to go side-by-side on a wide desktop browser even
          though Settings' actual column is still only 440px, causing the exact overflow this was
          built to fix (real bug found via live mobile testing — the fixed two-column layout with
          no breakpoint at all forced the whole page to scroll horizontally). */}
      <div className="branding-panel-columns flex flex-col gap-6">
        <div className="branding-panel-main flex-1 flex flex-col gap-4 min-w-0">
          <PanelCard label="Primary colour" description="Used for buttons, links, and highlights across your workspace.">
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => commitColor(color)}
                  className="flex h-11 w-11 items-center justify-center rounded-full"
                  aria-label={`Use ${color}`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-7 w-7 rounded-full border-2 ${
                      primaryColor === color ? 'border-(--border-strong)' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                </button>
              ))}
              <div className="w-px h-5 bg-(--border-default)" />
              <label
                className="relative w-11 h-11 rounded-full flex items-center justify-center cursor-pointer"
                aria-label="Custom colour picker"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-(--border-strong) transition-colors hover:border-(--border-strong)">
                  <Plus size={12} className="text-(--text-disabled)" />
                </span>
                <input
                  type="color"
                  value={colorPickerValue}
                  onChange={(e) => commitColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-md border border-(--border-default) shrink-0"
                style={{ backgroundColor: primaryColor }}
              />
              <input
                id={`${uid}-hex`}
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value)}
                onBlur={commitHexInput}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="flex-1 rounded-md border-2 border-(--border-default) px-2.5 min-h-11 bg-body-sm font-mono bg-(--surface-card) outline-none focus:border-(--border-strong)"
              />
            </div>
            {hexError && <p className="bg-caption text-(--error-text) font-semibold">{hexError}</p>}
          </PanelCard>

          <PanelCard label="Buttons" description="How the Submit and Next buttons look to respondents.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                id={`${uid}-button-style`}
                label="Button style"
                value={branding.buttonStyle ?? 'solid'}
                onChange={(e) => onUpdate({ buttonStyle: e.target.value as ButtonStyle })}
              >
                <option value="solid">Solid</option>
                <option value="outline">Outline</option>
              </Select>
              <Select
                id={`${uid}-button-radius`}
                label="Corner radius"
                value={branding.buttonRadius ?? '8px'}
                onChange={(e) => onUpdate({ buttonRadius: e.target.value as ButtonRadius })}
              >
                <option value="4px">Square (4px)</option>
                <option value="8px">Rounded (8px)</option>
                <option value="16px">Pill (16px)</option>
              </Select>
            </div>
          </PanelCard>

          <PanelCard label="Layout details" description="Spacing, progress and how the cover is cropped.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                id={`${uid}-spacing`}
                label="Form spacing"
                value={branding.spacing ?? 'comfortable'}
                onChange={(e) => onUpdate({ spacing: e.target.value as FormSpacing })}
              >
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="spacious">Spacious</option>
              </Select>
              <Select
                id={`${uid}-cover-position`}
                label="Cover position"
                value={branding.coverPosition ?? 'center'}
                onChange={(e) => onUpdate({ coverPosition: e.target.value as CoverPosition })}
                disabled={!branding.coverImageUrl}
              >
                <option value="center">Center</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
              </Select>
            </div>
            {!branding.coverImageUrl && <p className="bg-caption text-(--text-muted)">Upload a cover image to choose where it is cropped.</p>}
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={`${uid}-progress`} className="bg-body-sm font-medium text-(--text-secondary)">
                Show progress indicator
                <span className="block bg-caption font-normal text-(--text-muted)">The step bar on multi-page forms.</span>
              </label>
              <Switch id={`${uid}-progress`} checked={branding.showProgress !== false} onChange={(v) => onUpdate({ showProgress: v })} />
            </div>
            <div>
              <p className="bg-body-sm font-medium text-(--text-secondary)">Font</p>
              <p className="bg-body text-(--text-primary)">DM Sans</p>
              <p className="bg-caption text-(--text-muted)">The product font is fixed so every form stays consistent and readable.</p>
            </div>
          </PanelCard>

          <PanelCard label="Logo" description="Square image, at least 256×256px. PNG or SVG with transparent background works best.">
            <ImageUploadZone
              label="Logo"
              imageUrl={branding.logoUrl}
              aspect="square"
              onUpload={(file) => uploadImage(file, 'logoUrl')}
              onRemove={() => onUpdate({ logoUrl: undefined })}
            />
          </PanelCard>

          <PanelCard label="Cover image" description="Shown at the top of shared pages. Recommended 1600×500px.">
            <ImageUploadZone
              label="Cover image"
              imageUrl={branding.coverImageUrl}
              aspect="banner"
              onUpload={(file) => uploadImage(file, 'coverImageUrl')}
              onRemove={() => onUpdate({ coverImageUrl: undefined })}
            />
          </PanelCard>
        </div>

        <div className="branding-panel-preview w-full flex flex-col gap-2">
          <span className="bg-overline text-(--text-muted)">Preview</span>
          <BrandingLivePreview branding={branding} formTitle={formTitle} />
          <button
            type="button"
            onClick={() =>
              onUpdate({ buttonStyle: undefined, buttonRadius: undefined, coverPosition: undefined, showProgress: undefined, spacing: undefined })
            }
            className="self-start min-h-11 bg-body-sm text-(--text-muted) underline underline-offset-2 hover:text-(--text-secondary)"
          >
            Reset style options
          </button>
        </div>
      </div>
    </div>
  );
}
