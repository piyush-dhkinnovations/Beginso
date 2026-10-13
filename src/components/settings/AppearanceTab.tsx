'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { settingsService } from '@/services/settings';
import { settingsKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/ui/Toast';
import { bx } from '@/lib/utils';
import { applyTheme, readDarkVariant, readThemePreference, storeTheme, type DarkVariant, type ThemePreference } from '@/lib/theme';

// Fixed colours on purpose: each thumbnail shows the theme it stands for, whatever theme the page is in now.
const PAGE = { light: '#F6F7FB', slate: '#10151E', midnight: '#0F1729', dimmed: '#1D222B' } as const;
const CARD = { light: '#FFFFFF', slate: '#1A202E', midnight: '#18233A', dimmed: '#282E39' } as const;
const LINE = { light: '#D5DBE6', slate: '#38425A', midnight: '#3E4E70', dimmed: '#4A5364' } as const;
const ACCENT = { light: '#1D4ED8', slate: '#6A92E8', midnight: '#6A92E8', dimmed: '#6A92E8' } as const;

type Look = keyof typeof PAGE;

function Thumb({ look }: { look: Look }) {
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

const THEMES: { id: ThemePreference; label: string; hint: string }[] = [
  { id: 'system', label: 'System', hint: 'Matches your device, and changes with it.' },
  { id: 'light', label: 'Light', hint: 'Always light.' },
  { id: 'dark', label: 'Dark', hint: 'Always dark.' },
];

const VARIANTS: { id: DarkVariant; label: string; hint: string }[] = [
  { id: 'slate', label: 'Slate', hint: 'The default dark.' },
  { id: 'midnight', label: 'Midnight', hint: 'Deeper, bluer.' },
  { id: 'dimmed', label: 'Dimmed', hint: 'Softer, lighter surfaces.' },
];

function Option({ checked, onSelect, label, hint, children }: { checked: boolean; onSelect: () => void; label: string; hint: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={bx(
        'flex flex-col gap-2 rounded-xl border p-2 text-left outline-none transition-colors focus-visible:shadow-(--shadow-focus)',
        checked ? 'border-(--text-primary) bg-(--surface-card)' : 'border-(--border-default) bg-(--surface-card) hover:border-(--border-strong)',
      )}
    >
      <span className="block h-20 overflow-hidden rounded-lg border border-(--border-subtle)">{children}</span>
      <span className="flex flex-col px-1 pb-1">
        <span className="flex items-center justify-between gap-2 bg-body-sm font-semibold text-(--text-primary)">
          {label}
          {checked && <Check size={14} aria-hidden="true" />}
        </span>
        <span className="bg-caption text-(--text-muted)">{hint}</span>
      </span>
    </button>
  );
}

// Account → Appearance. The theme is applied the moment it is picked and saved on the account (so it follows the person to
// other devices); the dark style (Slate / Midnight / Dimmed) is a per-device choice, kept in the browser only.
export function AppearanceTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState<ThemePreference>('system');
  const [variant, setVariant] = useState<DarkVariant>('slate');

  // Read after mount: the server has no localStorage, so reading it during the first render would not match the HTML.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage exists only in the browser; the initial render must match the server's
    setTheme(readThemePreference());
    setVariant(readDarkVariant());
  }, []);

  const save = useMutation({
    mutationFn: (next: ThemePreference) => settingsService.updateProfile({ theme: next }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.profile() }),
    onError: () => toast('Theme changed on this device, but it could not be saved to your account. Try again.', 'error'),
  });

  function chooseTheme(next: ThemePreference) {
    if (next === theme) return;
    setTheme(next);
    storeTheme(next, variant);
    applyTheme(next, variant);
    save.mutate(next);
  }

  function chooseVariant(next: DarkVariant) {
    if (next === variant) return;
    setVariant(next);
    storeTheme(theme, next);
    applyTheme(theme, next);
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3" aria-labelledby="appearance-theme">
        <div>
          <h3 id="appearance-theme" className="bg-h5 font-bold text-(--text-primary)">Theme</h3>
          <p className="bg-body-sm text-(--text-muted)">Choose how Beginso looks. Saved to your account, so it follows you to other devices.</p>
        </div>
        <div role="radiogroup" aria-labelledby="appearance-theme" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEMES.map((t) => (
            <Option key={t.id} checked={theme === t.id} onSelect={() => chooseTheme(t.id)} label={t.label} hint={t.hint}>
              {t.id === 'system' ? (
                <span className="flex h-full w-full">
                  <span className="block h-full w-1/2 overflow-hidden"><Thumb look="light" /></span>
                  <span className="block h-full w-1/2 overflow-hidden"><span className="block h-full w-[200%] -translate-x-1/2"><Thumb look={variant} /></span></span>
                </span>
              ) : (
                <Thumb look={t.id === 'light' ? 'light' : variant} />
              )}
            </Option>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="appearance-dark">
        <div>
          <h3 id="appearance-dark" className="bg-h5 font-bold text-(--text-primary)">Dark style</h3>
          <p className="bg-body-sm text-(--text-muted)">Used whenever dark mode is on. Saved on this device only.</p>
        </div>
        <div role="radiogroup" aria-labelledby="appearance-dark" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {VARIANTS.map((v) => (
            <Option key={v.id} checked={variant === v.id} onSelect={() => chooseVariant(v.id)} label={v.label} hint={v.hint}>
              <Thumb look={v.id} />
            </Option>
          ))}
        </div>
      </section>
    </div>
  );
}
