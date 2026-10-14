import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Template } from "@/types/form";
import { categoryTint } from "@/components/templates/TemplateCard";
import { TemplateThumb } from "@/components/templates/TemplateThumb";
import { IconArt } from "@/components/forms/FormIcon";
import { suggestFormIcon } from "@/lib/formIcons";

// A public-gallery card: a tinted preview of the template drawn in its own layout (TemplateThumb), then the template's colour
// icon beside its name, the description and the field count.
export function TemplateGalleryCard({ template }: { template: Template }) {
  const tint = categoryTint(template.category);
  const icon = suggestFormIcon(template.name);
  const count = template.fields.length;

  return (
    <Link
      href={`/discover-templates/${template._id}`}
      className="lift group flex flex-col overflow-hidden rounded-(--bg-radius-md) border border-(--border-default) bg-(--surface-card) transition-colors hover:bg-(--surface-hover)"
    >
      <div className="relative flex h-44 items-center justify-center px-4" style={{ background: `linear-gradient(135deg, ${tint.surface}, var(--bg-subtle))` }}>
        <span
          className="absolute left-3 top-3 inline-flex items-center rounded-full bg-(--surface-card) px-2.5 py-0.5 bg-caption font-semibold capitalize"
          style={{ color: tint.ink }}
        >
          {template.category}
        </span>
        <TemplateThumb template={template} ink={tint.ink} surface={tint.surface} />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          {icon && (
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-(--border-default) bg-white shadow-(--shadow-sm)">
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
