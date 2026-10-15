import type { Template } from '@/types/form';

// Internal/demo templates. The `showInGallery` flag is authoritative; the names cover a database that has not been
// reseeded with it yet.
const INTERNAL = /^(field showcase|master comprehensive)/i;
export const isGalleryTemplate = (t: Pick<Template, 'name' | 'showInGallery'>) => t.showInGallery !== false && !INTERNAL.test(t.name);
