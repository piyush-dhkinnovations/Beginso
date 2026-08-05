'use client';

import { Eye, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatResponseDate, buildAnswerPreview } from '@/lib/formatters';
import { STATUS_LABELS, type IResponse } from '@/types/response';

interface ResponseRowProps {
  response: IResponse;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onDelete: () => void;
}

export function ResponseRow({ response, isSelected, onSelect, onView, onDelete }: ResponseRowProps) {
  return (
    <tr onClick={onView} className="hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-0">
      <td className="hidden md:table-cell w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
          aria-label={`Select response from ${formatResponseDate(response.submittedAt)}`}
          className="w-4 h-4"
        />
      </td>
      <td className="px-4 py-3 text-body-sm text-neutral-600 whitespace-nowrap">
        {formatResponseDate(response.submittedAt)}
      </td>
      <td className="px-4 py-3">
        <Badge variant={response.status}>{STATUS_LABELS[response.status]}</Badge>
      </td>
      <td className="hidden md:table-cell px-4 py-3 text-body-sm text-neutral-500 truncate max-w-[300px]">
        {buildAnswerPreview(response.answers)}
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="small" aria-label="View response" onClick={onView} className="w-8 h-8 p-0">
            <Eye size={16} />
          </Button>
          <Button
            variant="ghost"
            size="small"
            aria-label="Delete response"
            onClick={onDelete}
            className="w-8 h-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </td>
    </tr>
  );
}
