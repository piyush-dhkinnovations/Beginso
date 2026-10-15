"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useReveal } from "@/hooks/useReveal";

export default function CtaSection() {
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <section className="bg-(--bg-page) px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div ref={ref} className={`reveal ${visible ? "is-visible" : ""} mx-auto max-w-6xl rounded-(--bg-radius-lg) bg-(--surface-inverse) px-6 py-14 text-center md:py-20`}>
        <h2 className="text-[28px] md:text-[36px] lg:text-[48px] font-extrabold text-(--text-on-brand) leading-[1.15] mb-8 max-w-[28ch] mx-auto text-balance">
          Stop exporting to a spreadsheet.
          <br />
          Start working your responses instead.
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/try" className="w-full sm:w-auto">
            <Button
              variant="primary"
              className="btn-try w-full sm:w-auto h-12 px-10 bg-body-lg bg-(--surface-card) text-(--text-primary) hover:bg-(--bg-sunken) border-none shadow-(--shadow-md)"
            >
              Create a form
            </Button>
          </Link>
          <Link href="/discover-templates" className="w-full sm:w-auto">
            <Button variant="ghost" className="w-full sm:w-auto h-12 px-10 bg-body-lg text-(--text-on-brand) hover:bg-(--surface-card)/10">
              Browse templates
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
