import { PolicyLayout } from "@/components/policy/PolicyLayout";
import { dpa } from "@/lib/policyContent";

export const metadata = {
  title: "Data Processing Agreement — Beginso",
  description: "The global customer DPA governing Beginso's processing of personal data on a customer's behalf.",
};

export default function DataProcessingAgreementPage() {
  return <PolicyLayout doc={dpa} />;
}
