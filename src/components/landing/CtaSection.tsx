import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function CtaSection() {
  return (
    <section className="bg-brand-700 py-20 md:py-24 text-center">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-display text-white mb-6">
          Ready to build your first form?
        </h2>
        <p className="text-[18px] font-[400] text-white/90 mb-10 max-w-2xl mx-auto">
          Join thousands of teams who use Onboarding Platform to collect, manage, and analyze their data securely.
        </p>
        <Link href="/signup">
          <Button 
            className="h-[48px] px-10 text-[15px] bg-white text-brand-700 hover:bg-neutral-100 hover:text-brand-900 border-none shadow-md"
          >
            Start for free
          </Button>
        </Link>
      </div>
    </section>
  );
}
