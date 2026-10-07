import { notFound } from "next/navigation";
import { V2Gallery } from "@/components/dev/v2/V2Gallery";

// Developer prototype, not a shipped page - same non-production gate as /dev/ui.
export default function DevUiV2Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <V2Gallery />;
}
