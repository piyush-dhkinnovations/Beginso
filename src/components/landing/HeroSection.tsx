"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function HeroSection() {
  return (
    <section className="relative pt-[120px] pb-20 md:pt-[160px] md:pb-[120px] hero-bg overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 flex flex-col items-center">
        {/* Eyebrow */}
        <div
          className="text-[11px] font-[700] uppercase text-[#1D4ED8] tracking-widest mb-6 animate-fade-up"
          style={{ animationDelay: "0ms", animationFillMode: "both" }}
        >
          Form Building Reimagined
        </div>

        {/* Headline */}
        <h1
          className="text-[36px] md:text-[48px] font-[800] text-[#0F172A] leading-[1.1] mb-6 max-w-4xl animate-fade-up"
          style={{ animationDelay: "80ms", animationFillMode: "both" }}
        >
          The simplest way to create forms and collect data.
        </h1>

        {/* Subheadline */}
        <p
          className="text-[16px] md:text-[18px] font-[400] text-[#475569] mb-10 max-w-2xl animate-fade-up"
          style={{ animationDelay: "160ms", animationFillMode: "both" }}
        >
          Drag-and-drop builder, auto-generated dashboards, and seamless exports. No coding required. Built for teams that move fast.
        </p>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row items-center gap-4 animate-fade-up"
          style={{ animationDelay: "240ms", animationFillMode: "both" }}
        >
          <Link href="/signup">
            <Button variant="primary" className="h-[44px] px-8 text-[15px]">
              Start for free
            </Button>
          </Link>
          <a href="#features">
            <Button variant="secondary" className="h-[44px] px-8 text-[15px]">
              See how it works
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
