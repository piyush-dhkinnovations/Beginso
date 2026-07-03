'use client';

import React from 'react';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-1 pb-4 border-b border-neutral-200">
      <h1 className="text-heading-1 text-neutral-900 font-bold">{title}</h1>
      {subtitle && <p className="text-body text-neutral-500">{subtitle}</p>}
    </div>
  );
}
