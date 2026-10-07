"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";
import { BLOG_POSTS } from "@/lib/blogPosts";
import { BlogCard } from "./BlogCard";

export default function BlogSection() {
  const { ref: headingRef, visible: headingVisible } = useReveal<HTMLDivElement>();

  return (
    <section id="blog" className="py-14 md:py-[72px] lg:py-24 bg-(--surface-card)">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={headingRef}
          className={`reveal ${headingVisible ? "is-visible" : ""} flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 md:mb-12`}
        >
          <div>
            <div className="bg-overline text-(--text-link) mb-3">Blog</div>
            <h2 className="bg-h2 text-(--text-primary)">What&apos;s new in Beginso</h2>
          </div>
          <Link
            href="/blog"
            className="inline-flex min-h-11 items-center gap-1.5 bg-body-sm font-semibold text-(--text-link) hover:text-(--accent-soft-text) shrink-0"
          >
            View all posts
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {BLOG_POSTS.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
