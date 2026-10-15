"use client";

import { ChevronDown } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";

const FAQS = [
  {
    q: "Do respondents need an account?",
    a: "No. They open the link and fill it in. Nothing to sign up for and nothing to install.",
  },
  {
    q: "What happens after someone submits?",
    a: "The response lands in your inbox with a status. Assign it, tag it, move it through your stages, and the dashboard updates automatically.",
  },
  {
    q: "Can I embed a form on my own site?",
    a: "Yes. Every published form gives you a link, an iframe snippet and a QR code. Width, height and display options are configurable.",
  },
  {
    q: "How big can uploaded files be?",
    a: "Up to 25 MB per file. File type and size are validated on upload, and every file is scoped to the workspace that owns the form.",
  },
  {
    q: "Do you store IP addresses?",
    a: "No. Every address is hashed before it is stored. Raw IPs are never saved.",
  },
  {
    q: "Is it free?",
    a: "Every account starts with 500 MB of storage and can own up to 10 workspaces. You do not need a card to start.",
  },
  {
    q: "Can I export my data?",
    a: "Any time. CSV or PDF, and the export respects whatever filter is applied to the view.",
  },
];

export default function FaqSection() {
  const { ref: headingRef, visible: headingVisible } = useReveal<HTMLDivElement>();

  return (
    <section id="faq" className="py-14 md:py-[72px] lg:py-24 bg-(--bg-subtle) border-t border-(--border-default)">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={headingRef} className={`reveal ${headingVisible ? "is-visible" : ""} text-center mb-8 md:mb-12`}>
          <h2 className="bg-h2 text-(--text-primary)">Questions, answered</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-4">
          {FAQS.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-(--bg-radius-md) border border-(--border-default) bg-(--surface-card) p-5"
            >
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none bg-body font-semibold text-(--text-primary)">
                {faq.q}
                <ChevronDown size={18} className="shrink-0 text-(--text-muted) transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="bg-body-sm text-(--text-secondary) mt-3">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
