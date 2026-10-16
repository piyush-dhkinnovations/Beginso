import { useQueries, useQuery } from '@tanstack/react-query';
import { formsService } from '@/services/forms';

// Same ['form', id] cache entry the drawer, header and builder already use, so this is free when one is open.
const queryFor = (id: string) => ({
  queryKey: ['form', id],
  queryFn: () => formsService.getFormById(id),
  staleTime: 5 * 60_000,
});

/** A form's field definitions (undefined while loading or if the lookup failed). */
export function useFormFields(formId?: string) {
  return useQuery({ ...queryFor(formId as string), enabled: !!formId }).data?.fields;
}

/** Field definitions for several forms at once, keyed by form id (for lists that mix forms). */
export function useFormFieldsMap(formIds: string[]) {
  const ids = [...new Set(formIds.filter(Boolean))];
  return useQueries({
    queries: ids.map(queryFor),
    combine: (results) => Object.fromEntries(results.map((r, i) => [ids[i], r.data?.fields])),
  });
}
