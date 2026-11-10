"use client";

import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";
import { usePublicTemplates } from "@/hooks/usePublicTemplates";
import { isGalleryTemplate } from "@/lib/guest/galleryFilter";
import { SpotlightCard } from "./SpotlightCard";

// Six real templates from the public gallery. One click opens the guest editor with that template chosen
// (/try?template=<id>). The list keeps its height while loading so the page does not jump. If the gallery cannot be
// loaded (or is empty) the section says so and still offers a way in, instead of leaving a blank box.
export default function TemplatesSection() {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const { data, isLoading, isError } = usePublicTemplates();
  const templates = (data ?? []).filter(isGalleryTemplate).slice(0, 6);

  return (
    <section id="templates" className="py-14 md:py-[72px] lg:py-24 bg-(--surface-card) border-y border-(--border-default)">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={ref} className={`reveal ${visible ? "is-visible" : ""} mb-8 md:mb-12 max-w-2xl`}>
          <h2 className="bg-h2 text-(--text-primary) mb-3">Start from a template</h2>
          <p className="bg-body-lg text-(--text-secondary)">Pick one and it opens in the editor. Change anything, then save it to a free account.</p>
        </div>
        {!isLoading && templates.length === 0 ? (
          <p className="bg-body text-(--text-secondary)">
            {isError ? "Templates could not be loaded right now." : "No templates to show yet."}{" "}
            <Link href="/try" className="font-semibold text-(--text-link) underline">
              Start with a blank form
            </Link>
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 min-h-60">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <li key={i} className="h-28 rounded-(--bg-radius-md) bg-(--bg-subtle)" aria-hidden="true" />)
              : templates.map((t) => (
                  <li key={t._id}>
                    <SpotlightCard className="h-full rounded-(--bg-radius-md) border border-(--border-default) bg-(--surface-card)">
                      <Link href={`/try?template=${t._id}`} className="relative z-10 flex h-full flex-col gap-1 rounded-(--bg-radius-md) p-5">
                        <span className="bg-body font-semibold text-(--text-primary)">{t.name}</span>
                        <span className="line-clamp-2 bg-body-sm text-(--text-secondary)">{t.description}</span>
                        <span className="mt-2 bg-caption text-(--text-muted)">{t.fields.filter((f) => !f.deleted).length} questions</span>
                      </Link>
                    </SpotlightCard>
                  </li>
                ))}
          </ul>
        )}
        {!isLoading && templates.length > 0 && (
          <Link href="/discover-templates" className="mt-6 inline-flex min-h-11 items-center bg-body font-semibold text-(--text-link) underline">
            Browse all templates
          </Link>
        )}
      </div>
    </section>
  );
}
