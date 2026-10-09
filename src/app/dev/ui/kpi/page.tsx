import { notFound } from "next/navigation";
import { KpiCardGallery } from "@/components/dev/KpiCardGallery";

// Design preview, not a shipped page — non-production only, like /dev/ui.
export default function KpiCardGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <KpiCardGallery />;
}
