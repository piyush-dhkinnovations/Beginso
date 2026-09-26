import { PolicyLayout } from "@/components/policy/PolicyLayout";
import { fairUse } from "@/lib/policyContent";

export const metadata = {
  title: "Free Tier & Fair Use Policy — Beginso",
  description: "Rules governing free, trial, beta and promotional access to the Beginso platform.",
};

export default function FairUsePolicyPage() {
  return <PolicyLayout doc={fairUse} />;
}
