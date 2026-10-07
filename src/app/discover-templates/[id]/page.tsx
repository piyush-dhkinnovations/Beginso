"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PublicFormShell } from "@/components/public-form/PublicFormShell";
import { usePublicTemplates } from "@/hooks/usePublicTemplates";
import { templateToPreviewSchema, templatePreviewSlug } from "@/lib/templatePreview";
import { useAuth } from "@/hooks/useAuth";

export default function TemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: templates, isLoading } = usePublicTemplates();
  const template = templates?.find((t) => t._id === params.id);
  // src/proxy.ts redirects an unauthenticated visit to a protected route to a bare `/login` with
  // no `?next=` preserved (unlike the invite-link flow, which isn't proxy-protected and decides
  // its own redirect client-side) — so linking straight to /templates/apply/{id} and trusting
  // proxy.ts to send an anonymous visitor onward with the template intent intact does not work.
  // Checking auth here and choosing the link explicitly is the fix.
  const { isAuthenticated } = useAuth();
  const useTemplateHref = isAuthenticated
    ? `/templates/apply/${template?._id}`
    : `/signup?next=${encodeURIComponent(`/templates/apply/${template?._id}`)}`;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[var(--bg-page)]">
        <Navbar />
        <div className="pt-[160px] pb-24 text-center max-w-xl mx-auto px-4">
          <p className="bg-body text-[var(--text-muted)]">Loading template…</p>
        </div>
        <Footer />
      </main>
    );
  }

  if (!template) {
    return (
      <main className="min-h-screen bg-[var(--bg-page)]">
        <Navbar />
        <div className="pt-[160px] pb-24 text-center max-w-xl mx-auto px-4">
          <h1 className="bg-h2 text-[var(--text-primary)] mb-4">Template not found</h1>
          <Link href="/discover-templates" className="text-[var(--primary-600)] font-medium hover:underline">
            Back to templates
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  const schema = templateToPreviewSchema(template);

  return (
    <main className="min-h-screen bg-[var(--bg-page)]">
      <Navbar />

      <article className="pt-[140px] pb-24 md:pt-[180px]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 bg-caption text-[var(--text-muted)] mb-6">
            <Link href="/discover-templates" className="hover:text-[var(--text-primary)]">Templates</Link>
            <ChevronRight size={12} />
            <span className="text-[var(--text-secondary)] truncate">{template.name}</span>
          </nav>

          <Badge variant="primary" pill className="mb-3 capitalize">{template.category}</Badge>
          <h1 className="text-[28px] md:text-[40px] font-extrabold text-[var(--text-primary)] leading-[1.15] mb-4">
            {template.name}
          </h1>
          <p className="bg-body-lg text-[var(--text-secondary)] mb-8 max-w-[65ch]">
            {template.description || "A ready-made starting point you can customize after signing up."}
          </p>

          <Link href={useTemplateHref}>
            <Button variant="primary" className="mb-10">Use this template</Button>
          </Link>

          <div className="bg-overline text-[var(--text-muted)] mb-4">Preview — try it out, nothing is submitted</div>
        </div>

        <PublicFormShell schema={schema} slug={templatePreviewSlug(template._id)} previewMode />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 text-center">
          <Link href={useTemplateHref}>
            <Button variant="primary">Use this template</Button>
          </Link>
        </div>
      </article>

      <Footer />
    </main>
  );
}
