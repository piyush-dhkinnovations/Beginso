'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { responseViewService } from '@/services/responseView';
import { responseViewKeys } from '@/lib/queryKeys';
import { readRememberedView, rememberView, resolveView } from '@/lib/responseView';
import type { ResponseViewConfig, ResponseViewSettings } from '@/types/responseView';

const SAVE_DEBOUNCE_MS = 500;
export const SAVE_FAILED_COPY = 'Could not save your layout choice. It will stay for this visit.';

interface Options {
  formId: string | undefined;
  /** Workspace slug or 'personal' - only sent as the workspace header. */
  scope: string;
}

/**
 * The layout of one form's submitted response for the signed-in person.
 *
 * Switching is instant: the choice is applied locally first and saved in the background (debounced). If the request fails
 * the choice stays for this visit (and on this device), with one quiet toast. If the config request fails, the last choice
 * remembered on this device, or Grid, is used - never an error screen.
 */
export function useResponseView({ formId, scope }: Options) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const key = useMemo(() => responseViewKeys.form(formId ?? ''), [formId]);

  const query = useQuery({
    queryKey: key,
    queryFn: () => responseViewService.get(formId as string, scope),
    enabled: !!formId,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const config = query.data;

  const remembered = useMemo(() => readRememberedView(formId), [formId]);
  const [local, setLocal] = useState<ResponseViewSettings | null>(null);
  const [useForAllOverride, setUseForAllOverride] = useState<boolean | null>(null);
  const view = resolveView(local, config?.resolved, remembered);

  // What the server last said is the next "remembered" answer, so the next visit paints it before the request returns.
  useEffect(() => {
    if (config && !local) rememberView(formId, config.resolved);
  }, [config, local, formId]);

  const useForAll = useForAllOverride ?? (!!config && !config.personal && !!config.personalAll);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ settings: ResponseViewSettings; all: boolean } | null>(null);
  const warned = useRef(false);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const job = pending.current;
    pending.current = null;
    if (!job || !formId) return;
    const scopeKey = job.all ? 'all' : formId;
    try {
      const saved = await responseViewService.savePersonal(scopeKey, job.settings, scope);
      queryClient.setQueryData<ResponseViewConfig>(key, (old) =>
        old
          ? {
              ...old,
              resolved: { ...job.settings, source: job.all ? 'personalAll' : 'personal' },
              personal: job.all ? old.personal : (saved ?? { ...job.settings, scope: formId }),
              personalAll: job.all ? (saved ?? { ...job.settings, scope: 'all' }) : old.personalAll,
            }
          : old
      );
      // The server now agrees, unless the person already changed it again while this was in flight.
      if (!pending.current) setLocal(null);
    } catch {
      if (!warned.current) {
        warned.current = true;
        toast(SAVE_FAILED_COPY, 'error');
      }
    }
  }, [formId, scope, key, queryClient, toast]);

  const schedule = useCallback(
    (settings: ResponseViewSettings, all: boolean) => {
      pending.current = { settings, all };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
    },
    [flush]
  );

  // Closing the drawer inside the debounce window must not lose the choice.
  useEffect(
    () => () => {
      if (pending.current) void flush();
    },
    [flush]
  );

  const setView = useCallback(
    (patch: Partial<ResponseViewSettings>) => {
      const next = { ...view, ...patch };
      setLocal(next);
      rememberView(formId, next);
      schedule(next, useForAll);
    },
    [view, formId, schedule, useForAll]
  );

  const setUseForAll = useCallback(
    (all: boolean) => {
      setUseForAllOverride(all);
      setLocal(view);
      schedule(view, all);
    },
    [view, schedule]
  );

  /** "Use the form's default": drops both personal choices (for this form and for all forms). */
  const useFormDefault = useCallback(async () => {
    if (!formId) return;
    if (timer.current) clearTimeout(timer.current);
    pending.current = null;
    try {
      await Promise.all([responseViewService.clearPersonal(formId, scope), responseViewService.clearPersonal('all', scope)]);
      setLocal(null);
      setUseForAllOverride(null);
      await queryClient.invalidateQueries({ queryKey: key });
    } catch {
      toast('Could not switch to the form default. Please try again.', 'error');
    }
  }, [formId, scope, key, queryClient, toast]);

  /** Editors only (the server enforces it): the layout everyone without a personal choice gets. */
  const setAsFormDefault = useCallback(async () => {
    if (!formId) return;
    try {
      await responseViewService.saveFormDefault(formId, view, config?.formDefault?.version ?? 0, scope);
      toast("Saved as this form's default layout.", 'success');
      await queryClient.invalidateQueries({ queryKey: key });
    } catch (err) {
      const stale = isAxiosError(err) && err.response?.status === 409;
      toast(stale ? 'Someone else changed this default. Reload the page and try again.' : 'Could not save the form default. Please try again.', 'error');
      if (stale) void queryClient.invalidateQueries({ queryKey: key });
    }
  }, [formId, scope, key, view, config, queryClient, toast]);

  return {
    view,
    setView,
    useForAll,
    setUseForAll,
    useFormDefault,
    setAsFormDefault,
    /** True when something personal is in effect, so "Use the form's default" means something. */
    hasPersonalChoice: !!local || !!config?.personal || !!config?.personalAll,
    isLoading: query.isLoading,
  };
}
