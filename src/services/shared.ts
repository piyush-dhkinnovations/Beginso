import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import type { SharedFormItem } from '@/types/team';

// Corrected against a real runtime crash (`shares.map is not a function`) reported after Day 5's
// first "confirmed live" pass only checked route existence, not the actual payload shape. The
// precise contract, JSON example included, lives in `Beginso-Report/backend_updates_for_frontend.md`
// §13 — the array is wrapped under `forms`, not `shares` (`{ success, forms: [...], total }`).
// `unwrapEnvelope()` falling back to the raw envelope object on a key miss is exactly how this
// went unnoticed by `tsc`/tests: `shares` was always truthy (the whole response object), just not
// an array, so only a real payload against the wrong key ever surfaces it.
export const sharedService = {
  list: (): Promise<SharedFormItem[]> =>
    axiosInstance.get('/api/shared-with-me').then((r) => {
      const unwrapped = unwrapEnvelope<unknown>(r.data, 'forms');
      // A key-name mismatch is exactly what caused the runtime crash this comment sits next to:
      // unwrapEnvelope() falls back to returning the whole envelope object when its key guess is
      // wrong, which is truthy but not an array — `.map()` then throws instead of failing loudly
      // earlier. Guard here, at the trust boundary, rather than in every consumer.
      return Array.isArray(unwrapped) ? (unwrapped as SharedFormItem[]) : [];
    }),
};
