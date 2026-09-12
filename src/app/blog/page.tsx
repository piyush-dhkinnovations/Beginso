"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { BlogCard } from "@/components/landing/BlogCard";
import { BLOG_POSTS, type BlogCategory } from "@/lib/blogPosts";
import { useReveal } from "@/hooks/useReveal";
import { bx } from "@/lib/utils";

const CATEGORIES: ("All" | BlogCategory)[] = ["All", "Product", "Guide", "Changelog", "Engineering"];

export default function BlogListPage() {
  // Starts at "All" on both server and client — reading ?category= from window.location
  // straight into the initial state disagreed with the server-rendered "All" the moment
  // anyone landed here via a categorized link (Footer links to /blog?category=Changelog),
  // producing a hydration mismatch on the active tab, the filtered list, and the featured
  // card visibility. Synced from the URL in an effect instead, after hydration settles.
  const [category, setCategory] = useState<"All" | BlogCategory>("All");
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("category");
    if ((CATEGORIES as string[]).includes(value ?? "")) {
      // Reading the URL once on mount to seed state — same accepted pattern as
      // LoginForm.tsx's reason= check.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategory(value as BlogCategory);
    }
  }, []);
  const { ref: headerRef, visible: headerVisible } = useReveal<HTMLDivElement>();

  const [featured, ...rest] = BLOG_POSTS;
  const filtered = useMemo(
    () => (category === "All" ? rest : rest.filter((p) => p.category === category)),
    [category, rest]
  );

  return (
    <main className="min-h-screen bg-[var(--bg-page)]">
      <Navbar />

      <section className="pt-[140px] pb-16 md:pt-[180px] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={headerRef} className={`reveal ${headerVisible ? "is-visible" : ""} text-center max-w-2xl mx-auto mb-10`}>
          <h1 className="bg-h1 text-[var(--text-primary)] mb-3">What&apos;s new in Beginso</h1>
          <p className="bg-body-lg text-[var(--text-secondary)]">Product updates, guides and release notes.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-14">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={bx(
                "min-h-[36px] rounded-full border px-4 text-[13px] font-medium transition-colors",
                category === c
                  ? "border-[var(--primary-500)] bg-[var(--accent-soft)] text-[var(--primary-700)]"
                  : "border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {category === "All" && (
          <div className="mb-14">
            <BlogCard post={featured} />
          </div>
        )}

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <p className="text-center bg-body text-[var(--text-muted)] py-16">No posts in this category yet.</p>
        )}
      </section>

      <Footer />
    </main>
  );
}
