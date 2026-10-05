'use client';

import { useLayoutEffect, type ReactNode } from 'react';

// Sprint 13 (CF2.11), requirements.md 3.4. The admin/OS dark theme must never reach the public
// form: it is styled by the form's own branding, which respondents cannot change. beginso-ui.css
// implements dark as `[data-theme="dark"]` descendant selectors on <html>, with no light re-scope,
// so a nested wrapper cannot undo it — this scope removes the attribute from <html> while mounted
// and restores it on unmount. It is deliberately only used where the WHOLE document is the form
// (`/f/*`, and the preview iframe's own document), never inside the admin shell, so it can never
// flip admin chrome. The root layout's THEME_INIT_SCRIPT skips the same paths so there is no dark
// flash before this runs.
export function FormThemeScope({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const theme = root.getAttribute('data-theme');
    const dark = root.getAttribute('data-dark');
    root.removeAttribute('data-theme');
    root.removeAttribute('data-dark');
    return () => {
      if (theme !== null) root.setAttribute('data-theme', theme);
      if (dark !== null) root.setAttribute('data-dark', dark);
    };
  }, []);

  return (
    <div data-form-theme="" style={{ colorScheme: 'light' }}>
      {children}
    </div>
  );
}
