import { useEffect, useState } from 'react';

/** A QR code for `url` as a PNG data address (null while it is made, or if it could not be). The encoder loads on demand, only once there is a link. */
export function useQrDataUrl(url: string, width = 240): string | null {
  const [made, setMade] = useState<{ url: string; data: string } | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    import('qrcode')
      .then(({ toDataURL }) => toDataURL(url, { width, margin: 1 }))
      .then((data) => !cancelled && setMade({ url, data }))
      .catch(() => !cancelled && setMade(null));
    return () => {
      cancelled = true;
    };
  }, [url, width]);

  // never show the code of an earlier link while the new one is being made
  return made && made.url === url ? made.data : null;
}
