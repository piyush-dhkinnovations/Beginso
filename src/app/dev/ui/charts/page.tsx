import { notFound } from "next/navigation";
import { ChartCardGallery } from "@/components/dev/ChartCardGallery";

// Design preview, not a shipped page — non-production only, like /dev/ui.
export default function ChartCardGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ChartCardGallery />;
}
