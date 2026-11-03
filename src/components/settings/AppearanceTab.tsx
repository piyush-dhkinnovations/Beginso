'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { settingsService } from '@/services/settings';
import { settingsKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/ui/Toast';
import { SegmentedRadio } from '@/components/ui/SegmentedRadio';
import { bx } from '@/lib/utils';
import {
  applyTextSize,
  applyTheme,
  readDarkVariant,
  readLightVariant,
  readTextSize,
  readThemePreference,
  storeLightVariant,
  storeTextSize,
  storeTheme,
  type DarkVariant,
  type LightVariant,
  type TextSize,
  type ThemePreference,
} from '@/lib/theme';

// Fixed colours on purpose: each swatch shows the style it stands for, whatever style the page is in now. They are the same values as that
// style's tokens in beginso-ui.css (page, card, border, brand blue).
const PAGE = { classic: '#F6F7FB', paper: '#F5F0E6', mist: '#ECF0F6', slate: '#10151E', midnight: '#0F1729', dimmed: '#1D222B' } as const;
const CARD = { classic: '#FFFFFF', paper: '#FCFAF5', mist: '#F9FAFD', slate: '#1A202E', midnight: '#18233A', dimmed: '#282E39' } as const;
const LINE = { classic: '#D5DBE6', paper: '#D9D0BC', mist: '#CDD6E4', slate: '#38425A', midnight: '#3E4E70', dimmed: '#4A5364' } as const;
const ACCENT = { classic: '#1D4ED8', paper: '#1D4ED8', mist: '#1D4ED8', slate: '#6A92E8', midnight: '#6A92E8', dimmed: '#6A92E8' } as const;

type Look = keyof typeof PAGE;

/** A page in miniature in that style's own colours: the page, a card on it, two lines of text and a button. */
function Swatch({ look }: { look: Look }) {
  return (
    <span aria-hidden="true" className="flex h-full w-full flex-col gap-1.5 p-2" style={{ backgroundColor: PAGE[look] }}>
      <span className="h-1.5 w-1/2 rounded-full" style={{ backgroundColor: LINE[look] }} />
      <span className="flex flex-1 flex-col justify-center gap-1 rounded-md border px-2" style={{ backgroundColor: CARD[look], borderColor: LINE[look] }}>
        <span className="h-1 w-3/4 rounded-full" style={{ backgroundColor: LINE[look] }} />
        <span className="h-1 w-1/2 rounded-full" style={{ backgroundColor: LINE[look] }} />
        <span className="mt-0.5 h-1.5 w-1/3 rounded-full" style={{ backgroundColor: ACCENT[look] }} />
      </span>
    </span>
  );
}

const THEMES: { id: ThemePreference; label: string; icon: React.ReactNode }[] = [
  { id: 'system', label: 'System', icon: <Monitor size={16} aria-hidden="true" /> },
  { id: 'light', label: 'Light', icon: <Sun size={16} aria-hidden="true" /> },
  { id: 'dark', label: 'Dark', icon: <Moon size={16} aria-hidden="true" /> },
];

const LIGHT_STYLES: { id: LightVariant; label: string; hint: string }[] = [
  { id: 'classic', label: 'Classic', hint: 'The default.' },
  { id: 'paper', label: 'Paper', hint: 'Warm, like paper.' },
  { id: 'mist', label: 'Mist', hint: 'Cool blue-gray.' },
];

const DARK_STYLES: { id: DarkVariant; label: string; hint: string }[] = [
  { id: 'slate', label: 'Slate', hint: 'The default.' },
  { id: 'midnight', label: 'Midnight', hint: 'Deeper, bluer.' },
  { id: 'dimmed', label: 'Dimmed', hint: 'Softer, lighter.' },
];

const TEXT_SIZES: { id: TextSize; label: string; hint: string }[] = [
  { id: 'default', label: 'Default', hint: 'The usual size.' },
  { id: 'large', label: 'Large', hint: 'A little bigger.' },
  { id: 'xlarge', label: 'Extra large', hint: 'Bigger still.' },
];

const nameOf = <T extends string>(list: { id: T; label: string }[], id: T) => list.find((o) => o.id === id)?.label ?? id;

/** A row of three colour swatches that is one radio group: arrow keys move and choose, Tab lands on the chosen one. */
function StyleGroup<T extends string>({ labelledBy, options, value, onChange, look, thumb, thumbClass = 'h-16' }: {
  labelledBy: string;
  options: { id: T; label: string; hint: string }[];
  value: T;
  onChange: (next: T) => void;
  look?: (id: T) => Look;
  /** What to draw instead of the colour swatch, with no inner box (the text size boxes draw a letter A at their own size). */
  thumb?: (id: T) => React.ReactNode;
  thumbClass?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].id);
    refs.current[next]?.focus();
  }
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className={bx(thumb ? 'flex flex-wrap gap-x-6 gap-y-4' : 'grid grid-cols-3 gap-3')}>
      {options.map((o, i) => {
        const checked = value === o.id;
        return (
          <button
            key={o.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(o.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={bx(
              'flex flex-col gap-2 rounded-xl p-2 text-left outline-none transition-colors focus-visible:shadow-(--shadow-focus)',
              // the text size options are bare: the circle itself shows which is chosen, with no card around it
              thumb ? 'w-36 items-center text-center' : checked ? 'border border-(--action-primary) bg-(--surface-card) ring-1 ring-(--action-primary)' : 'border border-(--border-default) bg-(--surface-card) hover:border-(--border-strong)',
            )}
          >
            {thumb ? <span className={bx('block', thumbClass)}>{thumb(o.id)}</span> : <span className={bx('block overflow-hidden rounded-lg border border-(--border-subtle)', thumbClass)}><Swatch look={look!(o.id)} /></span>}
            <span className={bx('flex flex-col px-0.5 pb-0.5', thumb && 'items-center')}>
              <span className={bx('flex items-center gap-2', thumb ? 'justify-center' : 'justify-between', 'bg-body-sm font-semibold text-(--text-primary)')}>
                {o.label}
                {checked && <Check size={14} className="text-(--action-primary)" aria-hidden="true" />}
              </span>
              <span className="bg-caption text-(--text-muted) max-sm:sr-only">{o.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** A round badge with the letter A in it, at three clearly different sizes, so the choice reads at a glance: small, bigger, biggest. The chosen one has a ring. */
const BADGE_PX: Record<TextSize, number> = { default: 36, large: 52, xlarge: 72 };
function TextThumb({ size, checked }: { size: TextSize; checked: boolean }) {
  const px = BADGE_PX[size];
  return (
    <span aria-hidden="true" className="flex h-full items-center justify-center">
      <span
        className={bx('flex items-center justify-center rounded-full bg-(--action-primary) font-semibold leading-none text-(--text-on-brand) transition-shadow', checked && 'outline-2 outline-offset-4 outline-(--action-primary)')}
        style={{ width: px, height: px, fontSize: `${px * 0.45}px` }}
      >
        A
      </span>
    </span>
  );
}

function Section({ id, title, icon, children, description }: { id: string; title: string; icon?: React.ReactNode; description: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby={id}>
      <div>
        <h3 id={id} className="flex items-center gap-2 bg-h5 font-bold text-(--text-primary)">
          {icon}
          {title}
        </h3>
        <p className="bg-body-sm text-(--text-muted)">{description}</p>
      </div>
      {children}
    </section>
  );
}

// Account → Appearance, in three parts that look different on purpose: the THEME (a switch: follow the device, always light, always dark; saved on the
// account so it follows the person), the COLOURS (swatches: the light style and the dark style, saved on this device) and the TEXT SIZE (a switch and a
// live preview, saved on this device). Which colours show follows the theme: Light shows the light styles, Dark the dark styles, System both. A hidden
// choice is kept.
export function AppearanceTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState<ThemePreference>('system');
  const [dark, setDark] = useState<DarkVariant>('slate');
  const [light, setLight] = useState<LightVariant>('classic');
  const [text, setText] = useState<TextSize>('default');
  // Whether the device is in dark mode right now (and when it changes): with the System theme only the styles for that mode are shown.
  const [deviceDark, setDeviceDark] = useState(false);

  // Read after mount: the server has no localStorage, so reading it during the first render would not match the HTML.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage exists only in the browser; the initial render must match the server's */
    setTheme(readThemePreference());
    setDark(readDarkVariant());
    setLight(readLightVariant());
    setText(readTextSize());
    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    if (media) setDeviceDark(media.matches);
    /* eslint-enable react-hooks/set-state-in-effect */
    const onChange = (e: MediaQueryListEvent) => setDeviceDark(e.matches);
    media?.addEventListener?.('change', onChange);
    return () => media?.removeEventListener?.('change', onChange);
  }, []);

  const save = useMutation({
    mutationFn: (next: ThemePreference) => settingsService.updateProfile({ theme: next }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.profile() }),
    onError: () => toast('Theme changed on this device, but it could not be saved to your account. Try again.', 'error'),
  });

  function chooseTheme(next: ThemePreference) {
    if (next === theme) return;
    setTheme(next);
    storeTheme(next, dark);
    applyTheme(next, dark, light);
    save.mutate(next);
  }

  function chooseDark(next: DarkVariant) {
    if (next === dark) return;
    setDark(next);
    storeTheme(theme, next);
    applyTheme(theme, next, light);
  }

  function chooseLight(next: LightVariant) {
    if (next === light) return;
    setLight(next);
    storeLightVariant(next);
    applyTheme(theme, dark, next);
  }

  function chooseText(next: TextSize) {
    if (next === text) return;
    setText(next);
    storeTextSize(next);
    applyTextSize(next);
  }

  // Light and Dark show their own styles; System looks at the device and shows the styles for the mode it is in now. The other style is kept.
  const showLight = theme === 'light' || (theme === 'system' && !deviceDark);
  const showDark = theme === 'dark' || (theme === 'system' && deviceDark);
  const following = theme === 'system';
  const lightName = nameOf(LIGHT_STYLES, light);
  const darkName = nameOf(DARK_STYLES, dark);

  return (
    <div className="flex flex-col gap-8">
      <Section id="appearance-theme" title="Theme" description="Light, dark, or whatever your device uses. Saved to your account, so it follows you to other devices.">
        <div className="flex flex-col items-start gap-2">
          <SegmentedRadio
            ariaLabel="Theme"
            value={theme}
            onChange={(id) => chooseTheme(id as ThemePreference)}
            options={THEMES.map((t) => ({ id: t.id, label: t.label, icon: t.icon }))}
          />
          <p className="bg-body-sm text-(--text-secondary)" aria-live="polite">
            {theme === 'system' && `Follows your device: ${lightName} in light mode, ${darkName} in dark mode.`}
            {theme === 'light' && `Always light, using ${lightName}.`}
            {theme === 'dark' && `Always dark, using ${darkName}.`}
          </p>
        </div>
      </Section>

      {(showLight || showDark) && (
        <div className="flex flex-col gap-6 rounded-xl border border-(--border-default) p-4">
          {showLight && (
            <Section
              id="appearance-light"
              title="Light style"
              icon={<Sun size={16} aria-hidden="true" />}
              description={`${following ? 'Used while your device is in light mode.' : 'Used whenever light mode is on.'} Saved on this device only.`}
            >
              <StyleGroup labelledBy="appearance-light" options={LIGHT_STYLES} value={light} onChange={chooseLight} look={(id) => id} />
            </Section>
          )}
          {showDark && (
            <Section
              id="appearance-dark"
              title="Dark style"
              icon={<Moon size={16} aria-hidden="true" />}
              description={`${following ? 'Used while your device is in dark mode.' : 'Used whenever dark mode is on.'} Saved on this device only.`}
            >
              <StyleGroup labelledBy="appearance-dark" options={DARK_STYLES} value={dark} onChange={chooseDark} look={(id) => id} />
            </Section>
          )}
          {following && (
            <p className="bg-body-sm text-(--text-secondary)" aria-live="polite">
              Your device is in {deviceDark ? 'dark' : 'light'} mode right now, so these are the {deviceDark ? 'dark' : 'light'} styles. Your {deviceDark ? 'light' : 'dark'} style is kept and shows when your device switches, or choose {deviceDark ? 'Light' : 'Dark'} above to change it.
            </p>
          )}
        </div>
      )}

      <Section id="appearance-text" title="Text size" description="Makes text, buttons and spacing bigger across Beginso. Saved on this device only.">
        <StyleGroup labelledBy="appearance-text" options={TEXT_SIZES} value={text} onChange={chooseText} thumb={(id) => <TextThumb size={id} checked={text === id} />} thumbClass="h-20" />
      </Section>
    </div>
  );
}
