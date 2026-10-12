// The upload endpoint refuses files over 5 MB. A phone photo used uncropped is often bigger, so it is scaled down in the
// browser first (longest side 2400px, JPEG) instead of failing with a vague "upload failed". Files already small enough,
// and GIFs (a canvas would flatten the animation), are returned untouched.
export const UPLOAD_LIMIT_BYTES = 5 * 1024 * 1024;

export async function shrinkImage(file: File, maxBytes = Math.floor(UPLOAD_LIMIT_BYTES * 0.9), maxSide = 2400): Promise<File> {
  if (file.size <= maxBytes || file.type === 'image/gif') return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.fillStyle = '#ffffff'; // JPEG has no transparency
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.88, 0.78, 0.68, 0.55]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob && blob.size <= maxBytes) return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  }
  return file; // still too big: the server's own message is shown
}
