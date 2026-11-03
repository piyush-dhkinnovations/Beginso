'use client';

import { useState } from 'react';
import { Check, Images } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { FORM_PICTURES, PICTURE_GROUPS, builtInPicture, pictureThumbUrl, pictureUrl, type PictureGroup } from '@/lib/formPictures';
import { bx } from '@/lib/utils';

// Choosing a picture for a page background or a cover from the app's own library (lib/formPictures). Uploading your own picture stays next to it
// (the upload box under this control), so a person can do either in the same place.

const PREVIEW_COUNT = 5;

function Thumb({ id, name, chosen, onPick }: { id: string; name: string; chosen: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={chosen}
      aria-label={name}
      title={name}
      onClick={onPick}
      className={bx(
        'relative overflow-hidden rounded-lg border-2 bg-(--bg-subtle) focus-visible:outline-2 focus-visible:outline-(--border-focus)',
        'aspect-video w-full',
        chosen ? 'border-(--action-primary)' : 'border-(--border-default) hover:border-(--border-strong)',
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a small static preview from public/, nothing to optimise */}
      <img src={pictureThumbUrl(id)} alt="" loading="lazy" className="size-full object-cover" />
      {chosen && (
        <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-(--text-primary) text-(--surface-card)">
          <Check size={12} aria-hidden="true" />
        </span>
      )}
    </button>
  );
}

/** A row of a few pictures to pick at once, and "All pictures" for the whole library. */
export function PictureChoice({ label, value, onPick }: { label: string; value?: string; onPick: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<PictureGroup | 'all'>('all');
  const current = builtInPicture(value);
  // the first few of the library, and the chosen one in front when it is further down
  const preview = (current ? [current, ...FORM_PICTURES.filter((p) => p.id !== current.id)] : [...FORM_PICTURES]).slice(0, PREVIEW_COUNT);
  const shown = group === 'all' ? FORM_PICTURES : FORM_PICTURES.filter((p) => p.group === group);

  const pick = (id: string) => {
    onPick(pictureUrl(id));
    setOpen(false);
  };

  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <span className="bg-label">{label}</span>
      <div className="grid grid-cols-3 gap-2">
        {preview.slice(0, 5).map((p) => (
          <Thumb key={p.id} id={p.id} name={p.name} chosen={current?.id === p.id} onPick={() => pick(p.id)} />
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-(--border-strong) bg-(--surface-card) bg-caption font-medium text-(--text-secondary) hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--border-focus)"
        >
          <Images size={16} aria-hidden="true" />
          All pictures
        </button>
      </div>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Choose a picture" description="Free to use. To use your own picture, close this and upload it below." size="xl">
        <div className="flex flex-col gap-4">
          <div role="group" aria-label="Kind of picture" className="flex flex-wrap gap-2">
            {[{ id: 'all' as const, label: 'All' }, ...PICTURE_GROUPS].map((g) => (
              <button
                key={g.id}
                type="button"
                aria-pressed={group === g.id}
                onClick={() => setGroup(g.id)}
                className={bx(
                  'min-h-9 rounded-full border-2 px-3 bg-body-sm font-medium focus-visible:outline-2 focus-visible:outline-(--border-focus)',
                  group === g.id ? 'border-(--action-primary) bg-(--accent-soft) text-(--text-primary)' : 'border-(--border-default) text-(--text-secondary) hover:bg-(--surface-hover)',
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
          <ul className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3">
            {shown.map((p) => (
              <li key={p.id} className="flex flex-col gap-1">
                <Thumb id={p.id} name={p.name} chosen={current?.id === p.id} onPick={() => pick(p.id)} />
                <span className="bg-caption text-(--text-muted)">{p.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </div>
  );
}
