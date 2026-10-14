'use client';

import type { CSSProperties, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { getFormIcon } from '@/lib/formIcons';
import { IconArt } from '@/components/forms/FormIcon';

// The decorative right-hand panel of the (auth) layout. Every screen gets its own scene (a different tint, headline and moving
// illustration) instead of one shared panel. The scene is keyed by route, so it remounts and replays its entrance on navigation,
// while the panel's background colour crossfades (`transition-colors`). Loops are CSS keyframes (globals.css, `.aa-*`) and the
// global prefers-reduced-motion rule shortens them. Cards sit slightly off-angle with little "stickers" stuck on them, so the
// scenes read as hand-placed rather than a grid of identical tiles.

type Scene = { tint: string; title: string; text: string; art: ReactNode };

function Icon({ name, size, className = '', style }: { name: string; size: number; className?: string; style?: CSSProperties }) {
  const icon = getFormIcon(name);
  if (!icon) return null;
  return (
    <span className={`inline-flex flex-none ${className}`} style={style}>
      <IconArt icon={icon} size={size} />
    </span>
  );
}

const card = 'rounded-2xl border border-(--border-default) bg-(--surface-card) shadow-xl';

// A small pill stuck on a card at an angle, popping in after the card has arrived. Fixed light colours with dark text: it must
// read the same on the tinted panel in both themes.
function Sticker({ children, className = '', delay = 0, tone = '#fde68a' }: { children: ReactNode; className?: string; delay?: number; tone?: string }) {
  return (
    <span
      className={`aa-pop absolute z-10 whitespace-nowrap rounded-full px-3 py-1 bg-caption font-bold text-slate-900 shadow-md ${className}`}
      style={{ backgroundColor: tone, animationDelay: `${delay}ms` }}
    >
      {children}
    </span>
  );
}

// Loose shapes drifting around a scene (ring, dot, squiggle, cross, square), drawn in translucent white.
function Confetti() {
  return (
    <svg aria-hidden="true" viewBox="0 0 400 400" className="pointer-events-none absolute inset-0 size-full" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round">
      <circle className="aa-float" cx="48" cy="70" r="12" />
      <circle className="aa-float" cx="352" cy="320" r="8" fill="#fff" fillOpacity="0.5" stroke="none" style={{ animationDelay: '-2s' }} />
      <path className="aa-fly" d="M300 40q10-14 20 0t20 0t20 0" />
      <path className="aa-float" d="M40 330l14-14m0 14l-14-14" style={{ animationDelay: '-1s' }} />
      <rect className="aa-blob" x="360" y="170" width="16" height="16" rx="4" transform="rotate(20 368 178)" />
    </svg>
  );
}

// Login: new responses arriving in an inbox, one after the other, slightly off-grid.
const INBOX = [
  { who: 'Priya Sharma', what: 'Event registration', icon: 'calendar-date', rot: -3 },
  { who: 'Daniel Okoye', what: 'Customer feedback', icon: 'rating-star', rot: 2 },
  { who: 'Mei Tanaka', what: 'Job application', icon: 'multiple-users-1', rot: -1.5 },
];
const loginArt = (
  <div className="relative flex w-full max-w-xs flex-col gap-4">
    <Sticker className="-right-6 -top-4 rotate-6" delay={1700} tone="#bbf7d0">+3 new</Sticker>
    {INBOX.map((r, i) => (
      <div key={r.who} className={`aa-slide ${card} flex items-center gap-3 p-3`} style={{ animationDelay: `${300 + i * 450}ms`, marginLeft: i % 2 ? 28 : 0, rotate: `${r.rot}deg` }}>
        <Icon name={r.icon} size={40} />
        <div className="min-w-0 flex-1">
          <p className="m-0 bg-body-sm font-semibold text-(--text-primary)">{r.who}</p>
          <p className="m-0 bg-caption text-(--text-muted)">{r.what}</p>
        </div>
        <span className="aa-pulse size-2 rounded-full bg-emerald-500" style={{ animationDelay: `${i * 400}ms` }} />
      </div>
    ))}
  </div>
);

// Sign up: a form assembling itself, field by field, with a second card peeking out behind it.
const signupArt = (
  <div className="relative w-full max-w-xs">
    <div className={`${card} absolute inset-0 translate-x-4 translate-y-3 rotate-3 opacity-60`} />
    <div className={`${card} aa-slide relative -rotate-2 p-5`}>
      <div className="flex items-center gap-3">
        <Icon name="common-file-text" size={40} />
        <div className="h-3 w-28 rounded bg-(--surface-hover)" />
      </div>
      <div className="mt-5 flex flex-col gap-4">
        {['w-24', 'w-32', 'w-20'].map((w, i) => (
          <div key={i} className="aa-slide" style={{ animationDelay: `${500 + i * 600}ms` }}>
            <div className={`mb-1.5 h-2.5 rounded bg-(--surface-hover) ${w}`} />
            <div className="h-9 rounded-md border border-(--border-default) bg-(--surface-page)" />
          </div>
        ))}
      </div>
      <div className="aa-slide mt-5 h-10 rounded-md bg-(--accent-solid,#2563eb)" style={{ animationDelay: '2300ms' }} />
    </div>
    <Sticker className="-left-5 top-10 -rotate-6" delay={1200} tone="#ddd6fe">Drag &amp; drop</Sticker>
    <Sticker className="-bottom-3 right-2 rotate-3" delay={2500} tone="#fde68a">Free to start</Sticker>
  </div>
);

// Forgot password: a key and a lock drifting, an envelope flying out.
const forgotArt = (
  <div className="relative size-72">
    <div className="aa-blob absolute left-1/2 top-1/2 size-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--surface-card) shadow-xl" />
    <Icon name="lock-shield" size={120} className="aa-float absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
    <Icon name="login-key" size={64} className="aa-float absolute left-2 top-4 -rotate-12" style={{ animationDelay: '-1.5s' }} />
    <Icon name="send-email-fly" size={72} className="aa-fly absolute bottom-2 right-0" />
    <Sticker className="bottom-10 left-4 -rotate-6" delay={700} tone="#fde68a">Link sent</Sticker>
  </div>
);

// Reset password: a shield and a four-step strength meter that lights up one segment at a time.
const resetArt = (
  <div className="relative">
    <div className={`${card} aa-slide flex w-72 flex-col items-center gap-5 p-8`}>
      <Icon name="shield-check-1" size={96} className="aa-float" />
      <div className="flex w-full gap-1.5">
        {['bg-red-400', 'bg-amber-400', 'bg-lime-400', 'bg-emerald-500'].map((c, i) => (
          <span key={c} className={`aa-pop h-2 flex-1 rounded-full ${c}`} style={{ animationDelay: `${500 + i * 450}ms` }} />
        ))}
      </div>
      <p className="m-0 bg-caption text-(--text-muted)">Password strength</p>
    </div>
    <Sticker className="-right-6 -top-3 rotate-6" delay={2400} tone="#bbf7d0">Strong</Sticker>
  </div>
);

// Verify email: an envelope landing, with a check badge popping on it.
const verifyArt = (
  <div className="relative size-64">
    <div className="aa-blob absolute left-1/2 top-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rotate-6 rounded-3xl bg-(--surface-card) shadow-xl" />
    <Icon name="envelope-letter" size={160} className="aa-float absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
    <Icon name="check-badge" size={64} className="aa-pop absolute bottom-4 right-4" style={{ animationDelay: '900ms' }} />
    <Sticker className="left-0 top-6 -rotate-6" delay={1300} tone="#bae6fd">1 new message</Sticker>
  </div>
);

// Verification code: six boxes filling one by one.
const codeArt = (
  <div className="relative">
    <div className={`${card} aa-slide flex rotate-1 flex-col items-center gap-5 p-8`}>
      <Icon name="lock-shield" size={64} className="aa-float" />
      <div className="flex gap-2">
        {[4, 8, 2, 7, 1, 9].map((d, i) => (
          <span
            key={i}
            className="aa-pop flex h-12 w-10 items-center justify-center rounded-lg border border-(--border-default) bg-(--surface-page) bg-h4 font-bold text-(--text-primary)"
            style={{ animationDelay: `${400 + i * 350}ms` }}
          >
            {d}
          </span>
        ))}
      </div>
    </div>
    <Sticker className="-left-4 -top-3 -rotate-6" delay={2600} tone="#99f6e4">Verified</Sticker>
  </div>
);

const SCENES: Record<string, Scene> = {
  '/login': { tint: '#2f56d8', title: 'Welcome back', text: 'Your latest responses are waiting in one inbox.', art: loginArt },
  '/signup': { tint: '#6a3fe0', title: 'Build your first form in minutes', text: 'Drag in fields, style it, share one link.', art: signupArt },
  '/forgot-password': { tint: '#c2570c', title: 'Locked out? It happens', text: "We'll email you a link to get back in.", art: forgotArt },
  '/reset-password': { tint: '#047857', title: 'Choose a strong password', text: 'Longer and unique keeps your forms safe.', art: resetArt },
  '/verify-email': { tint: '#0369a1', title: 'Check your inbox', text: 'One click confirms your email and you are in.', art: verifyArt },
  '/verification-code': { tint: '#0f766e', title: 'Enter your code', text: 'It only takes a few seconds.', art: codeArt },
};

export function AuthAside() {
  const pathname = usePathname() ?? '';
  const key = Object.keys(SCENES).find((p) => pathname.startsWith(p)) ?? '/login';
  const scene = SCENES[key];
  return (
    <aside
      aria-hidden="true"
      data-scene={key.slice(1)}
      className="relative hidden flex-col gap-8 overflow-hidden p-12 text-white transition-colors duration-700 lg:flex xl:p-16"
      style={{ backgroundColor: scene.tint }}
    >
      {/* Big concentric rings bleeding off the corner, drifting slowly: depth without a blurry gradient. */}
      <div className="aa-blob pointer-events-none absolute -bottom-40 -right-40 size-175 rounded-full border border-white/15" />
      <div className="aa-blob pointer-events-none absolute -bottom-20 -right-20 size-125 rounded-full border border-white/15" style={{ animationDelay: '-3s' }} />
      <div className="aa-blob pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-white/8" style={{ animationDelay: '-6s' }} />
      <div key={key} className="relative flex flex-1 flex-col gap-8">
        <div className="aa-slide max-w-md">
          <h2 className="m-0 bg-h1 font-bold leading-tight text-white text-balance">{scene.title}</h2>
          <svg aria-hidden="true" viewBox="0 0 120 10" className="mt-3 h-2.5 w-28" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round">
            <path d="M3 6q10-8 20 0t20 0t20 0t20 0t20 0t14 0" />
          </svg>
          <p className="m-0 mt-4 bg-body-lg text-white/85">{scene.text}</p>
        </div>
        <div className="relative flex flex-1 items-center justify-center">
          <Confetti />
          {scene.art}
        </div>
      </div>
    </aside>
  );
}
