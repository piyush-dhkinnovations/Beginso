import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Badge } from "@/components/ui/Badge";
import { ALL_POLICIES } from "@/lib/policyContent";

export const metadata = {
  title: "Legal — Beginso",
  description: "Terms, privacy, cookies and the other legal documents governing use of Beginso.",
};

export default function LegalIndexPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-page)]">
      <Navbar />

      <section className="pt-[140px] pb-24 md:pt-[180px] max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h1 className="bg-h1 text-[var(--text-primary)] mb-3">Legal</h1>
          <p className="bg-body-lg text-[var(--text-secondary)]">
            The agreements and policies that govern access to and use of the Beginso platform.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {ALL_POLICIES.map((doc) => (
            <Link
              key={doc.slug}
              href={`/${doc.slug}`}
              className="group flex items-center justify-between gap-4 rounded-[var(--bg-radius-md)] border border-[var(--border-default)] bg-[var(--surface-card)] px-5 py-4 hover:bg-[var(--surface-hover)] transition-colors"
            >
              <div>
                <div className="bg-body font-semibold text-[var(--text-primary)]">{doc.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="neutral">Updated {doc.lastUpdated}</Badge>
                </div>
              </div>
              <ChevronRight size={18} className="shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
