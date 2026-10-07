"use client";

import Link from "next/link";
import { ChevronRight, Link2 } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { PolicyMarkdown } from "./PolicyMarkdown";
import { ScrollNav } from "./ScrollNav";
import { ALL_POLICIES, type PolicyDoc } from "@/lib/policyContent";

export function PolicyLayout({ doc }: { doc: PolicyDoc }) {
  const otherPolicies = ALL_POLICIES.filter((p) => p.slug !== doc.slug);

  return (
    <main className="min-h-screen bg-(--bg-page)">
      <Navbar />

      <article className="pt-[140px] pb-24 md:pt-[180px]">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 bg-caption text-(--text-muted) mb-6">
            <Link href="/" className="hover:text-(--text-primary)">Beginso</Link>
            <ChevronRight size={12} />
            <span className="text-(--text-secondary)">{doc.shortTitle}</span>
          </nav>

          <h1 className="text-[28px] md:text-[40px] font-extrabold text-(--text-primary) leading-[1.15] mb-4">
            {doc.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2 mb-8">
            <Badge variant="neutral">Effective {doc.effectiveDate}</Badge>
            {doc.lastUpdated !== doc.effectiveDate && <Badge variant="neutral">Updated {doc.lastUpdated}</Badge>}
            <Button
              variant="ghost"
              size="small"
              className="gap-1.5 ml-auto"
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

          {doc.notice && (
            <Alert variant="info" title="Please read carefully" className="mb-10">
              {doc.notice}
            </Alert>
          )}

          <PolicyMarkdown content={doc.content} />
        </div>

        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-(--border-default)">
          <div className="bg-overline text-(--text-muted) mb-4">Related legal documents</div>
          <div className="flex flex-wrap gap-2">
            {otherPolicies.map((p) => (
              <Link key={p.slug} href={`/${p.slug}`}>
                <Badge variant="outline" className="cursor-pointer hover:bg-(--surface-hover)">
                  {p.title}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      </article>

      <Footer />
      <ScrollNav />
    </main>
  );
}
