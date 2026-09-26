"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useReveal } from "@/hooks/useReveal";

export default function CtaSection() {
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <section className="bg-[var(--neutral-900)] py-14 md:py-[72px] lg:py-24 text-center">
      <div ref={ref} className={`reveal ${visible ? "is-visible" : ""} max-w-3xl mx-auto px-4 sm:px-6 lg:px-8`}>
        <h2 className="text-[28px] md:text-[36px] lg:text-[48px] font-extrabold text-white leading-[1.15] mb-6 max-w-[20ch] mx-auto [text-wrap:balance]">
          Stop exporting to a spreadsheet.
          <br />
          Start working your responses instead.
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup" className="w-full sm:w-auto">
            <Button
              variant="primary"
              className="w-full sm:w-auto h-[48px] px-10 text-[15px] bg-white text-[var(--ink-900)] hover:bg-[var(--neutral-100)] border-none shadow-md"
            >
              Start free
            </Button>
          </Link>
          <a href="/docs" className="w-full sm:w-auto">
            <Button variant="ghost" className="w-full sm:w-auto h-[48px] px-10 text-[15px] text-white hover:bg-white/10">
              Read the docs
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
