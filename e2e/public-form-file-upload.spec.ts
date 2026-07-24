import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Requirement 4.29–4.36 (file upload UI states). The actual upload transfer is
 * deferred to the final submit (see tasks.md task 4.10) — this renderer only
 * validates client-side and simulates the Uploading state before settling Uploaded.
 */

async function goToPage2(page: import('@playwright/test').Page) {
  await page.goto('/f/mock-valid');
  await page.getByLabel('Full name', { exact: false }).fill('Jane Doe');
  await page.getByLabel('Email address', { exact: false }).fill('jane@example.com');
  await page.getByLabel('Country', { exact: false }).selectOption('United States');
  await page.locator('form').getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Step 2 of 2')).toBeVisible();
}

test.describe('Public form — file upload', () => {
  test('a valid file moves through uploading to the uploaded state', async ({ page }) => {
    await goToPage2(page);
    const fileInput = page.getByLabel('Attach a file', { exact: false });
    await fileInput.setInputFiles({ name: 'resume.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test content') });

    await expect(page.getByText('resume.pdf')).toBeVisible();
    // Simulated progress settles to "uploaded" (checkmark) within a second.
    await expect(page.getByText('Remove')).toBeVisible({ timeout: 3000 });
  });

  test('a disallowed MIME type is rejected with the correct message, no upload attempted', async ({ page }) => {
    await goToPage2(page);
    const fileInput = page.getByLabel('Attach a file', { exact: false });
    await fileInput.setInputFiles({ name: 'script.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('fake exe') });

    await expect(page.getByText('File type not supported. Allowed types: PDF, Word, Excel, images, video (MP4), ZIP, plain text.')).toBeVisible();
    await expect(page.getByText('Remove')).toHaveCount(0); // never reached "uploaded"
  });

  test('a file over 100 MB is rejected with the size-limit message', async ({ page }) => {
    // Playwright caps in-memory setInputFiles buffers at 50 MB (CDP limit) — a real
    // on-disk temp file is required to actually exceed the 100 MB validation boundary.
    const hugePath = path.join(os.tmpdir(), 'e2e-huge-upload.pdf');
    fs.writeFileSync(hugePath, Buffer.alloc(101 * 1024 * 1024));
    try {
      await goToPage2(page);
      const fileInput = page.getByLabel('Attach a file', { exact: false });
      await fileInput.setInputFiles(hugePath);

      await expect(page.getByText('File exceeds the 100 MB limit.')).toBeVisible();
    } finally {
      fs.unlinkSync(hugePath);
    }
  });

  test('Remove returns the field to the idle drop-zone state', async ({ page }) => {
    await goToPage2(page);
    const fileInput = page.getByLabel('Attach a file', { exact: false });
    await fileInput.setInputFiles({ name: 'resume.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test content') });
    await expect(page.getByText('Remove')).toBeVisible({ timeout: 3000 });

    await page.getByText('Remove').click();
    await expect(page.getByText('Click or drag and drop a file')).toBeVisible();
  });
});
