'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Top-right of the form column: the one other door (log in <-> sign up), so a wrong turn is never a dead end.
export function AuthTopLink() {
  const pathname = usePathname() ?? '';
  const signup = pathname.startsWith('/signup');
  return (
    <p className="m-0 flex items-center gap-2 bg-body-sm text-(--text-muted)">
      <span className="hidden sm:inline">{signup ? 'Already have an account?' : 'New to Beginso?'}</span>
      <Link
        href={signup ? '/login' : '/signup'}
        className="rounded-full border border-(--border-default) bg-(--surface-card) px-4 py-1.5 font-semibold text-(--text-primary) transition-colors hover:bg-(--surface-hover)"
      >
        {signup ? 'Log in' : 'Sign up free'}
      </Link>
    </p>
  );
}
