import Link from "next/link";
import type { Template } from "@/types/form";
import { Badge } from "@/components/ui/Badge";

export function TemplateGalleryCard({ template }: { template: Template }) {
  return (
    <Link
      href={`/discover-templates/${template._id}`}
      className="lift block rounded-[var(--bg-radius-md)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5 hover:bg-[var(--surface-hover)] transition-colors"
    >
      <Badge variant="primary" pill className="mb-3 capitalize">
        {template.category}
      </Badge>
      <h3 className="bg-h5 text-[var(--text-primary)] mb-2">{template.name}</h3>
      {/* Backend fixed missing `description` on live templates same day it was found (26 Sep
          2026) — fallback kept as defense-in-depth, not because the gap is still open. */}
      <p className="bg-body-sm text-[var(--text-secondary)] mb-4">
        {template.description || "A ready-made starting point you can customize."}
      </p>
      <span className="text-[12px] font-medium text-[var(--text-muted)]">
        {template.fields.length} {template.fields.length === 1 ? "field" : "fields"}
      </span>
    </Link>
  );
}
