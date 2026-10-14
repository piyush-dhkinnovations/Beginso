import type { HTMLAttributes } from 'react';

// The content of every (auth) page: a plain column, no card around it. The wordmark and the page background live in the
// (auth) layout (src/app/(auth)/layout.tsx), so a screen only supplies its own heading, form and links. `auth-touch` keeps the
// larger touch targets the auth screens use.
export function AuthCard({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={['auth-touch', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
