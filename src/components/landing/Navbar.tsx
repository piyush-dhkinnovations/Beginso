"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark } from "./Wordmark";

const NAV_LINKS = [
  { name: "Features", href: "#features" },
  { name: "How it works", href: "#how-it-works" },
  { name: "Templates", href: "/discover-templates" },
];

export default function Navbar() {
  const { isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isMobileMenuOpen && !target.closest(".mobile-menu-container") && !target.closest(".hamburger-btn")) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[1100px]",
          "rounded-full transition-all duration-[250ms]",
          isScrolled
            ? "bg-(--surface-card)/90 backdrop-blur-md border border-(--border-default) shadow-(--shadow-sm)"
            : "bg-transparent border border-transparent"
        )}
      >
        <div className="flex items-center justify-between h-14 px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Wordmark height={44} />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="bg-body-sm text-(--text-secondary) hover:text-(--text-primary) transition-colors font-medium"
              >
                {link.name}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button variant="primary">Go to dashboard</Button>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="bg-body-sm text-(--text-secondary) hover:text-(--text-primary) transition-colors font-medium"
                >
                  Log in
                </Link>
                <Link href="/try">
                  <Button variant="primary" className="btn-try">Create a form</Button>
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button
              className="hamburger-btn min-h-11 min-w-11 inline-flex items-center justify-center rounded-full text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--surface-hover) focus:outline-none"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? "Close main menu" : "Open main menu"}
              aria-controls="mobile-menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div
          id="mobile-menu"
          className="mobile-menu-container md:hidden fixed inset-0 z-40 bg-(--surface-card) pt-24 px-6"
        >
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="min-h-11 flex items-center bg-body text-(--text-primary) font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
          </nav>
          <div className="mt-6 border-t border-(--border-default) pt-6">
            {isAuthenticated ? (
              <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="primary" className="w-full justify-center">
                  Go to dashboard
                </Button>
              </Link>
            ) : (
              <div className="flex flex-col gap-3">
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="secondary" className="w-full justify-center">
                    Log in
                  </Button>
                </Link>
                <Link href="/try" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full justify-center">
                    Create a form
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
