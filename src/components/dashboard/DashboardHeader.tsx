'use client';


interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function DashboardHeader({ title, subtitle, children }: DashboardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-200">
      <div className="flex flex-col gap-1">
        <h1 className="text-heading-1 text-neutral-900 font-bold">{title}</h1>
        {subtitle && <p className="text-body text-neutral-500">{subtitle}</p>}
      </div>
      {children && (
        <div className="shrink-0 mt-1">
          {children}
        </div>
      )}
    </div>
  );
}
