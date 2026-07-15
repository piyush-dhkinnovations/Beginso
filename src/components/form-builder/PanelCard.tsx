'use client';

export function PanelCard({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg shadow-card p-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-label text-neutral-500">{label}</span>
        <p className="text-body-sm text-neutral-500">{description}</p>
      </div>
      {children}
    </div>
  );
}
