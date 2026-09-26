import { PolicyLayout } from "@/components/policy/PolicyLayout";
import { privacy } from "@/lib/policyContent";

export const metadata = {
  title: "Privacy Policy — Beginso",
  description: "How Beginso collects, uses, stores and discloses personal data across the platform.",
};

export default function PrivacyPage() {
  return <PolicyLayout doc={privacy} />;
}
