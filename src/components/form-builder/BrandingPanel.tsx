'use client';

import { useId, useRef, useState } from 'react';
import { Loader2, Plus, Upload, X } from 'lucide-react';
import type { FormBranding } from '@/types/form';
import { uploadService } from '@/services/upload';
import { useToast } from '@/components/common/Toast';
import { BrandingLivePreview } from './BrandingLivePreview';
import { PanelCard } from './PanelCard';

const PRESET_COLORS = ['#1D4ED8', '#0F172A', '#16A34A', '#DC2626', '#9333EA'];
const DEFAULT_COLOR = '#1D4ED8';
const HEX_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ─── Image upload zone (shared by Logo + Cover Image sections) ────────────────

function ImageUploadZone({
  label,
  imageUrl,
  aspect,
  onUpload,
  onRemove,
}: {
  label: string;
  imageUrl?: string;
  aspect: 'square' | 'banner';
  onUpload: (file: File) => Promise<void>;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast('File type not supported. Use JPG, PNG, GIF, or WEBP.', 'error');
      return;
    }
    setIsUploading(true);
    try {
      await onUpload(file);
    } finally {
      setIsUploading(false);
    }
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
        aspect === 'square' ? 'w-24 h-24' : 'w-full aspect-video'
      } ${
        isDragging
          ? 'border-brand-500 bg-brand-50'
          : hasImage
          ? 'border-neutral-200 bg-white'
          : 'border-neutral-400 bg-neutral-50 hover:border-neutral-600'
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
        <Loader2 size={20} className="animate-spin text-neutral-400" />
      ) : imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary backend-served upload URL, not a static asset
        <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
      ) : (
        <>
          <Upload size={aspect === 'square' ? 16 : 20} className="text-neutral-400" />
          <span className="text-caption font-semibold text-neutral-500 text-center px-2">
            {aspect === 'square' ? 'Upload' : 'Click or drag to upload'}
          </span>
        </>
      )}
      {hasImage && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-1 right-1 w-11 h-11 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-rose-600 shadow-card"
          aria-label={`Remove ${label.toLowerCase()}`}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

export interface BrandingPanelProps {
  branding: FormBranding;
  formTitle: string;
  onUpdate: (updates: Partial<FormBranding>) => void;
}

export function BrandingPanel({ branding, formTitle, onUpdate }: BrandingPanelProps) {
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
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="text-heading-1 font-bold text-neutral-900">Branding</h2>
        <p className="text-body text-neutral-500 mt-1">
          Set your brand colour, logo, and cover image. This shapes how your workspace looks everywhere.
        </p>
      </div>

      <div className="flex gap-6 items-start">
        <div className="flex-1 flex flex-col gap-4 min-w-0">
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
                      primaryColor === color ? 'border-neutral-800' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                </button>
              ))}
              <div className="w-px h-5 bg-neutral-200" />
              <label
                className="relative w-11 h-11 rounded-full flex items-center justify-center cursor-pointer"
                aria-label="Custom colour picker"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-neutral-300 transition-colors hover:border-neutral-500">
                  <Plus size={12} className="text-neutral-400" />
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
                className="w-9 h-9 rounded-md border border-neutral-200 shrink-0"
                style={{ backgroundColor: primaryColor }}
              />
              <input
                id={`${uid}-hex`}
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value)}
                onBlur={commitHexInput}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="flex-1 rounded-md border-2 border-neutral-200 px-2.5 min-h-11 text-[13px] font-mono bg-white outline-none focus:border-neutral-500"
              />
            </div>
            {hexError && <p className="text-caption text-error font-semibold">{hexError}</p>}
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

        <div className="w-[280px] shrink-0 flex flex-col gap-2">
          <span className="text-label text-neutral-500">Preview</span>
          <BrandingLivePreview
            primaryColor={primaryColor}
            logoUrl={branding.logoUrl}
            coverImageUrl={branding.coverImageUrl}
            formTitle={formTitle}
          />
        </div>
      </div>
    </div>
  );
}
