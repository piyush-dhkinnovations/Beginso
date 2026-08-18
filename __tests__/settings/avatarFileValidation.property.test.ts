/**
 * __tests__/settings/avatarFileValidation.property.test.ts
 * Feature: sprint-6-settings, Property 4: File validation never false-accepts
 * Requirements: 3.2, 6.1
 *
 * validateFile() returns an error message string when invalid, or null when valid (not a
 * `.valid` boolean, as an earlier draft of this property assumed before checking the real
 * signature in src/lib/validateFile.ts) — AvatarUploader/BrandingTab both call it exactly this
 * way with their own narrower allowedTypes/maxSizeBytes.
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { validateFile } from '@/lib/validateFile';

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;

describe('validateFile (avatar/logo constraints) — property test', () => {
  it('never accepts a file unless the MIME type is exactly allowed AND the size is within the limit', () => {
    fc.assert(
      fc.property(fc.string(), fc.nat({ max: 50_000_000 }), (mimeType, size) => {
        const file = { type: mimeType, size } as File;
        const result = validateFile(file, ALLOWED_AVATAR_TYPES, AVATAR_MAX_SIZE_BYTES);
        const shouldBeValid = ALLOWED_AVATAR_TYPES.includes(mimeType) && size <= AVATAR_MAX_SIZE_BYTES;
        return (result === null) === shouldBeValid;
      }),
      { numRuns: 100 }
    );
  });
});
