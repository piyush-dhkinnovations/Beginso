"use client";

import { useState } from "react";
import { LayoutTemplate } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { TemplateGalleryCard } from "@/components/templates/TemplateGalleryCard";
import { usePublicTemplates } from "@/hooks/usePublicTemplates";
import { useReveal } from "@/hooks/useReveal";
import { bx } from "@/lib/utils";

export default function DiscoverTemplatesPage() {
  const { ref: headerRef, visible: headerVisible } = useReveal<HTMLDivElement>();
  const [category, setCategory] = useState<string>("All");
  const { data: templates, isLoading, error } = usePublicTemplates();

  const categories = ["All", ...Array.from(new Set((templates ?? []).map((t) => t.category)))];
  const filtered = category === "All" ? templates : templates?.filter((t) => t.category === category);

  return (
    <main className="min-h-screen bg-(--bg-page)">
      <Navbar />

      <section className="pt-[140px] pb-16 md:pt-[180px] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={headerRef} className={`reveal ${headerVisible ? "is-visible" : ""} text-center max-w-2xl mx-auto mb-10`}>
          <h1 className="bg-h1 text-(--text-primary) mb-3">Start from a template</h1>
          <p className="bg-body-lg text-(--text-secondary)">
            Pre-built forms for hiring, events, feedback and more. Pick one, sign up, and it&apos;s
            already in your account, ready to customize.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-(--bg-radius-md) border border-(--border-default) bg-(--surface-card) p-5 animate-pulse">
                <div className="h-5 w-20 bg-(--surface-hover) rounded-full mb-3" />
                <div className="h-5 bg-(--surface-hover) rounded w-3/5 mb-2" />
                <div className="h-3 bg-(--surface-hover) rounded w-full mb-1.5" />
                <div className="h-3 bg-(--surface-hover) rounded w-4/5" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-center bg-body text-(--text-muted) py-16">
            Couldn&apos;t load templates right now. Please refresh the page.
          </p>
        ) : !templates || templates.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <LayoutTemplate size={32} className="text-(--text-muted) mb-3" />
            <p className="bg-body text-(--text-muted)">No templates available yet — check back soon.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap justify-center gap-2 mb-14">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={bx(
                    "min-h-[36px] rounded-full border px-4 text-[13px] font-medium capitalize transition-colors",
                    category === c
                      ? "border-(--primary-500) bg-(--accent-soft) text-(--primary-700)"
                      : "border-(--border-default) bg-(--surface-card) text-(--text-secondary) hover:bg-(--surface-hover)"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered?.map((template) => (
                <TemplateGalleryCard key={template._id} template={template} />
              ))}
            </div>
          </>
        )}
      </section>

      <Footer />
    </main>
  );
}
