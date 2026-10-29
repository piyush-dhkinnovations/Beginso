'use client';

import { isAxiosError } from 'axios';
import { useId, useRef, useState } from 'react';
import { Loader2, Plus, Upload, X } from 'lucide-react';
import type { CoverFit, ButtonRadius, ButtonStyle, CardStyle, CoverPosition, FieldGrouping, FormBranding, FormWidth, FormFont, FormSpacing, LayoutPreset, PageBackground, PanelTreatment, TypeScale } from '@/types/form';
import { FORM_FONT_OPTIONS, PAGE_BACKGROUND_OPTIONS } from '@/lib/formTheme';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { shrinkImage } from '@/lib/shrinkImage';
import { uploadSrc } from '@/lib/uploadSrc';
import { uploadService } from '@/services/upload';
import { useToast } from '@/components/ui/Toast';
import { LiveFormPreview } from './LiveFormPreview';
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
  freeform,
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
  /** No crop step and no fixed frame: the picture goes up as it is and is previewed at its own ratio. */
  freeform?: boolean;
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
    if (file.type === 'image/gif' || freeform) {
      await uploadNow(freeform ? await shrinkImage(file).catch(() => file) : file);
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
        freeform
          ? imageUrl ? 'w-full' : 'w-full h-36'
          : compact
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
        <img src={uploadSrc(imageUrl)} alt={label} className={freeform ? 'block h-auto max-h-80 w-full object-contain' : 'w-full h-full object-cover'} />
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
  /** The form's layout, so the live preview is drawn in it. */
  layout?: LayoutPreset;
  /** The saved form the live preview loads; without one there is nothing to preview. */
  formId?: string;
  /** Guest builder: park the picked image locally instead of uploading it. The returned URL is what the form shows. */
  onPickImage?: (file: File, key: 'logoUrl' | 'coverImageUrl' | 'backgroundImageUrl') => Promise<string | null>;
  /** Guest builder: replaces the saved-form live preview. */
  preview?: React.ReactNode;
  // Builder tabs have no other label for this section, so it needs its own heading there.
  // Settings' BrandingTab sits under a tab bar that already says "Branding" — a second
  // heading there was redundant and, unlike every other Settings tab, broke the shared
  // flush-left layout those tabs otherwise all match.
  showHeading?: boolean;
}

export function BrandingPanel({ branding, onUpdate, layout, formId, onPickImage, preview, showHeading = true }: BrandingPanelProps) {
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

  // A form that already has a cover keeps showing it as before (cropped banner) until the owner chooses; a new one starts whole.
  const coverFit: CoverFit = branding.coverFit ?? (branding.coverImageUrl ? 'banner' : 'original');

  const uploadImage = async (file: File, key: 'logoUrl' | 'coverImageUrl' | 'backgroundImageUrl') => {
    try {
      const url = onPickImage ? await onPickImage(file, key) : (await uploadService.uploadFile(file)).url;
      if (!url) return; // the guest picker already told the user why
      // A cover remembers HOW it was added, so the form shows it the same way (whole, or cropped to the banner).
      onUpdate({ [key]: url, ...(key === 'coverImageUrl' ? { coverFit } : {}) });
    } catch (err) {
      toast(isAxiosError(err) && err.response?.status === 413 ? 'That image is too large. Use one under 5 MB.' : 'Upload failed. Check your connection.', 'error');
    }
  };

  return (
    // `w-full` is required, not decorative — this div is a flex item inside BrandingTab's
    // `flex flex-col` wrapper, and `mx-auto`'s auto margins override flexbox's default cross-axis
    // stretch, so without an explicit width the browser falls back to sizing this box from its own
    // content. `container-type: inline-size` below forbids exactly that (containment explicitly
    // decouples a container's size from its children), so the two together created a circular
    // dependency that collapsed the whole panel to near-zero width — a real regression caught live.
    <div className="branding-panel-shell @container w-full flex flex-col gap-6">
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
      <div className="flex flex-col gap-6 @3xl:flex-row @3xl:items-start">
        <div className="flex min-w-0 flex-col gap-4 @3xl:w-1/3 @3xl:max-w-120 @3xl:shrink-0">
          <PanelCard label="Primary colour" description="Used for buttons, links and highlights.">
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
              {branding.coverImageUrl && coverFit === 'banner' && (
                <Select
                  id={`${uid}-cover-position`}
                  label="Cover position"
                  value={branding.coverPosition ?? 'center'}
                  onChange={(e) => onUpdate({ coverPosition: e.target.value as CoverPosition })}
                >
                  <option value="center">Center</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                </Select>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={`${uid}-progress`} className="bg-body-sm font-medium text-(--text-secondary)">
                Show progress indicator
                <span className="block bg-caption font-normal text-(--text-muted)">The step bar on multi-page forms.</span>
              </label>
              <Switch id={`${uid}-progress`} checked={branding.showProgress !== false} onChange={(v) => onUpdate({ showProgress: v })} />
            </div>
          </PanelCard>

          <PanelCard label="Typography" description="The typeface and how large the headline reads. Inputs always stay at least 16px.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select id={`${uid}-font`} label="Font" value={branding.fontFamily ?? 'dm_sans'} onChange={(e) => onUpdate({ fontFamily: e.target.value as FormFont })}>
                {FORM_FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </Select>
              <Select id={`${uid}-scale`} label="Text size" value={branding.typeScale ?? 'default'} onChange={(e) => onUpdate({ typeScale: e.target.value as TypeScale })}>
                <option value="compact">Compact headline</option>
                <option value="default">Standard</option>
                <option value="large">Large headline</option>
              </Select>
            </div>
          </PanelCard>

          <PanelCard label="Style" description="The look of the form card, the colour panel and how fields are arranged.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select id={`${uid}-card-style`} label="Card style" value={branding.cardStyle ?? 'soft'} onChange={(e) => onUpdate({ cardStyle: e.target.value as CardStyle })}>
                <option value="flat">Flat</option>
                <option value="soft">Soft shadow</option>
                <option value="bordered">Bordered</option>
                <option value="elevated">Elevated</option>
              </Select>
              <Select id={`${uid}-panel`} label="Colour panel" value={branding.panelTreatment ?? 'solid'} onChange={(e) => onUpdate({ panelTreatment: e.target.value as PanelTreatment })}>
                <option value="solid">Solid colour</option>
                <option value="gradient">Gradient</option>
                <option value="pattern">Dotted pattern</option>
                <option value="image">Cover image (when set)</option>
              </Select>
              <Select id={`${uid}-width`} label="Form width" value={branding.formWidth ?? 'standard'} onChange={(e) => onUpdate({ formWidth: e.target.value as FormWidth })}>
                <option value="narrow">Narrow</option>
                <option value="standard">Standard</option>
                <option value="wide">Wide</option>
              </Select>
              <Select id={`${uid}-grouping`} label="Field layout" value={branding.fieldGrouping ?? 'auto'} onChange={(e) => onUpdate({ fieldGrouping: e.target.value as FieldGrouping })}>
                <option value="auto">Pair short fields side by side</option>
                <option value="single">One field per row</option>
              </Select>
            </div>
          </PanelCard>

          <PanelCard label="Page background" description="The page behind the form card, not the card itself. Pick a style and the colour it is built from.">
            <Select
              id={`${uid}-page-bg`}
              label="Background style"
              value={branding.backgroundStyle ?? 'wash'}
              onChange={(e) => onUpdate({ backgroundStyle: e.target.value as PageBackground })}
            >
              {PAGE_BACKGROUND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
            {branding.backgroundStyle === 'image' && (
              <ImageUploadZone
                label="Page background image"
                imageUrl={branding.backgroundImageUrl}
                aspect="banner"
                freeform
                onUpload={(file) => uploadImage(file, 'backgroundImageUrl')}
                onRemove={() => onUpdate({ backgroundImageUrl: undefined, formWidth: undefined, coverFit: undefined })}
              />
            )}
            {(branding.backgroundStyle ?? 'wash') !== 'plain' && branding.backgroundStyle !== 'image' && (
              <div className="flex flex-col gap-2">
                <span className="bg-body-sm font-medium text-(--text-secondary)">Background colour</span>
                <div className="flex flex-wrap items-center gap-1">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => onUpdate({ backgroundColor: color })}
                      className="flex h-11 w-11 items-center justify-center rounded-full"
                      aria-label={`Use ${color} as the page colour`}
                    >
                      <span
                        aria-hidden="true"
                        className={`h-7 w-7 rounded-full border-2 ${(branding.backgroundColor ?? primaryColor) === color ? 'border-(--border-strong)' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    </button>
                  ))}
                  <label className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full" aria-label="Custom page colour">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-(--border-strong)">
                      <Plus size={12} className="text-(--text-disabled)" />
                    </span>
                    <input
                      type="color"
                      value={branding.backgroundColor ?? primaryColor}
                      onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                  {branding.backgroundColor && (
                    <button type="button" onClick={() => onUpdate({ backgroundColor: undefined })} className="ml-1 min-h-11 bg-body-sm text-(--text-muted) underline underline-offset-2 hover:text-(--text-secondary)">
                      Match brand colour
                    </button>
                  )}
                </div>
              </div>
            )}
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

          <PanelCard label="Cover image" description="Shown at the top of the form. Use any size: keep the whole picture, or crop it to a banner.">
            <Select id={`${uid}-cover-fit`} label="Cover size" value={coverFit} onChange={(e) => onUpdate({ coverFit: e.target.value as CoverFit })}>
              <option value="original">Original size (whole picture, any shape)</option>
              <option value="banner">Wide banner (cropped to a 1600×500 strip)</option>
            </Select>
            <ImageUploadZone
              label="Cover image"
              imageUrl={branding.coverImageUrl}
              aspect="banner"
              freeform={coverFit === 'original'}
              onUpload={(file) => uploadImage(file, 'coverImageUrl')}
              onRemove={() => onUpdate({ coverImageUrl: undefined })}
            />
          </PanelCard>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-3 @3xl:sticky @3xl:top-4 @3xl:flex-1">
          <span className="bg-overline text-(--text-muted)">Preview</span>
          {preview ?? (formId ? <LiveFormPreview formId={formId} branding={branding} layout={layout} /> : <p className="bg-body-sm text-(--text-muted)">Save the form to see a live preview.</p>)}
          <button
            type="button"
            onClick={() =>
              onUpdate({ buttonStyle: undefined, buttonRadius: undefined, coverPosition: undefined, showProgress: undefined, spacing: undefined, fontFamily: undefined, typeScale: undefined, cardStyle: undefined, panelTreatment: undefined, fieldGrouping: undefined, backgroundStyle: undefined, backgroundColor: undefined, backgroundImageUrl: undefined })
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
