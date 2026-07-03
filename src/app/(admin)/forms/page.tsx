'use client';

import React from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card } from '@/components/ui/Card';

export default function FormsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-fade-in">
      <DashboardHeader
        title="Forms"
        subtitle="Manage, build, and configure Beginso form pipelines."
      />
      <Card className="flex flex-col items-center justify-center p-12 text-center bg-neutral-50/50">
        <h2 className="text-heading-2 font-bold text-neutral-800">Forms Builder & Manager</h2>
        <p className="text-body text-neutral-500 max-w-md mt-2">
          This area is scheduled for development in Sprint 2. You will be able to drag-and-drop elements to create forms, set themes, and publish them.
        </p>
      </Card>
    </div>
  );
}
