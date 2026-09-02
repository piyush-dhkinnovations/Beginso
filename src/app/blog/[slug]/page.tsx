"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Link2 } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { BlogCard, BlogCover } from "@/components/landing/BlogCard";
import { AuthorAvatar } from "@/components/landing/AuthorAvatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getPostBySlug, getRelatedPosts } from "@/lib/blogPosts";
import { useReveal } from "@/hooks/useReveal";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function TableOfContents({ headings }: { headings: string[] }) {
  return (
    <ul className="space-y-2">
      {headings.map((h, i) => (
        <li key={h}>
          <a
            href={`#section-${i}`}
            className="block text-[13px] text-[var(--text-secondary)] hover:text-[var(--primary-600)] transition-colors"
          >
            {h}
          </a>
        </li>
      ))}
    </ul>
  );
}

function RelatedCard({ index, post }: { index: number; post: ReturnType<typeof getRelatedPosts>[number] }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal-up ${visible ? "is-visible" : ""}`} style={{ "--reveal-delay": `${index * 80}ms` } as React.CSSProperties}>
      <BlogCard post={post} />
    </div>
  );
}

export default function BlogArticlePage() {
  const params = useParams<{ slug: string }>();
  const post = getPostBySlug(params.slug);
  const { ref: titleRef, visible: titleVisible } = useReveal<HTMLHeadingElement>();

  if (!post) {
    return (
      <main className="min-h-screen bg-[var(--bg-page)]">
        <Navbar />
        <div className="pt-[160px] pb-24 text-center max-w-xl mx-auto px-4">
          <h1 className="bg-h2 text-[var(--text-primary)] mb-4">Post not found</h1>
          <Link href="/blog" className="text-[var(--primary-600)] font-medium hover:underline">
            Back to the blog
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  const headings = post.body.map((section) => section.heading);
  const related = getRelatedPosts(post.slug);

  return (
    <main className="min-h-screen bg-[var(--bg-page)]">
      <Navbar />

      <article className="pt-[140px] pb-24 md:pt-[180px]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 bg-caption text-[var(--text-muted)] mb-6">
            <Link href="/blog" className="hover:text-[var(--text-primary)]">Blog</Link>
            <ChevronRight size={12} />
            <span>{post.category}</span>
            <ChevronRight size={12} />
            <span className="text-[var(--text-secondary)] truncate">{post.title}</span>
          </nav>

          <h1
            ref={titleRef}
            className={`reveal ${titleVisible ? "is-visible" : ""} text-[28px] md:text-[40px] font-extrabold text-[var(--text-primary)] leading-[1.15] mb-6`}
          >
            {post.title}
          </h1>

          <div className="flex items-center gap-3 mb-8">
            <AuthorAvatar name={post.author} size={24} />
            <div>
              <div className="text-[14px] font-medium text-[var(--text-primary)]">{post.author}</div>
              <div className="text-[12px] text-[var(--text-muted)]">
                {formatDate(post.date)} · {post.readTime}
              </div>
            </div>
          </div>

          <BlogCover post={post} className="h-64 md:h-80 rounded-[var(--bg-radius-md)] mb-10" />

          <details className="lg:hidden mb-8 rounded-[var(--bg-radius-md)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
            <summary className="cursor-pointer bg-body font-semibold text-[var(--text-primary)]">On this page</summary>
            <div className="mt-3">
              <TableOfContents headings={headings} />
            </div>
          </details>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[200px_1fr] gap-12">
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <div className="bg-overline text-[var(--text-muted)] mb-3">On this page</div>
              <TableOfContents headings={headings} />
            </div>
          </aside>

          <div className="max-w-[65ch]">
            {post.body.map((section, i) => (
              <section key={section.heading} id={`section-${i}`} className="mb-8 scroll-mt-28">
                <h2 className="bg-h3 text-[var(--text-primary)] mb-3">{section.heading}</h2>
                {section.paragraphs.map((p, pi) => (
                  <p key={pi} className="bg-body text-[var(--text-secondary)] mb-4 leading-relaxed">
                    {p}
                  </p>
                ))}
              </section>
            ))}

            <div className="flex items-center gap-3 py-6 border-y border-[var(--border-default)] my-10">
              <span className="bg-body-sm font-medium text-[var(--text-secondary)]">Share this post</span>
              <Button
                variant="ghost"
                size="small"
                className="gap-1.5"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard?.writeText(window.location.href).catch(() => {});
                  }
                }}
              >
                <Link2 size={14} />
                Copy link
              </Button>
            </div>

            <div className="flex items-center gap-4 rounded-[var(--bg-radius-md)] border border-[var(--border-default)] bg-[var(--surface-hover)] p-5">
              <AuthorAvatar name={post.author} size={40} />
              <div>
                <div className="bg-body font-semibold text-[var(--text-primary)]">{post.author}</div>
                <div className="bg-body-sm text-[var(--text-secondary)]">Writes about forms, data and workflow at Beginso.</div>
              </div>
              <Badge variant="primary" className="ml-auto shrink-0">{post.category}</Badge>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
            <h2 className="bg-h4 text-[var(--text-primary)] mb-6">Related posts</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((p, i) => (
                <RelatedCard key={p.slug} index={i} post={p} />
              ))}
            </div>
          </div>
        )}
      </article>

      <Footer />
    </main>
  );
}
