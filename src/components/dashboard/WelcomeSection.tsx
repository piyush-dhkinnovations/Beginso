'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';

export function WelcomeSection() {
  const { user } = useAuth();
  const userName = user?.name;

  return (
    <div className="bg-neutral-50 rounded-lg p-6 border border-neutral-200">
      <h2 className="text-heading-2 text-neutral-900 font-bold">
        {userName ? `Welcome back, ${userName}!` : 'Welcome back!'}
      </h2>
      <p className="text-body text-neutral-600 mt-1">
        Here is the current overview of your Beingso pipelines and forms.
      </p>
    </div>
  );
}
