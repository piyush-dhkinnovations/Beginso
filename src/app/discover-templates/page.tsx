"use client";

import { useState } from "react";
import {
  LayoutGrid,
  LayoutTemplate,
  Megaphone,
  ShoppingCart,
  Star,
  Briefcase,
  CalendarDays,
  Phone,
  CalendarCheck,
  GraduationCap,
  Home,
  HeartHandshake,
  Stethoscope,
  User,
  Sparkles,
  FileText,
  DollarSign,
  Building2,
  Package,
  ClipboardList,
  Inbox,
  UserPlus,
  IdCard,
  FileSignature,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { TemplateGalleryCard } from "@/components/templates/TemplateGalleryCard";
import { usePublicTemplates } from "@/hooks/usePublicTemplates";
import { useReveal } from "@/hooks/useReveal";
import { bx } from "@/lib/utils";

// One icon per category, so the sidebar reads at a glance instead of as a wall of text. Keyed
// lowercase to match however the backend happens to case it; a category outside this list (the
// catalog is open-ended, not hardcoded here) still gets a sensible generic icon, never a blank spot.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  general: FileText,
  advanced: Sparkles,
  "lead generation": Megaphone,
  "e-commerce": ShoppingCart,
  feedback: Star,
  hr: Briefcase,
  events: CalendarDays,
  "contact us": Phone,
  "reservation/booking": CalendarCheck,
  education: GraduationCap,
  "real estate": Home,
  "non-profit": HeartHandshake,
  medicine: Stethoscope,
  personal: User,
  sales: DollarSign,
  business: Building2,
  order: Package,
  "working forms": ClipboardList,
  requests: Inbox,
  registration: UserPlus,
  membership: IdCard,
  consent: FileSignature,
  "inspection forms": ClipboardCheck,
};
const categoryIcon = (category: string): LucideIcon => CATEGORY_ICONS[category.toLowerCase()] ?? LayoutTemplate;

export default function DiscoverTemplatesPage() {
  const { ref: headerRef, visible: headerVisible } = useReveal<HTMLDivElement>();
  const [category, setCategory] = useState<string>("All");
  const { data: templates, isLoading, error } = usePublicTemplates();

  const categories = ["All", ...Array.from(new Set((templates ?? []).map((t) => t.category)))];
  const filtered = category === "All" ? templates : templates?.filter((t) => t.category === category);

  // Clicking a category near the bottom of the (now 20-long) sidebar list left the page scrolled
  // wherever it was, with the newly-filtered grid rendering above the fold — looking like nothing
  // happened. Jump back to the top of the page so the result is the first thing in view.
  const selectCategory = (c: string) => {
    setCategory(c);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-(--bg-page)">
      <Navbar />

      {/* Wider than blog/templates' own max-w-7xl: this page carries a sidebar beside a multi-column
          grid, so the same 1280px cap left large, unused margins either side on anything wider than
          a laptop screen — the exact "wasted space" the sidebar + cards design made worse, not the cards themselves. */}
      <section className="pt-28 pb-16 md:pt-32 max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={headerRef} className={`reveal ${headerVisible ? "is-visible" : ""} text-center max-w-2xl mx-auto mb-10`}>
          <h1 className="bg-h1 text-(--text-primary) mb-3">Start from a template</h1>
          <p className="bg-body-lg text-(--text-secondary)">
            Pre-built forms for hiring, events, feedback and more. Pick one, sign up, and it&apos;s
            already in your account, ready to customize.
          </p>
        </div>

        {isLoading ? (
          // Same footprint as the loaded page (sidebar + three rows of cards): the footer used to
          // jump down ~700px when the real cards arrived (layout shift 0.157 on desktop).
          <div data-testid="templates-skeleton" className="flex flex-col gap-8 md:flex-row md:items-start">
            <div className="h-9 w-full shrink-0 md:h-96 md:w-56" aria-hidden="true" />
            <div className="grid min-w-0 flex-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="min-h-85 rounded-(--bg-radius-md) border border-(--border-default) bg-(--surface-card) p-5 animate-pulse">
                  <div className="h-5 w-20 bg-(--surface-hover) rounded-full mb-3" />
                  <div className="h-5 bg-(--surface-hover) rounded w-3/5 mb-2" />
                  <div className="h-3 bg-(--surface-hover) rounded w-full mb-1.5" />
                  <div className="h-3 bg-(--surface-hover) rounded w-4/5" />
                </div>
              ))}
            </div>
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
          <div className="flex flex-col gap-8 md:flex-row md:items-start">
            {/* A horizontal scroller under md (same buttons as the reference's sidebar, just laid out for a thumb);
                pinned in place as the page scrolls from md up. `sticky` and the list's own scrolling (20
                categories is taller than most viewports) deliberately live on two different elements, not one:
                combining them on a single element made a click on any button inside it escalate to scrolling
                the whole page, not just the list — a sticky element doesn't establish a proper scroll boundary
                of its own, so the browser's "bring the clicked thing into view" search kept walking past it to
                the document. This outer div only ever does the sticky pinning; the nav inside it only ever does
                the internal scroll (scrollbar hidden — still scrolls by wheel/touch/drag — same trick
                LiveFormPreview.tsx already uses for a scrollable preview stage). */}
            <div className="shrink-0 md:sticky md:top-28">
              <nav
                aria-label="Template categories"
                className="flex gap-2 overflow-x-auto pb-1 md:max-h-[calc(100vh-8rem)] md:w-56 md:flex-col md:gap-1 md:overflow-y-auto md:overflow-x-visible md:pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
              {categories.map((c) => {
                const Icon = c === "All" ? LayoutGrid : categoryIcon(c);
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => selectCategory(c)}
                    aria-pressed={active}
                    className={bx(
                      "flex min-h-10 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full border px-4 text-[13px] font-medium capitalize transition-colors",
                      "md:w-full md:rounded-lg md:border-transparent md:px-3",
                      active
                        ? "border-(--primary-500) bg-(--accent-soft) text-(--primary-700)"
                        : "border-(--border-default) bg-(--surface-card) text-(--text-secondary) hover:bg-(--surface-hover) md:bg-transparent"
                    )}
                  >
                    <Icon size={16} className="shrink-0" aria-hidden="true" />
                    {c}
                  </button>
                );
              })}
              </nav>
            </div>

            <div className="grid min-w-0 flex-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered?.map((template) => (
                <TemplateGalleryCard key={template._id} template={template} />
              ))}
            </div>
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
