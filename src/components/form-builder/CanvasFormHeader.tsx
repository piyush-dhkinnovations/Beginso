'use client';

import { useState } from 'react';

export interface CanvasFormHeaderProps {
  pageTitle: string;
  pageDescription: string;
  fieldCount: number;
  onPageTitleChange: (title: string) => void;
  onPageDescriptionChange: (description: string) => void;
}

// ─── Canvas form header — per-page title + description, always visible ───────
// Sits above the field list regardless of whether the active page has any
// fields yet. Editing here writes to the CURRENTLY ACTIVE PAGE's own
// title/description — every page holds an independent value, switching pages
// shows that page's own title (never shared or copied from another page).
// This is intentionally SEPARATE from `formTitle` (the admin-facing name shown
// in the top bar and Forms Manager, edited only via BuilderHeader). Commits on
// blur/Enter, same pattern as BuilderHeader's title editor. Clicks here are NOT
// stopped from bubbling — clicking into this header (away from any field card)
// intentionally deselects whichever field is currently expanded, via Canvas's
// background-click handler.

export function CanvasFormHeader({
  pageTitle,
  pageDescription,
  fieldCount,
  onPageTitleChange,
  onPageDescriptionChange,
}: CanvasFormHeaderProps) {
  const [title, setTitle] = useState(pageTitle || '');
  const [prevPageTitle, setPrevPageTitle] = useState(pageTitle);
  if (pageTitle !== prevPageTitle) {
    setPrevPageTitle(pageTitle);
    setTitle(pageTitle || '');
  }

  const [description, setDescription] = useState(pageDescription || '');
  const [prevPageDescription, setPrevPageDescription] = useState(pageDescription);
  if (pageDescription !== prevPageDescription) {
    setPrevPageDescription(pageDescription);
    setDescription(pageDescription || '');
  }

  const commitTitle = () => {
    if (title !== pageTitle) {
      onPageTitleChange(title.trim());
    }
  };

  const commitDescription = () => {
    if (description !== pageDescription) {
      onPageDescriptionChange(description);
    }
  };

  const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-lg shadow-card p-6 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-success shrink-0" />
        <span className="text-caption font-bold text-neutral-500 uppercase tracking-wider">
          {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
        </span>
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={blurOnEnter}
        placeholder="Untitled form"
        className="w-full text-display font-extrabold text-neutral-900 bg-transparent border-none outline-none placeholder:text-neutral-300"
      />
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={commitDescription}
        onKeyDown={blurOnEnter}
        placeholder="Add a short description for respondents…"
        className="w-full text-body text-neutral-500 bg-transparent border-none outline-none mt-1.5 placeholder:text-neutral-300"
      />
    </div>
  );
}
