'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formsService } from '@/services/forms';
import { formKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/ui/Toast';
import type { Form } from '@/types/form';

type ListData = { forms: Form[]; total: number; page: number; limit: number };

export const PIN_LIMIT = 50;

function pinErrorMessage(error: unknown, pin: boolean): string {
  const e = error as { response?: { status?: number; data?: { code?: string; error?: { code?: string } } } };
  const status = e?.response?.status;
  const code = e?.response?.data?.code ?? e?.response?.data?.error?.code;
  if (code === 'PIN_LIMIT') return `You can pin up to ${PIN_LIMIT} forms. Unpin one to pin another.`;
  if (status === 409) return 'Archived or deleted forms cannot be pinned.';
  if (status === 403) return "You don't have access to this form.";
  if (status === 404 && code === 'FORM_NOT_FOUND') return 'This form no longer exists.';
  if (status === 404) return 'Could not pin this form. Please try again.';
  return `Could not ${pin ? 'pin' : 'unpin'} the form. Please try again.`;
}

// Per-user pin toggle. Optimistically patches every cached forms list (all contexts — the key is
// ['forms', scope, ..., 'list', params]) and the overview cache, rolls back on error, and refetches
// on settle so the Pinned tab picks the form up in most-recently-pinned order.
export function usePinForm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, pin }: { id: string; pin: boolean }) => (pin ? formsService.pinForm(id) : formsService.unpinForm(id)),
    onMutate: async ({ id, pin }) => {
      await queryClient.cancelQueries({ queryKey: ['forms'] });
      const snapshots = queryClient.getQueriesData<ListData>({ queryKey: ['forms'] });
      const pinnedAt = pin ? new Date().toISOString() : null;
      for (const [key, data] of snapshots) {
        if (!data || !Array.isArray(data.forms)) continue;
        const onPinnedList = (key[key.length - 1] as { pinned?: boolean } | undefined)?.pinned === true;
        const hit = data.forms.some((f) => f._id === id);
        if (!hit) continue;
        if (onPinnedList && !pin) {
          queryClient.setQueryData<ListData>(key, { ...data, forms: data.forms.filter((f) => f._id !== id), total: Math.max(0, data.total - 1) });
        } else {
          queryClient.setQueryData<ListData>(key, { ...data, forms: data.forms.map((f) => (f._id === id ? { ...f, pinned: pin, pinnedAt } : f)) });
        }
      }
      const overviewKey = formKeys.overview(id);
      const overview = queryClient.getQueryData<{ form: Form }>(overviewKey);
      if (overview?.form) queryClient.setQueryData(overviewKey, { ...overview, form: { ...overview.form, pinned: pin, pinnedAt } });
      return { snapshots, overview };
    },
    onError: (error, { id, pin }, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
      if (ctx?.overview) queryClient.setQueryData(formKeys.overview(id), ctx.overview);
      toast(pinErrorMessage(error, pin), 'error');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['forms'] }),
  });
}
