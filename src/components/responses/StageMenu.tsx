'use client';

import { Check, ChevronDown } from 'lucide-react';
import { Menu } from '@/components/ui/Menu';
import { StageBadge } from './StageBadge';
import type { IResponse } from '@/types/response';
import type { StageRef } from '@/types/stage';

interface StageMenuProps {
  response: IResponse;
  /** The stages this response can move to: its form's own, else the workspace's. */
  stages: readonly StageRef[];
  /** Called with the response and the stage chosen (never the stage it is already in). */
  onChange: (responseId: string, stageId: string) => void;
}

/**
 * The stage badge in a table row, as a button: press it, pick another stage, and the response moves without being opened. The
 * response's own stage is ticked, and picking it again changes nothing.
 */
export function StageMenu({ response, stages, onChange }: StageMenuProps) {
  const currentId = response.stage?.id ?? response.status ?? '';
  const current = stages.find((s) => s.id === currentId)?.name ?? response.stage?.name ?? 'No stage';
  return (
    <Menu
      triggerLabel={`Stage: ${current}. Press to change it.`}
      triggerClassName="inline-flex items-center gap-1 rounded-full border-0 bg-transparent p-0 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-(--border-focus)"
      trigger={
        <>
          <StageBadge stage={response.stage} status={response.status} />
          <ChevronDown size={12} className="text-(--text-muted)" aria-hidden="true" />
        </>
      }
      items={stages.map((s) => ({
        id: s.id,
        label: s.name,
        icon: s.id === currentId ? <Check size={14} aria-hidden="true" /> : <span className="inline-block w-3.5" />,
        onSelect: () => {
          if (s.id !== currentId) onChange(response._id, s.id);
        },
      }))}
    />
  );
}
