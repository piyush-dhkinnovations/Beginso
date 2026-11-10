"use client";

import { ButtonLink } from "@/components/ui/ButtonLink";
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
          <ButtonLink
            href="/try"
            variant="primary"
            className="btn-try w-full sm:w-auto h-12 px-10 justify-center bg-body-lg bg-(--surface-card) text-(--text-primary) hover:bg-(--bg-sunken) border-none shadow-(--shadow-md)"
          >
            Create a form
          </ButtonLink>
          <ButtonLink href="/discover-templates" variant="ghost" className="w-full sm:w-auto h-12 px-10 justify-center bg-body-lg text-(--text-on-brand) hover:bg-(--surface-card)/10">
            Browse templates
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
