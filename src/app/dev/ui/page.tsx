import { notFound } from "next/navigation";
import { UiGalleryShell } from "@/components/dev/UiGalleryShell";

// Developer tool, not a shipped page — gated to non-production builds per requirements.md 3.1.
export default function DevUiGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <UiGalleryShell />;
}
