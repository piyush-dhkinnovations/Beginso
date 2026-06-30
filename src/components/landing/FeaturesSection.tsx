"use client";

import React from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { 
  LayoutTemplate, 
  BarChart3, 
  ActivitySquare, 
  FileDown, 
  ListChecks, 
  Smartphone 
} from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    title: "Drag-and-drop builder",
    description: "Create complex forms in minutes without writing a single line of code.",
    icon: LayoutTemplate,
  },
  {
    title: "Auto-generated dashboards",
    description: "Instantly view charts and analytics for your responses as they come in.",
    icon: BarChart3,
  },
  {
    title: "Response status tracking",
    description: "Move submissions through customizable workflows from new to completed.",
    icon: ActivitySquare,
  },
  {
    title: "CSV and PDF export",
    description: "Download raw data or presentation-ready PDF reports with one click.",
    icon: FileDown,
  },
  {
    title: "10 field types",
    description: "Collect exactly what you need with text, dates, dropdowns, files, and more.",
    icon: ListChecks,
  },
  {
    title: "Mobile-ready public forms",
    description: "Respondents get a perfect experience on any device, automatically.",
    icon: Smartphone,
  },
];

export default function FeaturesSection() {
  const { ref, isVisible } = useIntersectionObserver({ threshold: 0.1 });

  return (
    <section id="features" className="py-20 md:py-32 bg-neutral-50 border-t border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-heading-1 text-neutral-900 mb-4">
            Everything you need to collect and manage data
          </h2>
          <p className="text-body-lg text-neutral-500">
            We built Onboarding Platform to handle the entire lifecycle of a form—from creation to analysis to export.
          </p>
        </div>

        <div 
          ref={ref as React.RefObject<HTMLDivElement>}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            // Left-to-right stagger per row (3 columns on lg)
            const delay = Math.floor(index % 3) * 60;
            
            return (
              <div
                key={feature.title}
                className={cn(
                  "bg-white border border-neutral-200 rounded-lg p-5",
                  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-300",
                  isVisible ? "animate-fade-in opacity-100" : "opacity-0"
                )}
                style={{
                  animationDelay: `${delay}ms`,
                  animationFillMode: "both"
                }}
              >
                <div className="w-10 h-10 rounded-md bg-brand-50 flex items-center justify-center mb-4">
                  <Icon className="w-[18px] h-[18px] text-[#1D4ED8]" />
                </div>
                <h3 className="text-[14px] font-[600] text-neutral-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-[13px] font-[400] text-[#475569] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
