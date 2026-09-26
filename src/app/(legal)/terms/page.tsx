import { PolicyLayout } from "@/components/policy/PolicyLayout";
import { terms } from "@/lib/policyContent";

export const metadata = {
  title: "Terms of Use — Beginso",
  description: "The Terms of Use governing access to and use of the Beginso platform.",
};

export default function TermsPage() {
  return <PolicyLayout doc={terms} />;
}
