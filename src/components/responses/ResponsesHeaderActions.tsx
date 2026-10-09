'use client';

import { Button } from '@/components/ui/Button';
import { SavedViewSelect } from './SavedViewSelect';
import type { ComponentProps } from 'react';

type SavedViewSelectProps = ComponentProps<typeof SavedViewSelect>;

interface Props extends SavedViewSelectProps {
  isWorkspace: boolean;
  canExport: boolean;
  onExport: () => void;
  onSaveView: () => void;
}

/** Saved-view picker + Export + Save view; `undefined` content (nothing to show) is the caller's call. */
export function ResponsesHeaderActions({ isWorkspace, canExport, onExport, onSaveView, ...savedViewSelectProps }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {isWorkspace && <SavedViewSelect {...savedViewSelectProps} />}
      {canExport && (
        <Button variant="secondary" size="small" onClick={onExport}>
          Export
        </Button>
      )}
      {isWorkspace && (
        <Button variant="primary" size="small" onClick={onSaveView}>
          Save view
        </Button>
      )}
    </div>
  );
}
