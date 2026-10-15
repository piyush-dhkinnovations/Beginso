"use client";

import { Fragment } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Play } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";
import ProductMockup from "./ProductMockup";

// The words are real text in the server HTML; CSS animates them once (see .word-in). No JS, no hidden content.
function Words({ text, start = 0 }: { text: string; start?: number }) {
  return text.split(" ").map((w, i) => (
    <Fragment key={i}>
      <span className="word-in" style={{ "--i": start + i } as React.CSSProperties}>{w}</span>{" "}
    </Fragment>
  ));
}

export default function HeroSection() {
  const { ref: trustPillRef, visible: trustPillVisible } = useReveal<HTMLDivElement>();
  const { ref: mockRef, visible: mockVisible } = useReveal<HTMLDivElement>(0.1);
  const { ref: sublineRef, visible: sublineVisible } = useReveal<HTMLParagraphElement>();
  const { ref: ctasRef, visible: ctasVisible } = useReveal<HTMLDivElement>();

  return (
    <section className="relative pt-35 pb-20 md:pt-45 md:pb-30 hero-bg overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <div
            ref={trustPillRef}
            className={`reveal ${trustPillVisible ? "is-visible" : ""} inline-flex items-center mb-6`}
            style={{ "--reveal-delay": "0ms" } as React.CSSProperties}
          >
            <span className="bg-caption text-(--text-secondary) font-medium">
              Form builder with a response inbox, dashboards and exports.
            </span>
          </div>

          <h1
            className={`text-[32px] md:text-[40px] lg:text-[56px] font-extrabold text-(--text-primary) leading-[1.1] mb-6 max-w-[18ch] mx-auto text-balance`}
          >
            <Words text="Collecting the form is the easy part." />
            <br />
            <span className="text-(--text-link)"><Words text="What happens next is the work." start={6} /></span>
          </h1>

          <p
            ref={sublineRef}
            className={`reveal ${sublineVisible ? "is-visible" : ""} bg-body-lg text-(--text-secondary) max-w-2xl mb-10`}
            style={{ "--reveal-delay": "160ms" } as React.CSSProperties}
          >
            Beginso builds the form, publishes it, and turns every response into something you can
            actually work with — status tracking, dashboards and exports, without a spreadsheet in
            sight.
          </p>

          <div
            ref={ctasRef}
            className={`reveal ${ctasVisible ? "is-visible" : ""} flex flex-col sm:flex-row items-center gap-4`}
            style={{ "--reveal-delay": "240ms" } as React.CSSProperties}
          >
            <Link href="/try" className="w-full sm:w-auto">
              <Button variant="primary" size="default" className="btn-try w-full sm:w-auto h-11 px-8">
                Create a form
              </Button>
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto">
              <Button variant="ghost" size="default" className="w-full sm:w-auto h-11 px-8 gap-2">
                <Play size={16} aria-hidden="true" />
                See how it works
              </Button>
            </a>
          </div>

          <p className="bg-caption text-(--text-muted) mt-4">
            No account needed to start. You sign up when you save.
          </p>
        </div>

        <div ref={mockRef} className={`reveal-up ${mockVisible ? "is-visible" : ""} mt-16 md:mt-20`}>
          <ProductMockup />
        </div>
      </div>
    </section>
  );
}
