export interface PolicyDoc {
  slug: string;
  title: string;
  shortTitle: string;
  effectiveDate: string;
  lastUpdated: string;
  /** Short "please read carefully" style notice shown in a callout under the title. */
  notice?: string;
  /** Markdown-lite body — see PolicyMarkdown.tsx for the supported subset. */
  content: string;
}
