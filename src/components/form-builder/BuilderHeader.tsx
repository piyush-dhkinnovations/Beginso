'use client';

import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Menu, type MenuItem } from '@/components/ui/Menu';
import { SaveIndicator } from './SaveIndicator';
import type { FormStatus } from '@/types/form';

export interface BuilderHeaderProps {
  formTitle: string;
  dirty: boolean;
  isSaving: boolean;
  saveFailed: boolean;
  savedAt: Date | null;
  onRetrySave: () => void;
  /** The caller may publish (Owner/Admin). Without it there is no Publish button — a convenience; the server enforces. */
  canPublish: boolean;
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
  dirty,
  isSaving,
  saveFailed,
  savedAt,
  onRetrySave,
  canPublish,
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

  // Sprint 13 (CF2.12): the header works at phone width. Below md it wraps — title + actions on the
  // first row, the save indicator on its own row — Preview is icon-only, and Close/Delete live in an
  // overflow menu at every width so nothing is squeezed off-screen or silently missing.
  const overflowItems: MenuItem[] = [
    ...(status === 'published' ? [{ id: 'close', label: 'Close form', onSelect: onClose }] : []),
    { id: 'delete', label: 'Delete form', onSelect: onDelete, danger: true },
  ];

  return (
    <header className="flex flex-wrap items-center gap-x-2 gap-y-0 px-4 min-h-14 border-b bg-(--surface-card) shrink-0 shadow-(--shadow-sm)">
      <div className="flex items-center gap-2 flex-1 min-w-0 md:max-w-[30%]">
        <Button
          onClick={onBack}
          variant="ghost"
          size="small"
          className="min-h-11 min-w-11 shrink-0 p-2"
          title="Back to Forms"
          aria-label="Back to Forms"
        >
          <ArrowLeft size={16} />
        </Button>
        <input
          type="text"
          value={title ?? ''}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full min-w-0 bg-h5 font-bold text-(--text-primary) bg-transparent border-b-2 border-transparent focus:border-(--border-strong) focus:outline-none px-1 py-0.5 rounded transition-colors"
          placeholder="Untitled Form"
          aria-label="Form name"
        />
      </div>

      {/* One SaveIndicator instance (one live region): its own row below md, inline from md up. */}
      <div className="order-last w-full pb-1 md:order-none md:ml-auto md:w-auto md:pb-0">
        <SaveIndicator dirty={dirty} saving={isSaving} error={saveFailed} savedAt={savedAt} onRetry={onRetrySave} />
      </div>

      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        <Button
          onClick={onPreview}
          variant="ghost"
          size="small"
          className="flex min-h-11 min-w-11 items-center gap-1.5 px-3"
          aria-label="Preview"
        >
          <Eye size={16} />
          <span className="hidden md:inline">Preview</span>
        </Button>

        {status === 'published' ? (
          canPublish ? (
            <Button variant="secondary" size="small" onClick={onPublish} className="min-h-11 gap-1.5" title="Manage publishing">
              <CheckCircle2 size={15} className="text-(--success-text)" aria-hidden="true" />
              Published
            </Button>
          ) : (
            <span className="flex items-center gap-1.5 text-(--success-text) font-semibold bg-body-sm px-2">
              <CheckCircle2 size={15} aria-hidden="true" />
              Published
            </span>
          )
        ) : canPublish ? (
          <Button variant="primary" size="small" onClick={onPublish} className="min-h-11">
            {status === 'closed' ? 'Re-publish' : 'Publish'}
          </Button>
        ) : null}

        {/* Rare and destructive actions live here, at every width, instead of as header buttons. */}
        <Menu
          align="end"
          triggerLabel="More form actions"
          trigger={<MoreVertical size={18} aria-hidden="true" />}
          items={overflowItems}
        />
      </div>
    </header>
  );
}
