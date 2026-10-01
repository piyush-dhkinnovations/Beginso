'use client';

import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { FormStatus } from '@/types/form';

export interface BuilderHeaderProps {
  formTitle: string;
  isSaving: boolean;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
  savedAt: Date | null;
  status: FormStatus;
  onTitleChange: (title: string) => void;
  onPreview: () => void;
  onBack: () => void;
  onPublish: () => void;
  onClose: () => void;
  onDelete: () => void;
}

export function BuilderHeader({
  formTitle,
  isSaving,
  saveState = 'idle',
  savedAt,
  status,
  onTitleChange,
  onPreview,
  onBack,
  onPublish,
  onClose,
  onDelete,
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
    <header className="flex items-center justify-between px-4 h-14 border-b bg-(--surface-card) shrink-0 shadow-(--shadow-sm)">
      <div className="flex items-center gap-2 flex-1 max-w-[30%]">
        <Button
          onClick={onBack}
          variant="ghost"
          size="small"
          className="min-h-11 min-w-11 shrink-0 p-2"
          title="Back to Forms"
        >
          <ArrowLeft size={16} />
        </Button>
        <input
          type="text"
          value={title ?? ''}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full bg-h5 font-bold text-(--text-primary) bg-transparent border-b-2 border-transparent focus:border-(--border-strong) focus:outline-none px-1 py-0.5 rounded transition-colors"
          placeholder="Untitled Form"
          aria-label="Form name"
        />
      </div>

      <div className="flex items-center gap-4 flex-1 justify-end">
        <div className="bg-body-sm select-none">
          {isSaving || saveState === 'saving' ? (
            <span className="text-(--text-muted) font-medium animate-pulse">Saving…</span>
          ) : saveState === 'saved' ? (
            <span className="text-(--success-text) font-medium">
              Saved{savedAt ? ` at ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' ✓'}
            </span>
          ) : saveState === 'error' ? (
            <span className="text-(--error-text) font-medium font-mono">⚠ Save failed</span>
          ) : null}
        </div>

        <Button
          onClick={onDelete}
          variant="ghost"
          size="small"
          className="h-11 w-11 shrink-0 p-0 text-(--error-text) hover:bg-(--error-surface) hover:text-(--error-text)"
          title="Delete form"
          aria-label="Delete form"
        >
          <Trash2 size={16} />
          <span className="sr-only">Delete</span>
        </Button>

        <Button
          onClick={onPreview}
          variant="ghost"
          size="small"
          className="flex items-center gap-1.5 px-3"
        >
          <Eye size={16} />
          <span>Preview</span>
        </Button>

        {status === 'published' ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-(--success-text) font-semibold bg-body-sm px-2">
              <CheckCircle2 size={15} />
              Published
            </span>
            <Button variant="secondary" size="small" onClick={onClose}>
              Close form
            </Button>
          </div>
        ) : (
          <Button variant="primary" size="small" onClick={onPublish}>
            {status === 'closed' ? 'Re-publish' : 'Publish'}
          </Button>
        )}
      </div>
    </header>
  );
}
