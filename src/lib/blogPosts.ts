export type BlogCategory = "Product" | "Guide" | "Changelog" | "Engineering";

export interface BlogPost {
  slug: string;
  category: BlogCategory;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: string;
  body: { heading: string; paragraphs: string[] }[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "working-on-responses-together",
    category: "Product",
    title: "Working on responses together",
    excerpt: "Assign, tag, and leave internal notes your respondents never see.",
    author: "Beginso Team",
    date: "2026-08-24",
    readTime: "4 min read",
    body: [
      {
        heading: "A response is the start of the work, not the end",
        paragraphs: [
          "Most form tools treat a submission as the finish line. It lands in a spreadsheet and someone, eventually, does something with it. Beginso treats every response as the start of a small workflow — one that usually involves more than one person.",
          "That's why every response in your inbox carries a status, an assignee and a set of tags from the moment it arrives, without any setup.",
        ],
      },
      {
        heading: "Assign, tag, move it forward",
        paragraphs: [
          "Assign a response to a teammate the same way you'd assign a task. Tag it — VIP, Follow up, or whatever your team already uses. Move it through your own stages, and everyone with access sees the same picture in real time.",
        ],
      },
      {
        heading: "Notes the respondent never sees",
        paragraphs: [
          "Internal notes stay internal. They're scoped to your workspace and never appear anywhere a respondent could see them, so your team can be candid without a second thought.",
        ],
      },
    ],
  },
  {
    slug: "why-your-form-is-losing-people-at-question-four",
    category: "Guide",
    title: "Why your form is losing people at question four",
    excerpt: "What drop-off data says about form length, and what to do about it.",
    author: "Beginso Team",
    date: "2026-08-15",
    readTime: "6 min read",
    body: [
      {
        heading: "The pattern shows up everywhere",
        paragraphs: [
          "Look at completion data across enough forms and a shape appears: a steady trickle of drop-off through the first few questions, then a sharper drop right around question four. It isn't a coincidence, and it isn't really about question four specifically.",
        ],
      },
      {
        heading: "It's a commitment threshold, not a content problem",
        paragraphs: [
          "By question four, a respondent has invested enough time to notice they're investing time. If the form hasn't shown them why that's worth it — a clear purpose, a visible sense of progress — that's the moment they reconsider.",
          "Conditional logic helps here more than trimming copy does: showing only the questions that apply to a given respondent shortens the form that matters to them, even if the form as authored is long.",
        ],
      },
      {
        heading: "What to check first",
        paragraphs: [
          "Look at your own completion dashboard for where the drop happens. If it clusters at a specific question, that question is usually either asking for something sensitive too early, or asking for something the respondent doesn't yet see the point of.",
        ],
      },
    ],
  },
  {
    slug: "everything-we-shipped-this-quarter",
    category: "Changelog",
    title: "Everything we shipped this quarter",
    excerpt: "Multi-page forms, conditional logic, PDF reports, and a faster builder.",
    author: "Beginso Team",
    date: "2026-08-02",
    readTime: "3 min read",
    body: [
      {
        heading: "Multi-page forms",
        paragraphs: [
          "Long forms can now be split across pages with a visible progress indicator, without changing how conditional logic or validation works underneath.",
        ],
      },
      {
        heading: "Conditional logic",
        paragraphs: [
          "Show or hide fields based on an earlier answer. Combine conditions, and preview exactly what a given respondent would see before you publish.",
        ],
      },
      {
        heading: "PDF summary reports",
        paragraphs: [
          "Generate a presentation-ready PDF of your dashboard in one click, respecting whatever filter is currently applied.",
        ],
      },
      {
        heading: "A faster builder",
        paragraphs: [
          "Field reordering, duplication and the properties panel all got measurably snappier this quarter, particularly on forms with 30+ fields.",
        ],
      },
    ],
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getRelatedPosts(slug: string, count = 3): BlogPost[] {
  return BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, count);
}
