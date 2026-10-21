import { describe, it, expect } from 'vitest';
import { localAvatarSrc } from '@/lib/avatarUrl';

describe('localAvatarSrc', () => {
  it('turns a development-origin avatar into its path', () => {
    expect(localAvatarSrc('http://localhost:3000/avatars/01.svg')).toBe('/avatars/01.svg');
    expect(localAvatarSrc('http://127.0.0.1:3000/avatars/10.svg')).toBe('/avatars/10.svg');
  });

  it('leaves real photos, other localhost paths, relative paths and empty values alone', () => {
    expect(localAvatarSrc('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(localAvatarSrc('http://localhost:3000/uploads/a.jpg')).toBe('http://localhost:3000/uploads/a.jpg');
    expect(localAvatarSrc('/avatars/02.svg')).toBe('/avatars/02.svg');
    expect(localAvatarSrc(null)).toBeUndefined();
    expect(localAvatarSrc('')).toBeUndefined();
  });
});
