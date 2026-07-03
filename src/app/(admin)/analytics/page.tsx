'use client';

import React from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card } from '@/components/ui/Card';

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-fade-in">
      <DashboardHeader 
        title="Analytics" 
        subtitle="Inspect graphs and performance metrics."
      />
      <Card className="flex flex-col items-center justify-center p-12 text-center bg-neutral-50/50">
        <h2 className="text-heading-2 font-bold text-neutral-800">Auto Analytics Dashboard</h2>
        <p className="text-body text-neutral-500 max-w-md mt-2">
          This area is scheduled for development in Sprint 2. Performance charts, response rates, and completion stats will display here.
        </p>
      </Card>
    </div>
  );
}
