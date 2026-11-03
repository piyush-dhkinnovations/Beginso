/**
 * The built-in picture library: every listed picture has its file and its small preview, the names match what the backend accepts, and only
 * the exact library shape is recognised as a built-in picture.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { FORM_PICTURES, PICTURE_GROUPS, builtInPicture, isBuiltInPictureUrl, pictureThumbUrl, pictureUrl } from '@/lib/formPictures';

const pub = path.join(__dirname, '../../public');
const file = (url: string) => path.join(pub, url);

describe('the library', () => {
  it('has unique ids that the backend accepts (lowercase, digits, hyphen, up to 40)', () => {
    const ids = FORM_PICTURES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,40}$/);
  });

  it('has every picture in a known group, and every group has pictures', () => {
    const groups = PICTURE_GROUPS.map((g) => g.id);
    for (const p of FORM_PICTURES) expect(groups).toContain(p.group);
    for (const g of groups) expect(FORM_PICTURES.some((p) => p.group === g)).toBe(true);
  });

  it.each(FORM_PICTURES.map((p) => [p.id]))('%s has its picture and its preview, and both are light enough', (id) => {
    expect(fs.existsSync(file(pictureUrl(id)))).toBe(true);
    expect(fs.existsSync(file(pictureThumbUrl(id)))).toBe(true);
    expect(fs.statSync(file(pictureUrl(id))).size).toBeLessThan(300_000);
    expect(fs.statSync(file(pictureThumbUrl(id))).size).toBeLessThan(40_000);
  });

  it('has no picture file that is not listed', () => {
    const listed = new Set(FORM_PICTURES.map((p) => `${p.id}.jpg`));
    for (const f of fs.readdirSync(path.join(pub, 'form-pictures')).filter((n) => n.endsWith('.jpg'))) expect(listed.has(f)).toBe(true);
  });
});

describe('recognising a built-in picture', () => {
  it('knows the library shape and nothing else', () => {
    expect(isBuiltInPictureUrl('/form-pictures/aurora-mint.jpg')).toBe(true);
    expect(builtInPicture('/form-pictures/aurora-mint.jpg')?.name).toBe('Aurora mint');
    const bad = ['/form-pictures/../x.jpg', '/form-pictures/A.jpg', '/form-pictures/a.png', 'https://x.test/form-pictures/a.jpg', '/api/upload/file/u/f/a.jpg', '', undefined, null, '/form-pictures/a.jpg?x=1'];
    for (const b of bad) expect(isBuiltInPictureUrl(b as string)).toBe(false);
  });

  it('a well-formed name that is not in the library is a valid address but not a known picture', () => {
    expect(isBuiltInPictureUrl('/form-pictures/gone.jpg')).toBe(true);
    expect(builtInPicture('/form-pictures/gone.jpg')).toBeUndefined();
  });
});
