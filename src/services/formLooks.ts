import axiosInstance from '@/lib/axios';
import { readLooks, type GalleryStyle } from '@/lib/formStyles';

// GET /api/form-looks: the ready-made Looks, public and read-only. The reply is read defensively ({ data }, or a bare list); an unreadable reply
// is an error so the caller keeps the bundled copy.
export const formLooksService = {
  list: (): Promise<{ looks: GalleryStyle[]; version: string | null }> =>
    axiosInstance.get('/api/form-looks').then((r) => {
      const body = r.data as { data?: unknown; version?: unknown } | unknown[] | null;
      const looks = readLooks(Array.isArray(body) ? body : body?.data);
      if (!looks.length) throw new Error('Unexpected /api/form-looks response shape');
      return { looks, version: !Array.isArray(body) && typeof body?.version === 'string' ? body.version : null };
    }),
};
