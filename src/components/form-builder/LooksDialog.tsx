'use client';

import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { brandButtonStyle, brandCardClass, brandLookProps, brandTypeStyle, brandWashStyle, effectiveTheme } from '@/lib/formTheme';
import { GALLERY_STYLES, snapshotStyle, type FormStyle } from '@/lib/formStyles';
import { formStylesService } from '@/services/formStyles';
import { bx } from '@/lib/utils';
import type { FormBranding, LayoutPreset } from '@/types/form';

// "Looks": a gallery of ready-made looks, and the person's own saved styles ("Save my style"). A look is a layout plus the branding that is about looks.
// Choosing one hands it to the studio (onApply), which applies it with an Undo.

type Look = { layout: LayoutPreset; branding: FormStyle['branding'] };

const TABS = [
  { id: 'ready', label: 'Ready-made' },
  { id: 'mine', label: 'My styles' },
];
const LAYOUT_NAME: Record<string, string> = { classic: 'Classic', card_stack: 'Card Stack', guided: 'Guided', steps: 'Steps', split_feature: 'Split Feature', compact: 'Compact' };

/** A small form drawn with the look itself (its own colours, typeface, card, fields, background), so the choice is seen, not described. */
export function LookPreview({ look }: { look: Look }) {
  const b = look.branding as FormBranding;
  const theme = effectiveTheme(look.layout, b.theme);
  const { className, style, ...attrs } = brandLookProps({ theme });
  return (
    <div aria-hidden="true" className="bg-form-type relative flex h-32 items-center justify-center overflow-hidden rounded-lg border border-(--border-default)" style={{ ...brandTypeStyle(b), ...brandWashStyle(b), backgroundAttachment: 'scroll' }}>
      <div {...attrs} className={bx(className, 'flex w-full justify-center px-4')} style={style}>
        <div className={bx(brandCardClass(b), 'flex w-full max-w-44 flex-col gap-1.5 p-2.5')}>
          <p className="form-heading text-sm font-bold leading-tight text-(--form-heading)">Your form</p>
          <span className="form-field-input block h-4 w-full rounded-(--form-field-radius) border border-(--form-field-border) bg-(--form-field-bg)" />
          <span className="form-field-input block h-4 w-3/4 rounded-(--form-field-radius) border border-(--form-field-border) bg-(--form-field-bg)" />
          <span className="block h-4 w-full" style={brandButtonStyle(b)} />
        </div>
      </div>
    </div>
  );
}

function LookCard({ name, note, look, actions, onUse }: { name: string; note?: string; look: Look; actions?: React.ReactNode; onUse?: () => void }) {
  return (
    <li className="group flex flex-col gap-2 rounded-xl border border-(--border-default) bg-(--surface-card) p-2">
      <div className="relative">
        <LookPreview look={look} />
        {onUse && (
          // shown on hover or keyboard focus; always shown on a screen with no hover (touch)
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/35 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
            <Button type="button" size="small" aria-label={`Use the ${name} look`} onClick={onUse}>
              Use
            </Button>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-1">
        <span className="bg-body-sm font-semibold text-(--text-primary)">{name}</span>
        <span className="bg-caption text-(--text-muted)">{note ?? LAYOUT_NAME[look.layout] ?? look.layout}</span>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 px-1 pb-1">{actions}</div>}
      {!actions && <div className="pb-1" />}
    </li>
  );
}

const reason = (err: unknown, fallback: string) => (isAxiosError(err) ? ((err.response?.data as { message?: string } | undefined)?.message ?? fallback) : fallback);

function MyStyles({ scope, layout, branding, onApply }: { scope: string; layout: LayoutPreset; branding: FormBranding; onApply: (look: Look) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const key = ['form-styles', scope];
  const styles = useQuery({ queryKey: key, queryFn: () => formStylesService.list(scope), staleTime: 60_000 });
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  const save = useMutation({
    mutationFn: () => formStylesService.save(scope, { name: name.trim(), ...snapshotStyle(layout, branding) }),
    onSuccess: () => {
      setName('');
      toast('Style saved.', 'success');
      return refresh();
    },
    onError: (err) => toast(reason(err, 'Could not save the style. Try again.'), 'error'),
  });
  const rename = useMutation({
    mutationFn: (v: { id: string; name: string }) => formStylesService.rename(scope, v.id, v.name.trim()),
    onSuccess: () => {
      setEditing(null);
      return refresh();
    },
    onError: (err) => toast(reason(err, 'Could not rename the style.'), 'error'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => formStylesService.remove(scope, id),
    onSuccess: () => {
      setRemoving(null);
      toast('Style removed.', 'success');
      return refresh();
    },
    onError: (err) => toast(reason(err, 'Could not remove the style.'), 'error'),
  });

  const list = styles.data ?? [];
  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-2 rounded-xl border border-(--border-default) bg-(--bg-subtle) p-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) save.mutate();
        }}
      >
        <div className="min-w-0 flex-1">
          <Input id="style-name" label="Save this form's look as a style" value={name} maxLength={60} placeholder="For example: Our brand" onChange={(e) => setName(e.target.value)} />
        </div>
        <Button type="submit" size="small" disabled={!name.trim() || save.isPending}>
          {save.isPending ? 'Saving' : 'Save style'}
        </Button>
      </form>
      <p className="bg-caption text-(--text-muted)">A style keeps the layout, colours, fonts, card and fields. It never keeps your logo, cover picture, title or text.</p>

      {styles.isLoading ? (
        <p role="status" className="bg-body-sm text-(--text-muted)">Loading your styles</p>
      ) : styles.isError ? (
        <p role="alert" className="bg-body-sm text-(--error-text)">
          {isAxiosError(styles.error) && styles.error.response?.status === 404
            ? 'Saved styles are not switched on for this server yet. The ready-made looks still work.'
            : 'Could not load your styles.'}{' '}
          <button type="button" onClick={() => styles.refetch()} className="underline underline-offset-2">
            Try again
          </button>
        </p>
      ) : list.length === 0 ? (
        <p className="bg-body-sm text-(--text-secondary)">No saved styles yet. Save the look of this form above and use it on your other forms.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {list.map((s) => (
            <LookCard
              key={s.id}
              name={s.name}
              look={s}
              actions={
                editing?.id === s.id ? (
                  <form
                    className="flex w-full items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (editing.name.trim()) rename.mutate({ id: s.id, name: editing.name });
                    }}
                  >
                    <Input id={`rename-${s.id}`} aria-label={`New name for ${s.name}`} value={editing.name} maxLength={60} onChange={(e) => setEditing({ id: s.id, name: e.target.value })} />
                    <Button type="submit" size="small" disabled={!editing.name.trim() || rename.isPending}>
                      Save
                    </Button>
                    <Button type="button" size="small" variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </form>
                ) : removing === s.id ? (
                  <>
                    <span className="bg-caption text-(--text-secondary)">Remove this style?</span>
                    <Button type="button" size="small" variant="secondary" onClick={() => remove.mutate(s.id)} disabled={remove.isPending}>
                      Yes, remove
                    </Button>
                    <Button type="button" size="small" variant="ghost" onClick={() => setRemoving(null)}>
                      No
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" size="small" aria-label={`Use the ${s.name} style`} onClick={() => onApply(s)}>
                      Use
                    </Button>
                    <Button type="button" size="small" variant="ghost" aria-label={`Rename ${s.name}`} onClick={() => setEditing({ id: s.id, name: s.name })}>
                      Rename
                    </Button>
                    <Button type="button" size="small" variant="ghost" aria-label={`Remove ${s.name}`} onClick={() => setRemoving(s.id)}>
                      Remove
                    </Button>
                  </>
                )
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export interface LooksDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** The form's layout and branding now, for "Save style". */
  layout: LayoutPreset;
  branding: FormBranding;
  /** A workspace slug or 'personal'. Without it the "My styles" tab is not offered. */
  scope?: string;
  onApply: (look: Look, name: string) => void;
}

export function LooksDialog({ isOpen, onClose, layout, branding, scope, onApply }: LooksDialogProps) {
  const [tab, setTab] = useState('ready');
  const tabs = scope ? TABS : TABS.slice(0, 1);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Looks" description="Give the form a whole new look in one click. Your fields and answers stay as they are, and you can undo it." size="xl">
      <div className="flex flex-col gap-4">
        {scope && <Tabs tabs={tabs} activeId={tab} onChange={setTab} ariaLabel="Kinds of look" panelId="looks-panel" />}
        <div role="tabpanel" id="looks-panel" aria-labelledby={`tab-${tab}`} className="max-h-[62vh] overflow-y-auto p-1">
          {tab === 'ready' || !scope ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {GALLERY_STYLES.map((g) => (
                <LookCard
                  key={g.id}
                  name={g.name}
                  note={g.note}
                  look={g}
                  onUse={() => onApply(g, g.name)}
                />
              ))}
            </ul>
          ) : (
            <MyStyles scope={scope} layout={layout} branding={branding} onApply={(look) => onApply(look, 'Your style')} />
          )}
        </div>
      </div>
    </Modal>
  );
}
