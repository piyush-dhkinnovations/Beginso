'use client';

import React, { useState } from 'react';
import { Undo2, Redo2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface BuilderHeaderProps {
  formTitle: string;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
  onTitleChange: (title: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onPreview: () => void;
}

export function BuilderHeader({
  formTitle,
  canUndo,
  canRedo,
  isSaving,
  saveState = 'idle',
  onTitleChange,
  onUndo,
  onRedo,
  onPreview,
}: BuilderHeaderProps) {
  const [title, setTitle] = useState(formTitle || '');
  const [prevFormTitle, setPrevFormTitle] = useState<string | undefined>(formTitle);

  if (formTitle !== prevFormTitle) {
    setPrevFormTitle(formTitle);
    setTitle(formTitle || '');
  }

  const handleBlur = () => {
    if ((title || '').trim() && title !== formTitle) {
      onTitleChange(title);
    } else {
      setTitle(formTitle || '');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <header className="flex items-center justify-between px-4 h-14 border-b bg-white shrink-0 shadow-sm">
      {/* Left Section: Editable Title */}
      <div className="flex items-center gap-3 flex-1 max-w-[30%]">
        <input
          type="text"
          value={title ?? ''}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full text-heading-2 font-bold text-neutral-900 bg-transparent border-b-2 border-transparent focus:border-neutral-500 focus:outline-none px-1 py-0.5 rounded transition-colors"
          placeholder="Untitled Form"
        />
      </div>

      {/* Centre Section: Undo / Redo */}
      <div className="flex items-center gap-1">
        <Button
          onClick={onUndo}
          disabled={!canUndo}
          variant="ghost"
          size="small"
          className="p-2 min-h-[36px] min-w-[36px]"
          title="Undo"
        >
          <Undo2 size={16} />
        </Button>
        <Button
          onClick={onRedo}
          disabled={!canRedo}
          variant="ghost"
          size="small"
          className="p-2 min-h-[36px] min-w-[36px]"
          title="Redo"
        >
          <Redo2 size={16} />
        </Button>
      </div>

      {/* Right Section: Save State Indicator & Preview/Publish */}
      <div className="flex items-center gap-4 flex-1 justify-end">
        {/* Save State Label */}
        <div className="text-body-sm select-none">
          {isSaving || saveState === 'saving' ? (
            <span className="text-neutral-500 font-medium animate-pulse">Saving…</span>
          ) : saveState === 'saved' ? (
            <span className="text-emerald-600 font-medium">Saved ✓</span>
          ) : saveState === 'error' ? (
            <span className="text-rose-600 font-medium font-mono">⚠ Save failed</span>
          ) : null}
        </div>

        {/* Action Buttons */}
        <Button
          onClick={onPreview}
          variant="ghost"
          size="small"
          className="flex items-center gap-1.5 px-3"
        >
          <Eye size={16} />
          <span>Preview</span>
        </Button>

        <Button
          variant="secondary"
          size="small"
          disabled
          className="cursor-not-allowed bg-neutral-100 border-neutral-200 text-neutral-400 font-medium"
        >
          Publish
        </Button>
      </div>
    </header>
  );
}
