import { bx } from "@/lib/utils";

export interface SegmentedOption {
  id: string;
  label: string;
}

export interface SegmentedProps {
  options: SegmentedOption[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
}

// View switcher (Table · Board · Calendar · Chart). beginso-ui.css "Segmented control".
export function Segmented({ options, value, onChange, ariaLabel, className }: SegmentedProps) {
  return (
    <div role="group" aria-label={ariaLabel} className={bx("bg-segmented", className)}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
