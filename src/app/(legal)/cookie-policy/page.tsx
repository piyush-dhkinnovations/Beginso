import { PolicyLayout } from "@/components/policy/PolicyLayout";
import { cookiePolicy } from "@/lib/policyContent";

export const metadata = {
  title: "Cookie Policy — Beginso",
  description: "How Beginso uses cookies and similar technologies across the platform and websites.",
};

export default function CookiePolicyPage() {
  return <PolicyLayout doc={cookiePolicy} />;
}
