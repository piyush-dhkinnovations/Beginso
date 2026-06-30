import React from "react";

export default function StatsBar() {
  const stats = [
    { metric: "10", label: "field types" },
    { metric: "Auto", label: "dashboard" },
    { metric: "CSV + PDF", label: "export" },
  ];

  return (
    <div className="bg-neutral-50 border-y border-neutral-200 py-10 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-center items-center gap-10 md:gap-32">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-display text-neutral-900 mb-1">{stat.metric}</div>
              <div className="text-body-sm text-neutral-500 uppercase tracking-wider font-semibold">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
