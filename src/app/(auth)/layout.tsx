import React from "react";
import Link from "next/link";
import { AuthTopLink } from "@/components/auth/AuthTopLink";
import { AuthAside } from "@/components/auth/AuthAside";
import { Wordmark } from "@/components/landing/Wordmark";

// Every auth screen in one two-pane layout: a quiet column with the wordmark top-left and a compact form (no card), beside a
// decorative panel (AuthAside) with a different animated scene per screen, hidden below `lg`.

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-(--surface-card) lg:grid-cols-2">
      <div className="relative flex min-h-screen min-w-0 flex-col px-6 py-6 sm:px-12 lg:px-16 xl:px-24">
        {/* A faint dot grid that fades out downward, so the column has some texture without a card. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-60"
          style={{
            backgroundImage: "radial-gradient(var(--border-default) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "linear-gradient(to bottom, #000, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, #000, transparent)",
          }}
        />
        <header className="relative flex items-center justify-between">
          <Link href="/" aria-label="Beginso home">
            <Wordmark height={30} />
          </Link>
          <AuthTopLink />
        </header>
        <main className="relative flex flex-1 items-center justify-center py-10">
          <div className="flex w-full max-w-sm flex-col gap-6">{children}</div>
        </main>
        <footer className="relative flex flex-wrap items-center justify-between gap-2 bg-caption text-(--text-muted)">
          <span>&copy; {new Date().getFullYear()} Beginso</span>
          <nav className="flex gap-4" aria-label="Legal">
            <Link href="/privacy" className="hover:text-(--text-primary)">Privacy</Link>
            <Link href="/terms" className="hover:text-(--text-primary)">Terms</Link>
          </nav>
        </footer>
      </div>

      <AuthAside />
    </div>
  );
}
