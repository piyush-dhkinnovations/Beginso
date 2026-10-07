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
    <div className="bg-(--surface-card) border border-(--border-default) rounded-lg shadow-(--shadow-sm) p-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="bg-overline text-(--text-muted)">{label}</span>
        <p className="bg-body-sm text-(--text-muted)">{description}</p>
      </div>
      {children}
    </div>
  );
}
