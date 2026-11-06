'use client';

import { useId, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { HEADLINE_MAX, REDIRECT_SECONDS, cleanRedirectUrl } from '@/lib/formTheme';
import type { FormBranding } from '@/types/form';
import { ImageUploadZone } from './BrandingPanel';
import { ColourRow, GroupTitle, WordsInput, type SetTheme } from './LookControls';
import { PictureChoice } from './PicturePicker';

const SECONDS = [3, 5, 10, 20, 30];

/**
 * The thank-you screen: the owner's own headline, an accent colour, a picture, confetti, and an optional move on to another page. The message itself
 * is written in Settings. A switch shows the screen in the preview, since nobody sees it until they have sent the form.
 */
export function ThankYouControls({
  branding,
  setTheme,
  showPreview,
  onShowPreview,
  onUpload,
}: {
  branding: FormBranding;
  setTheme: SetTheme;
  showPreview: boolean;
  onShowPreview: (on: boolean) => void;
  /** Uploads a picture and gives back its address (or nothing, after telling the person why). */
  onUpload: (file: File) => Promise<string | undefined>;
}) {
  const uid = useId();
  const s = branding.theme?.success;
  const [urlError, setUrlError] = useState<string | null>(null);

  // The address is saved only once it is a whole, valid one (when the box loses focus), so a half-typed address never reaches the form.
  const commitUrl = (text: string) => {
    const v = text.trim();
    if (!v) {
      setUrlError(null);
      setTheme('success', { redirect: undefined });
      return;
    }
    const url = cleanRedirectUrl(v);
    if (!url) {
      setUrlError('Use a full address that starts with https://');
      return;
    }
    setUrlError(null);
    setTheme('success', { redirect: { url, ...(s?.redirect?.seconds !== undefined ? { seconds: s.redirect.seconds } : {}) } });
  };

  return (
    <div className="flex flex-col gap-5 border-t border-(--border-subtle) pt-5">
      <GroupTitle hint="What people see after they send the form. The message is set in Settings.">Thank-you screen</GroupTitle>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`${uid}-preview`} className="bg-body-sm font-medium text-(--text-secondary)">
          Show it in the preview
        </label>
        <Switch id={`${uid}-preview`} checked={showPreview} onChange={onShowPreview} />
      </div>

      <WordsInput id={`${uid}-headline`} label="Headline" placeholder="Thank you!" max={HEADLINE_MAX} value={s?.headline} onChange={(headline) => setTheme('success', { headline })} />

      <ColourRow
        label="Accent"
        value={s?.colour}
        fallback={branding.primaryColor ?? '#1D4ED8'}
        onPick={(colour) => setTheme('success', { colour })}
        onReset={() => setTheme('success', { colour: undefined })}
      />

      <div className="flex flex-col gap-3">
        <PictureChoice label="Picture" value={s?.picture} photos={false} onPick={(picture) => setTheme('success', { picture })} />
        <ImageUploadZone
          label="Or your own picture"
          imageUrl={s?.picture}
          aspect="banner"
          freeform
          onUpload={async (file) => {
            const picture = await onUpload(file);
            if (picture) setTheme('success', { picture });
          }}
          onRemove={() => setTheme('success', { picture: undefined })}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`${uid}-confetti`} className="flex flex-col">
          <span className="bg-body-sm font-medium text-(--text-secondary)">Confetti</span>
          <span className="bg-caption text-(--text-muted)">Not shown to people who ask their device for less motion.</span>
        </label>
        <Switch id={`${uid}-confetti`} checked={s?.confetti === true} onChange={(on) => setTheme('success', { confetti: on ? true : undefined })} />
      </div>

      <div className="flex flex-col gap-3">
        <GroupTitle hint="Send people to another page after they have sent the form. They are told where they are going, and can stay.">Move on to another page</GroupTitle>
        <Input
          // remounts only when the saved address changes by itself (an undo), never while it is being typed: it is saved when the box loses focus
          key={s?.redirect?.url ?? 'none'}
          id={`${uid}-redirect`}
          label="Address"
          type="url"
          inputMode="url"
          placeholder="https://example.com/welcome"
          maxLength={500}
          defaultValue={s?.redirect?.url ?? ''}
          error={urlError ?? undefined}
          onChange={() => urlError && setUrlError(null)}
          onBlur={(e) => commitUrl(e.currentTarget.value)}
        />
        <Select
          id={`${uid}-seconds`}
          label="Wait before moving on"
          disabled={!s?.redirect}
          value={String(s?.redirect?.seconds ?? REDIRECT_SECONDS.default)}
          onChange={(e) => s?.redirect && setTheme('success', { redirect: { url: s.redirect.url, seconds: Number(e.target.value) } })}
        >
          {SECONDS.map((n) => (
            <option key={n} value={n}>
              {n} seconds
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
