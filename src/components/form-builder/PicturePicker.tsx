'use client';

import { useEffect, useState } from 'react';
import { Check, Images, Search } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { FORM_PICTURES, PICTURE_GROUPS, builtInPicture, pictureThumbUrl, pictureUrl, type PictureGroup } from '@/lib/formPictures';
import { bx } from '@/lib/utils';
import { PhotosError, unsplashService, type UnsplashPhoto } from '@/services/unsplash';
import type { PhotoCredit } from '@/types/form';

// Choosing a picture for a page background or a cover from the app's own library (lib/formPictures). Uploading your own picture stays next to it
// (the upload box under this control), so a person can do either in the same place.

const PREVIEW_COUNT = 5;
const SUGGESTIONS = ['Nature', 'Abstract', 'Texture', 'Office', 'Minimal', 'Sky'];
const FAILED = new PhotosError('other', 'Could not load photos. Try again.');
const asError = (e: unknown) => (e instanceof PhotosError ? e : FAILED);
const BTN = 'min-h-10 rounded-lg border-2 border-(--border-strong) px-4 bg-body-sm font-medium text-(--text-primary) hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--border-focus)';

/** Photos from Unsplash: a ready row of seven, a search, and "Load more". Picking one credits the photographer on the form. */
function PhotosPanel({ value, onPick }: { value?: string; onPick: (photo: UnsplashPhoto) => void }) {
  const [featured, setFeatured] = useState<UnsplashPhoto[]>([]);
  const [found, setFound] = useState<{ q: string; photos: UnsplashPhoto[]; page: number; totalPages: number } | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PhotosError | null>(null);

  useEffect(() => {
    let live = true;
    unsplashService.featured().then(
      (p) => {
        if (live) {
          setFeatured(p);
          setLoading(false);
        }
      },
      (e) => {
        if (live) {
          setError(asError(e));
          setLoading(false);
        }
      },
    );
    return () => {
      live = false;
    };
  }, []);

  const run = async (q: string, page: number) => {
    setLoading(true);
    setError(null);
    try {
      const r = await unsplashService.search(q, page);
      setFound((prev) => ({ q, photos: page > 1 && prev?.q === q ? [...prev.photos, ...r.photos] : r.photos, page: r.page, totalPages: r.totalPages }));
    } catch (e) {
      setError(asError(e));
    }
    setLoading(false);
  };
  const submit = (q: string) => {
    const t = q.trim();
    if (t) void run(t, 1);
    else setFound(null);
  };

  const list = found ? found.photos : featured;
  return (
    <div className="flex flex-col gap-3">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
        className="flex gap-2"
      >
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={80}
          aria-label="Search photos"
          placeholder="Search photos, for example green leaves"
          className="min-h-10 w-full rounded-lg border-2 border-(--border-default) bg-(--surface-card) px-3 text-(--text-primary) focus-visible:outline-2 focus-visible:outline-(--border-focus)"
        />
        <button type="submit" className={bx(BTN, 'flex items-center gap-1 px-3')}>
          <Search size={16} aria-hidden="true" />
          Search
        </button>
      </form>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Ideas">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setText(s);
              submit(s);
            }}
            className="min-h-9 rounded-full border-2 border-(--border-default) px-3 bg-body-sm font-medium text-(--text-secondary) hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--border-focus)"
          >
            {s}
          </button>
        ))}
      </div>
      <p className="bg-caption text-(--text-muted)">{found ? `Results for "${found.q}"` : 'Hand-picked for forms'}. Free to use; the photographer is credited on your form.</p>
      {error && (
        <p role="alert" className="rounded-lg border border-(--border-default) bg-(--bg-subtle) p-3 bg-body-sm text-(--text-secondary)">
          {error.kind === 'busy' ? 'Photo search is busy. Try again in a few minutes.' : error.kind === 'off' ? 'Photos are not available right now. The built-in pictures and your own upload still work.' : error.message}
        </p>
      )}
      {!error && !loading && list.length === 0 && <p className="bg-body-sm text-(--text-muted)">No photos found. Try other words.</p>}
      <ul className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3">
        {list.map((p) => {
          const chosen = value === p.url;
          return (
            <li key={p.id} className="flex flex-col gap-1">
              <button
                type="button"
                aria-pressed={chosen}
                aria-label={p.alt || `Photo by ${p.credit.name}`}
                onClick={() => onPick(p)}
                className={bx(
                  'relative aspect-video w-full overflow-hidden rounded-lg border-2 bg-(--bg-subtle) focus-visible:outline-2 focus-visible:outline-(--border-focus)',
                  chosen ? 'border-(--action-primary)' : 'border-(--border-default) hover:border-(--border-strong)',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- an Unsplash preview, linked from Unsplash as its rules ask */}
                <img src={p.thumb} alt="" loading="lazy" className="size-full object-cover" />
                {chosen && (
                  <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-(--text-primary) text-(--surface-card)">
                    <Check size={12} aria-hidden="true" />
                  </span>
                )}
              </button>
              <span className="truncate bg-caption text-(--text-muted)">Photo by {p.credit.name}</span>
            </li>
          );
        })}
      </ul>
      {loading && (
        <p role="status" className="bg-body-sm text-(--text-muted)">
          Loading photos…
        </p>
      )}
      {found && !loading && found.page < found.totalPages && (
        <button type="button" onClick={() => void run(found.q, found.page + 1)} className={bx(BTN, 'self-start')}>
          Load more
        </button>
      )}
    </div>
  );
}

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
export function PictureChoice({ label, value, onPick }: { label: string; value?: string; onPick: (url: string, credit?: PhotoCredit) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'library' | 'photos'>('library');
  const [group, setGroup] = useState<PictureGroup | 'all'>('all');
  const current = builtInPicture(value);
  // the first few of the library, and the chosen one in front when it is further down
  const preview = (current ? [current, ...FORM_PICTURES.filter((p) => p.id !== current.id)] : [...FORM_PICTURES]).slice(0, PREVIEW_COUNT);
  const shown = group === 'all' ? FORM_PICTURES : FORM_PICTURES.filter((p) => p.group === group);

  const pick = (id: string) => {
    onPick(pictureUrl(id));
    setOpen(false);
  };

  const pickPhoto = (photo: UnsplashPhoto) => {
    onPick(photo.url, photo.credit);
    void unsplashService.download(photo.id);
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
          <div role="tablist" aria-label="Where from" className="flex gap-2">
            {([['library', 'Our pictures'], ['photos', 'Photos from Unsplash']] as const).map(([id, text]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={bx(
                  'min-h-10 rounded-lg border-2 px-4 bg-body-sm font-medium focus-visible:outline-2 focus-visible:outline-(--border-focus)',
                  tab === id ? 'border-(--action-primary) bg-(--accent-soft) text-(--text-primary)' : 'border-(--border-default) text-(--text-secondary) hover:bg-(--surface-hover)',
                )}
              >
                {text}
              </button>
            ))}
          </div>
          {tab === 'photos' && <PhotosPanel value={value} onPick={pickPhoto} />}
          {tab === 'library' && (
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
          )}
          {tab === 'library' && (
            <ul className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3">
              {shown.map((p) => (
                <li key={p.id} className="flex flex-col gap-1">
                  <Thumb id={p.id} name={p.name} chosen={current?.id === p.id} onPick={() => pick(p.id)} />
                  <span className="bg-caption text-(--text-muted)">{p.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  );
}
