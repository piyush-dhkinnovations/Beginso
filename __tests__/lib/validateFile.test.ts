/**
 * Feature: sprint-3-public-form
 * Example-based tests for validateFile — exact size boundary and MIME allowlist.
 */

import { describe, it, expect } from 'vitest';
import { validateFile, MAX_SIZE_BYTES, ALLOWED_MIME_TYPES } from '@/lib/validateFile';

function makeFile(size: number, type: string): File {
  return { size, type, name: 'test-file' } as File;
}

describe('validateFile', () => {
  it('accepts a file exactly at the 25 MB limit', () => {
    expect(validateFile(makeFile(MAX_SIZE_BYTES, 'application/pdf'))).toBeNull();
  });

  it('rejects a file one byte over the 25 MB limit', () => {
    expect(validateFile(makeFile(MAX_SIZE_BYTES + 1, 'application/pdf'))).toBe(
      'File exceeds the 25 MB limit.'
    );
  });

  it.each(ALLOWED_MIME_TYPES)('accepts allowed MIME type %s', (type) => {
    expect(validateFile(makeFile(1024, type))).toBeNull();
  });

  it('rejects a disallowed MIME type', () => {
    expect(validateFile(makeFile(1024, 'application/x-custom'))).toBe(
      'File type not supported. Allowed types: PDF, Word, Excel, images, video (MP4), ZIP, plain text.'
    );
  });
});
