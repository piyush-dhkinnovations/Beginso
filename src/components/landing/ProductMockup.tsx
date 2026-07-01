"use client";

import React from "react";
import { useTypingEffect } from "@/hooks/useTypingEffect";

export default function ProductMockup() {
  const field1 = useTypingEffect("John Doe", 600, 60);
  const field2 = useTypingEffect("john@example.com", 1800, 60);

  return (
    <div className="w-full max-w-2xl mx-auto mt-[-40px] mb-20 relative z-20 px-4">
      <div className="bg-white border border-neutral-200 rounded-lg shadow-xl p-6 md:p-8 animate-fade-up" style={{ animationDelay: "320ms", animationFillMode: "both" }}>
        <div className="flex items-center gap-2 mb-6 border-b border-neutral-100 pb-4">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-neutral-800">Full Name</label>
            <div className="h-[44px] px-3 py-2 border-2 border-neutral-200 rounded-md bg-neutral-50 flex items-center text-[13px] text-neutral-900 font-medium">
              {field1.displayedText}
              {field1.isTyping && <span className="animate-blink font-normal text-neutral-400">|</span>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-neutral-800">Email Address</label>
            <div className="h-[44px] px-3 py-2 border-2 border-neutral-200 rounded-md bg-neutral-50 flex items-center text-[13px] text-neutral-900 font-medium">
              {field2.displayedText}
              {field2.isTyping && <span className="animate-blink font-normal text-neutral-400">|</span>}
            </div>
          </div>

          <div className="pt-2">
            <div className="h-[44px] w-full bg-[#1D4ED8] rounded-md flex items-center justify-center text-white text-[13px] font-semibold opacity-90 cursor-not-allowed">
              Submit Form
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
