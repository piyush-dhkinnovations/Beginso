import React from "react";
import { Wordmark } from "@/components/landing/Wordmark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="w-full max-w-[440px] flex flex-col gap-6">
        <div className="flex justify-center">
          {/* This card is always on a light surface (bg-neutral-50, no dark variant), so the
              logo is forced light rather than left to auto-swap with the global theme. */}
          <Wordmark force="light" height={32} />
        </div>
        {children}
      </div>
    </div>
  );
}
