/**
 * Every page puts 16px (gap-4) between its blocks (the header, the filters, the list), the way the Forms page does. Two pages once used 24px,
 * one 20px and one 12px, so moving from one page to the next the rhythm of the screen changed. The page root of each is checked in its source.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8').replace(/\r\n/g, '\n');

const ROOTS: [string, string][] = [
  ['src/app/(user)/forms/page.tsx', '<div className="flex flex-col gap-4 animate-fade-in">\n      <PageHeader\n        title="Forms"'],
  ['src/components/responses/ResponsesLanding.tsx', '<div className="flex flex-col gap-4">\n      <PageHeader\n        title="Responses"'],
  ['src/components/responses/ResponsesHubView.tsx', '<div className="flex flex-col gap-4">\n      {/* The form header\'s own spots'],
  ['src/components/analytics/AnalyticsView.tsx', '<div className="flex flex-col gap-4">\n      {formId ? ('],
  ['src/app/(user)/forms/[id]/overview/page.tsx', '<div className="flex flex-col gap-4 animate-fade-in">\n      <h1 className="sr-only">Overview</h1>'],
  ['src/app/(user)/my-submissions/page.tsx', '<div className="flex flex-col gap-4 animate-fade-in">'],
  ['src/app/(user)/dashboard/page.tsx', '<div className="flex flex-col gap-4">\n      <PageHeader\n        eyebrow="Personal space"'],
  ['src/components/reports/ReportsView.tsx', '<div className="flex flex-col gap-4 animate-fade-in">'],
  ['src/components/trash/TrashView.tsx', '<div className="flex flex-col gap-4 animate-fade-in">'],
  ['src/components/notifications/NotificationsView.tsx', '<div className="flex flex-col gap-4 animate-fade-in">'],
  ['src/components/search/SearchResultsView.tsx', '<div className="flex flex-col gap-4 animate-fade-in">'],
  ['src/components/settings/SettingsView.tsx', '<div className="flex flex-col gap-4 animate-fade-in">'],
  ['src/app/(user)/templates/page.tsx', '<div className="flex flex-col gap-4 animate-fade-in">'],
  ['src/app/(user)/shared/page.tsx', '<div className="flex flex-col gap-4">'],
  ['src/app/(user)/workspaces/page.tsx', '<div className="flex flex-col gap-4 w-full">'],
];

describe('the space between the blocks of a page', () => {
  it.each(ROOTS)('%s uses gap-4', (file, root) => {
    expect(read(file)).toContain(root);
  });
});
