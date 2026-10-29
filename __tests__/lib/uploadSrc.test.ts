import { describe, it, expect } from 'vitest';
import { uploadSrc } from '@/lib/uploadSrc';

describe('uploadSrc: an uploaded picture is asked for through the app', () => {
  it('rewrites the backend\'s own address (any host, http or https) to the app\'s same-origin proxy', () => {
    expect(uploadSrc('http://192.168.33.47:5000/api/upload/file/u1/f1/brand/brand_banner/cover.jpg')).toBe('/api/backend/api/upload/file/u1/f1/brand/brand_banner/cover.jpg');
    expect(uploadSrc('https://backend-obp.dhkinnovations.com/api/upload/file/u1/brand/brand_logo/logo.png')).toBe('/api/backend/api/upload/file/u1/brand/brand_logo/logo.png');
    expect(uploadSrc('http://localhost:5000/api/upload/file/a/b.png?v=2')).toBe('/api/backend/api/upload/file/a/b.png?v=2');
  });

  it('also reads a path with no host', () => {
    expect(uploadSrc('/api/upload/file/a/b.png')).toBe('/api/backend/api/upload/file/a/b.png');
  });

  it('leaves everything else alone: a picture from the web, a blob or data URL, an address already through the app', () => {
    for (const other of ['https://images.unsplash.com/photo.jpg', 'blob:http://localhost:3000/abc', 'data:image/png;base64,AAAA', '/api/backend/api/upload/file/a/b.png', '/avatars/01.svg']) {
      expect(uploadSrc(other)).toBe(other);
    }
  });

  it('has nothing for nothing', () => {
    expect(uploadSrc(undefined)).toBeUndefined();
    expect(uploadSrc(null)).toBeUndefined();
    expect(uploadSrc('')).toBeUndefined();
  });
});
