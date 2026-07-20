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

/** Returns an error message if the file is invalid, or null if it's valid. */
export function validateFile(file: File): string | null {
  if (file.size > MAX_SIZE_BYTES) {
    return 'File exceeds the 100 MB limit.';
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'File type not supported. Allowed types: PDF, Word, Excel, images, video (MP4), ZIP, plain text.';
  }
  return null;
}
