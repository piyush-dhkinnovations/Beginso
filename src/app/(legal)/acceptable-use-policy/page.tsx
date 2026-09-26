import { PolicyLayout } from "@/components/policy/PolicyLayout";
import { acceptableUse } from "@/lib/policyContent";

export const metadata = {
  title: "Acceptable Use Policy — Beginso",
  description: "Mandatory standards for lawful, safe and responsible use of the Beginso platform.",
};

export default function AcceptableUsePolicyPage() {
  return <PolicyLayout doc={acceptableUse} />;
}
