"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { Play } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";
import ProductMockup from "./ProductMockup";
import { PEOPLE } from "./data/people";

const TRUST_PILL_PEOPLE = PEOPLE.slice(0, 4);

export default function HeroSection() {
  const { ref: trustPillRef, visible: trustPillVisible } = useReveal<HTMLDivElement>();
  const { ref: headlineRef, visible: headlineVisible } = useReveal<HTMLHeadingElement>();
  const { ref: sublineRef, visible: sublineVisible } = useReveal<HTMLParagraphElement>();
  const { ref: ctasRef, visible: ctasVisible } = useReveal<HTMLDivElement>();

  return (
    <section className="relative pt-[140px] pb-20 md:pt-[180px] md:pb-[120px] hero-bg overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <div
            ref={trustPillRef}
            className={`reveal ${trustPillVisible ? "is-visible" : ""} inline-flex items-center gap-3 rounded-full border border-(--border-default) bg-(--surface-card) pl-2 pr-4 py-1.5 mb-6`}
            style={{ "--reveal-delay": "0ms" } as React.CSSProperties}
          >
            <AvatarStack people={TRUST_PILL_PEOPLE} max={3} size="xs" />
            <span className="bg-caption text-(--text-secondary) font-medium">
              Built for teams who outgrew spreadsheets
            </span>
          </div>

          <h1
            ref={headlineRef}
            className={`reveal ${headlineVisible ? "is-visible" : ""} text-[32px] md:text-[40px] lg:text-[56px] font-extrabold text-(--text-primary) leading-[1.1] mb-6 max-w-[18ch] mx-auto [text-wrap:balance]`}
            style={{ "--reveal-delay": "80ms" } as React.CSSProperties}
          >
            Collecting the form is the easy part.
            <br />
            <span className="text-(--text-link)">What happens next is the work.</span>
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
            <Link href="/signup" className="w-full sm:w-auto">
              <Button variant="primary" size="default" className="w-full sm:w-auto h-11 px-8">
                Start free
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
            No credit card required · Free plan forever
          </p>
        </div>

        <div className="mt-16 md:mt-20">
          <ProductMockup />
        </div>
      </div>
    </section>
  );
}
