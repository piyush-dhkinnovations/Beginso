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

interface RawSharedItem extends Omit<SharedFormItem, 'sharedByName'> {
  sharedByName?: string;
  sharedByEmail?: string;
  sharedBy?: string | { name?: string; fullName?: string; email?: string };
  sharedByUser?: { name?: string; fullName?: string; email?: string };
}

// Real bug found and fixed (22 Sep 2026): `sharedBy` was originally a raw userId string with no
// display name anywhere in the payload — this file used to have nothing to display as a person.
// Live-confirmed today that the backend now sends a name three redundant ways on the same item
// (`sharedByName`, nested `sharedBy.name`/`.fullName`, and `sharedByUser.name`) — take whichever
// one actually has a value, in that order, rather than assume the backend picked one consistent
// shape.
function resolveSharedByName(raw: RawSharedItem): string | undefined {
  if (raw.sharedByName) return raw.sharedByName;
  if (raw.sharedBy && typeof raw.sharedBy === 'object') return raw.sharedBy.name ?? raw.sharedBy.fullName;
  return raw.sharedByUser?.name ?? raw.sharedByUser?.fullName;
}

export const sharedService = {
  list: (): Promise<SharedFormItem[]> =>
    axiosInstance.get('/api/shared-with-me').then((r) => {
      const unwrapped = unwrapEnvelope<unknown>(r.data, 'forms');
      // A key-name mismatch is exactly what caused the runtime crash this comment sits next to:
      // unwrapEnvelope() falls back to returning the whole envelope object when its key guess is
      // wrong, which is truthy but not an array — `.map()` then throws instead of failing loudly
      // earlier. Guard here, at the trust boundary, rather than in every consumer.
      if (!Array.isArray(unwrapped)) return [];
      // Build the clean shape explicitly rather than spreading the raw item — the wire payload
      // carries `sharedBy`/`sharedByUser`/`sharedByEmail` too (the three-redundant-fields
      // situation resolveSharedByName() already navigates), none of which belong on
      // `SharedFormItem` once `sharedByName` has been resolved from them.
      return (unwrapped as RawSharedItem[]).map((item) => ({
        id: item.id,
        title: item.title,
        workspaceName: item.workspaceName,
        role: item.role,
        accessLevel: item.accessLevel,
        sharedAt: item.sharedAt,
        sharedByName: resolveSharedByName(item),
      }));
    }),
};
