import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Template } from "@/types/form";
import { TemplateThumb } from "@/components/templates/TemplateThumb";
import { IconArt } from "@/components/forms/FormIcon";
import { suggestFormIcon } from "@/lib/formIcons";
import { templateHref } from "@/lib/templateSlug";

// A public-gallery card: a real miniature of the template's own branded form (TemplateThumb) — no badge overlaid on
// top of it, so nothing competes with the form's own real title and cover. Category is still how the sidebar filters,
// just not repeated on every card once the card already shows the real thing.
export function TemplateGalleryCard({ template }: { template: Template }) {
  const icon = suggestFormIcon(template.name);
  const count = template.fields.length;

  return (
    <Link
      href={templateHref(template)}
      className="lift group flex flex-col overflow-hidden rounded-(--bg-radius-md) border border-(--border-default) bg-(--surface-card) transition-colors hover:bg-(--surface-hover)"
    >
      <TemplateThumb template={template} />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          {icon && (
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-(--border-default) bg-(--surface-art) shadow-(--shadow-sm)">
              <IconArt icon={icon} size={28} />
            </span>
          )}
          <h3 className="bg-h5 min-w-0 text-(--text-primary)">{template.name}</h3>
        </div>
        {/* Backend fixed missing `description` on live templates same day it was found (26 Sep
            2026) — fallback kept as defense-in-depth, not because the gap is still open. */}
        <p className="bg-body-sm flex-1 text-(--text-secondary)">
          {template.description || "A ready-made starting point you can customize."}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-(--text-muted)">
            {count} {count === 1 ? "field" : "fields"}
          </span>
          <span className="inline-flex items-center gap-1 bg-body-sm font-semibold text-(--accent-soft-text)">
            Preview
            <ArrowRight size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
