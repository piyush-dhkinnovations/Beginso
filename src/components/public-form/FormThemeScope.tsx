'use client';

import { createContext, useContext, useLayoutEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { parseEmbedOptions, type Scheme } from '@/lib/embed/embedParams';

// Sprint 13 (CF2.11), requirements.md 3.4. The admin/OS dark theme must never reach the public
// form: it is styled by the form's own branding, which respondents cannot change. beginso-ui.css
// implements dark as `[data-theme="dark"]` descendant selectors on <html>, with no light re-scope,
// so a nested wrapper cannot undo it — this scope removes the attribute from <html> while mounted
// and restores it on unmount. It is deliberately only used where the WHOLE document is the form
// (`/f/*`, and the preview iframe's own document), never inside the admin shell, so it can never
// flip admin chrome. The root layout's THEME_INIT_SCRIPT skips the same paths so there is no dark
// flash before this runs.
//
// Embed (?theme=light|dark|auto): the OWNER's choice for the embedded form, never the admin's theme. The form
// stays light unless the embed link asks otherwise; dark is the design system's own dark tokens on this wrapper
// (not on <html>). `auto` follows the HOST page: the embed script reports its colour scheme over the handshake;
// without the script (a plain iframe) it falls back to this document's prefers-color-scheme, which is the visitor's
// browser setting and so only matches a host page that does not force its own scheme.
const HostSchemeContext = createContext<(scheme: Scheme) => void>(() => {});
export const useSetHostScheme = () => useContext(HostSchemeContext);

const noopSubscribe = () => () => {};
const subscribeDark = (cb: () => void) => {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

export function FormThemeScope({ children }: { children: ReactNode }) {
  const [hostScheme, setHostScheme] = useState<Scheme | null>(null);
  // External-store reads: '' / false on the server and first hydration pass, the real value right after.
  const search = useSyncExternalStore(noopSubscribe, () => window.location.search, () => '');
  const osDark = useSyncExternalStore(subscribeDark, () => window.matchMedia('(prefers-color-scheme: dark)').matches, () => false);
  const { theme, embed } = useMemo(() => parseEmbedOptions(search), [search]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const htmlTheme = root.getAttribute('data-theme');
    const dark = root.getAttribute('data-dark');
    root.removeAttribute('data-theme');
    root.removeAttribute('data-dark');
    return () => {
      if (htmlTheme !== null) root.setAttribute('data-theme', htmlTheme);
      if (dark !== null) root.setAttribute('data-dark', dark);
    };
  }, []);

  const isDark = theme === 'dark' || (theme === 'auto' && (hostScheme ? hostScheme === 'dark' : osDark));

  return (
    <HostSchemeContext.Provider value={setHostScheme}>
      <div data-form-theme="" data-embed={embed ? '' : undefined} data-theme={isDark ? 'dark' : undefined} style={{ colorScheme: isDark ? 'dark' : 'light' }}>
        {children}
      </div>
    </HostSchemeContext.Provider>
  );
}
