'use client';

import React, { useState, useEffect } from 'react';
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
  const [title, setTitle] = useState(formTitle);

  useEffect(() => {
    setTitle(formTitle);
  }, [formTitle]);

  const handleBlur = () => {
    if (title.trim() && title !== formTitle) {
      onTitleChange(title);
    } else {
      setTitle(formTitle);
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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full text-heading-2 font-bold text-neutral-900 bg-transparent border-b-2 border-transparent focus:border-neutral-500 focus:outline-none px-1 py-0.5 rounded transition-colors"
          placeholder="Untitled Form"
        />
      </div>

      {/* Centre Section: Undo / Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          type="button"
          className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-[6px] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="Undo"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          type="button"
          className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-[6px] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="Redo"
        >
          <Redo2 size={16} />
        </button>
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
        <button
          onClick={onPreview}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-body-sm font-semibold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-[6px] transition-all"
        >
          <Eye size={16} />
          <span>Preview</span>
        </button>

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
