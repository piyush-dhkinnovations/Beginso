import React from "react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-display text-neutral-900 font-bold">Settings</h1>
        <p className="text-body text-neutral-500">Configure workspace, security, and account preferences.</p>
      </div>

      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-8 text-center flex flex-col items-center justify-center gap-4">
        <h2 className="text-heading-1 text-neutral-800">Workspace Settings coming soon — Sprint 2</h2>
        <p className="text-body text-neutral-600 max-w-md">
          This placeholder page will be replaced in Sprint 2 with workspace configuration, brand colors, custom themes, and profile edits.
        </p>
      </div>
    </div>
  );
}
