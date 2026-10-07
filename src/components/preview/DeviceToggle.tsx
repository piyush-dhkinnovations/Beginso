'use client';

import { Tabs } from '@/components/ui/Tabs';

// Sprint 13 (CF2.10 / CF2.7): shared by the preview bar and the layout gallery's preview. A `Tabs`
// so it is arrow-key operable for free.
export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

export const DEVICE_WIDTH: Record<PreviewDevice, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
};

const DEVICE_TABS = [
  { id: 'desktop', label: 'Desktop' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'mobile', label: 'Mobile' },
];

export interface DeviceToggleProps {
  device: PreviewDevice;
  onChange: (device: PreviewDevice) => void;
  className?: string;
}

export function DeviceToggle({ device, onChange, className }: DeviceToggleProps) {
  return (
    <Tabs
      tabs={DEVICE_TABS}
      activeId={device}
      onChange={(id) => onChange(id as PreviewDevice)}
      ariaLabel="Preview device"
      className={className}
    />
  );
}
