/** Client-side file validation for the public form's file_upload field. */

export const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'application/zip',
  'text/plain',
];

/**
 * Returns an error message if the file is invalid, or null if it's valid.
 * `allowedTypes`/`maxSizeBytes` default to the public form's broad file-upload constraints;
 * callers with a narrower need (e.g. avatar/branding images) pass their own — one validator,
 * not a parallel one per use case.
 */
export function validateFile(
  file: File,
  allowedTypes: string[] = ALLOWED_MIME_TYPES,
  maxSizeBytes: number = MAX_SIZE_BYTES
): string | null {
  const isDefaultConstraints = allowedTypes === ALLOWED_MIME_TYPES && maxSizeBytes === MAX_SIZE_BYTES;

  if (file.size > maxSizeBytes) {
    return isDefaultConstraints
      ? 'File exceeds the 100 MB limit.'
      : `File exceeds the ${Math.round(maxSizeBytes / (1024 * 1024))} MB limit.`;
  }
  if (!allowedTypes.includes(file.type)) {
    return isDefaultConstraints
      ? 'File type not supported. Allowed types: PDF, Word, Excel, images, video (MP4), ZIP, plain text.'
      : 'File type not supported.';
  }
  return null;
}
