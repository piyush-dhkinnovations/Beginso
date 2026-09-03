import { notFound } from "next/navigation";
import { UiGalleryContent } from "@/components/dev/UiGalleryContent";

// The gallery's preview pane, loaded in an <iframe> by UiGalleryShell so beginso-ui.css's
// real @media (max-width: ...) breakpoints (not just container width) respond to the
// selected 375/768/1280 width — a wrapping div's width alone wouldn't trigger them.
// Same production gate as the parent route; also unreachable directly for the same reason.
export default function DevUiGalleryFramePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <UiGalleryContent />;
}
