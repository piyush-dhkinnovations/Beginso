"use client";

import React from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Create your form",
    description: "Use our drag-and-drop builder to assemble the fields you need in minutes.",
  },
  {
    title: "Share the link",
    description: "Publish your form with one click and share the public link with respondents.",
  },
  {
    title: "Collect responses",
    description: "Submissions flow directly into your secure workspace in real time.",
  },
  {
    title: "View your dashboard",
    description: "Analyze charts, track statuses, and export your data as CSV or PDF.",
  },
];

export default function HowItWorksSection() {
  const { ref, isVisible } = useIntersectionObserver({ threshold: 0.1 });

  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <h2 className="text-heading-1 text-neutral-900 mb-4">
            How it works
          </h2>
          <p className="text-body-lg text-neutral-500">
            A seamless process from building the form to analyzing the final results.
          </p>
        </div>

        <div 
          ref={ref as React.RefObject<HTMLDivElement>}
          className="relative max-w-5xl mx-auto"
        >
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-[24px] left-[10%] right-[10%] h-[2px] bg-neutral-200" />
          
          {/* Connecting Line (Mobile) */}
          <div className="md:hidden absolute top-[24px] bottom-[24px] left-[24px] w-[2px] bg-neutral-200" />

          <div className="flex flex-col md:flex-row gap-10 md:gap-6 relative">
            {STEPS.map((step, index) => {
              const delay = index * 120;
              return (
                <div 
                  key={step.title}
                  className={cn(
                    "flex flex-row md:flex-col items-start md:items-center relative z-10 flex-1 gap-4 md:gap-6",
                    isVisible ? "animate-fade-up opacity-100" : "opacity-0"
                  )}
                  style={{
                    animationDelay: `${delay}ms`,
                    animationFillMode: "both"
                  }}
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white border-2 border-brand-700 flex items-center justify-center text-[14px] font-[700] text-brand-700 shadow-sm ml-2 md:ml-0">
                    {index + 1}
                  </div>
                  <div className="md:text-center mt-1 md:mt-0">
                    <h3 className="text-heading-2 text-neutral-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-body text-neutral-500">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
