'use client';

import { Eye, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatResponseDate, buildAnswerPreview, detectRespondentIdentity } from '@/lib/formatters';
import { STATUS_LABELS, type IResponse } from '@/types/response';

interface ResponseRowProps {
  response: IResponse;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onDelete: () => void;
}

export function ResponseRow({ response, isSelected, onSelect, onView, onDelete }: ResponseRowProps) {
  const identity = detectRespondentIdentity(response.answers);
  const hasIdentity = !!(identity.label || identity.email);
  const initial = (identity.label ?? identity.email ?? '?').charAt(0).toUpperCase();

  return (
    <tr onClick={onView} className="hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-0">
      <td className="responses-secondary-column w-12 px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
        <label className="flex min-h-10 min-w-10 cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            aria-label={`Select response from ${formatResponseDate(response.submittedAt)}`}
            className="w-4 h-4"
          />
        </label>
      </td>
      <td className="px-4 py-3 text-body-sm text-neutral-600 whitespace-nowrap">
        <span className="responses-desktop-only">{formatResponseDate(response.submittedAt)}</span>
        <span className="responses-mobile-only min-w-0 flex-col">
          <span className="max-w-36 truncate font-medium text-neutral-800">
            {identity.label ?? identity.email ?? 'Anonymous'}
          </span>
          <span className="text-caption text-neutral-500">{formatResponseDate(response.submittedAt)}</span>
        </span>
      </td>
      <td className="px-4 py-3">
        <Badge variant={response.status}>{STATUS_LABELS[response.status]}</Badge>
      </td>
      <td className="responses-secondary-column px-4 py-3 text-body-sm text-neutral-500 truncate max-w-[300px]">
        <div className="flex items-center gap-2 min-w-0">
          {hasIdentity && (
            <span
              aria-hidden="true"
              className="w-6 h-6 shrink-0 rounded-full bg-brand-100 text-brand-700 text-caption font-semibold flex items-center justify-center"
            >
              {initial}
            </span>
          )}
          <div className="min-w-0 flex flex-col">
            {hasIdentity && (
              <span className="text-neutral-700 font-medium truncate">{identity.label ?? identity.email}</span>
            )}
            <span className="truncate">{buildAnswerPreview(response.answers)}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="small" aria-label="View response" onClick={onView} className="w-11 h-11 p-0">
            <Eye size={16} />
          </Button>
          <Button
            variant="ghost"
            size="small"
            aria-label="Delete response"
            onClick={onDelete}
            className="w-11 h-11 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </td>
    </tr>
  );
}
