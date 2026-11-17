import { ImageResponse } from 'next/og';

// The picture a link to the gallery shows when it is shared (Open Graph and Twitter use it). Drawn here, so there is no file to keep in step.
export const alt = 'Beginso form templates: free forms for hiring, events, feedback and more';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: 'linear-gradient(135deg, #142341 0%, #284682 60%, #4274D9 100%)', color: '#ffffff' }}>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -0.5 }}>BeginSo</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Start from a template</div>
          <div style={{ fontSize: 36, lineHeight: 1.35, color: '#D9E3F7', maxWidth: 900 }}>Free forms for hiring, events, feedback, bookings and more. Pick one and make it yours.</div>
        </div>
        <div style={{ fontSize: 28, color: '#B3C7F0' }}>beginso.com/discover-templates</div>
      </div>
    ),
    { ...size },
  );
}
