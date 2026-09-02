# Beginso — Landing Page & Blog

What we are building, what goes in every card, and how each animation behaves.

**Design system:** DM Sans · `#4274D9` primary · `#041347` ink · the 4pt spacing scale · components from `beginso-ui.css`. The landing page should look like the product it sells, not a separate marketing site.

**Cut from the reference:** pricing.
**Added:** a blog section on the landing page, plus a blog list page and an article page.

---

## Contents

1. [Page structure](#1-page-structure)
2. [Section by section — content](#2-section-by-section--content)
3. [Animations — how each one works](#3-animations--how-each-one-works)
4. [Blog pages](#4-blog-pages)
5. [Build notes](#5-build-notes)
6. [Two things I need from you](#6-two-things-i-need-from-you)

---

## 1. Page structure

Eleven sections. Reference order, minus pricing, plus blog.

| # | Section | Purpose |
|---|---|---|
| 1 | Nav | Floating pill, sticky |
| 2 | Hero | Headline, two CTAs, trust line |
| 3 | Product visual | The form builder in 3D tilt — **the moment that sells it** |
| 4 | Logo marquee | Social proof strip |
| 5 | Features | Bento grid, four cards |
| 6 | By the numbers | Three cards — product facts, not invented metrics |
| 7 | How it works | Three steps: build, share, track |
| 8 | Testimonial | *Only if a real quote exists* |
| 9 | FAQ | Two-column accordion |
| 10 | Blog | Three latest posts |
| 11 | Final CTA + footer | Full-bleed brand colour |

---

## 2. Section by section — content

### 1 · Nav

Floating pill, centred, sticky with a blur backdrop once you scroll past the hero.

- **Left:** Beginso wordmark
- **Centre:** Features · How it works · Blog
- **Right:** *Log in* (ghost) · **Start free** (primary pill)

---

### 2 · Hero

**Trust pill** — avatar stack + `Built for teams who outgrew spreadsheets`

**Headline** — two lines, second line in `#4274D9`:

> Collecting the form is the easy part.
> **What happens next is the work.**

**Subline:**

> Beginso builds the form, publishes it, and turns every response into something you can actually work with — status tracking, dashboards and exports, without a spreadsheet in sight.

**CTAs:** `Start free` (primary) · `See how it works` (ghost with a play icon)
**Under them:** No credit card required · Free plan forever

---

### 3 · Product visual — the hero moment

A large product card in 3D perspective, exactly as the reference does it. Contents:

- **Left rail:** Home · Forms · Inbox `14` · Insights · Team · Settings
- **Top strip:** four stat cards — `8,412 responses`, `64.2% completion`, `17 active forms`, `2m 14s average time`
- **Main panel:** the response inbox — five rows with avatars, tags (`VIP`, `Follow up`), assignee avatars, status pills (`New`, `In progress`, `Completed`), submission dates
- **Right panel:** a response trend line chart, twelve months rising

**Floating around it:** four small rounded app-icon tiles — a form icon, a chart icon, a checkmark, an inbox icon — at different depths so they drift at different speeds.

---

### 4 · Logo marquee

A single row scrolling infinitely, edges fading out.

Until real customer logos exist, use **placeholder wordmark tiles** rather than borrowed brand marks. Fastest honest option.

Label above: `Teams collecting with Beginso`

---

### 5 · Features — bento grid

Eyebrow `Features` · Heading **Everything after the submit button** · Subline *Most form tools stop at collection. Beginso picks up where they leave off.*

Four cards. Each has a product visual on top, then title and body.

| Card | Visual | Title | Body |
|---|---|---|---|
| **A** — wide, top left | Builder canvas with three field cards, one mid-drag, a cursor label | **Build it by dragging** | Ten field types, conditional logic, and your own branding. No code, no template to fight with. Publish to a link, an embed or a QR code in one click. |
| **B** — top right | Donut chart, `5,398 of 8,412`, three legend rows with percentages | **A dashboard that builds itself** | The first submission generates it. Response trends, status breakdown, per-question charts — no configuration, no setup screen. |
| **C** — wide, bottom left | Three inbox rows moving between status columns, avatars attached | **Responses you can actually work** | Assign to a teammate, tag it, move it through your own stages, and leave internal notes the respondent never sees. |
| **D** — bottom right | A rising line chart with `CSV` and `PDF` chips | **Get the data out** | Stream to CSV or generate a PDF summary. Exports respect whatever filter you are looking at, so you get the rows you meant. |

---

### 6 · By the numbers

Eyebrow `By the numbers` · Heading **Built to handle the whole job**

The reference uses invented performance metrics. **These are product facts instead — every one is true and checkable.**

| | Big number | Label | Three bullets |
|---|---|---|---|
| 1 | **10** | Field types | Text, email, phone, number · Date, dropdown, multiple choice · Checkbox and file upload |
| 2 | **0** | Setup steps for analytics | Dashboard on first submission · Trends, status and per-question · Filter by any date range |
| 3 | **2** | Export formats | CSV streamed directly · PDF summary reports · Respects your active filter |

Numbers count up when the section enters view.

---

### 7 · How it works

Eyebrow `How it works` · Heading **Three steps, then it runs itself**

Three cards, each with an illustrated visual:

| | Title | Body |
|---|---|---|
| **Build** | Drag the fields you need | Start blank or from a template. Add logic so people only see questions that apply to them. |
| **Share** | One link, anywhere | A public link, an embed snippet, or a QR code. Works on any screen from 320px up, no login for respondents. |
| **Track** | Watch it fill up | Responses arrive with status, assignment and notes. The dashboard updates as they land. |

---

### 8 · Testimonial — hold

Quote left, photo right, carousel dots. **Only build this with a real quote from a real person.** Otherwise leave it out — an invented testimonial on a live site is a genuine problem, and the page reads fine without it.

---

### 9 · FAQ

Two-column accordion, six questions.

| Question | Answer |
|---|---|
| Do respondents need an account? | No. They open the link and fill it in. Nothing to sign up for and nothing to install. |
| What happens after someone submits? | The response lands in your inbox with a status. Assign it, tag it, move it through your stages, and the dashboard updates automatically. |
| Can I embed a form on my own site? | Yes. Every published form gives you a link, an iframe snippet and a QR code. Width, height and display options are configurable. |
| How big can uploaded files be? | Up to 100 MB per file. File type and size are validated on upload, and every file is scoped to the workspace that owns the form. |
| Do you store IP addresses? | No. Every address is hashed before it is stored. Raw IPs are never saved. |
| Can I export my data? | Any time. CSV or PDF, and the export respects whatever filter is applied to the view. |

---

### 10 · Blog

Eyebrow `Blog` · Heading **What's new in Beginso** · Right-aligned link *View all posts →*

Three cards. Each carries: cover image, category tag, title, one-line excerpt, author avatar and name, date.

| Tag | Title | Excerpt |
|---|---|---|
| `Product` | Working on responses together | Assign, tag, and leave internal notes your respondents never see. |
| `Guide` | Why your form is losing people at question four | What drop-off data says about form length, and what to do about it. |
| `Changelog` | Everything we shipped this quarter | Multi-page forms, conditional logic, PDF reports, and a faster builder. |

---

### 11 · Final CTA and footer

**Heading** — large, centred, animating from blurred to sharp:

> Stop exporting to a spreadsheet.
> **Start working your responses instead.**

**CTAs:** `Start free` · `Read the docs`

**Footer** — full-bleed `#041347`, wordmark left, three columns:

- **Product** — Features · How it works · Templates · Changelog
- **Resources** — Blog · Documentation · API reference · Help centre
- **Company** — About · Contact · Privacy · Terms

---

## 3. Animations — how each one works

Six behaviours. All built with `IntersectionObserver` plus CSS transforms — no library needed, works in Next.js as-is.

**All of them are disabled under `prefers-reduced-motion: reduce`.** Elements jump to their final state; nothing moves.

---

### A · The hero tilt — the one you asked for

**What it does.** The dashboard starts rotated back in 3D — its top edge receding from you — then rotates flat and rises as you scroll past the hero.

**How.** A wrapper carries `perspective: 2000px`. The card inside starts at `rotateX(24deg) translateY(40px) scale(0.94)` and animates to `rotateX(0) translateY(0) scale(1)`. Driven by scroll position across the first viewport height, so it tracks your scroll rather than firing once.

**Why it works.** A flat screenshot reads as a picture. The same screenshot with perspective reads as an object, and an object that responds to your scroll reads as a product. That is the whole trick.

**Detail worth keeping.** The four floating icons sit at different `translateZ` depths, so they drift at different speeds as the card settles. Three lines of CSS, and it is the difference between "tilted image" and "a scene".

---

### B · Blur-to-sharp text reveal — the page signature

**What it does.** Every section heading enters blurred and faded, then resolves to sharp.

**This is visible in your screenshot.** "Loved by teams" and "Latest from the…" are blurred while "Everything You Need to Scale" is sharp — you caught them mid-animation. It repeats on every heading, and it is what makes the whole page feel considered rather than a stack of sections.

**How.** From `filter: blur(10px)` · `opacity: 0` · `translateY(20px)` to `blur(0)` · `opacity: 1` · `translateY(0)`, over 700ms on `cubic-bezier(0.2, 0, 0, 1)`, triggered at 20% visibility.

**Optional upgrade.** Split the heading into words and stagger each by 40ms. Better, and about ten more lines.

---

### C · Staggered card reveals

**What it does.** Cards in a grid rise into place one after another rather than all at once.

**How.** Each card starts at `opacity: 0` · `translateY(24px)`, animating to rest over 600ms, with a `--delay` of `index × 80ms`. One `IntersectionObserver` watches the section and releases the whole group.

**Rule.** Stagger within a group, never across the page. A card is either revealed or waiting — never a third state.

---

### D · Count-up numbers

**What it does.** `10`, `0` and `2` in the numbers band count from zero when the section enters view.

**How.** `requestAnimationFrame` over 1200ms with an ease-out curve. Runs once. Uses `font-variant-numeric: tabular-nums` so the width does not jitter as digits change.

---

### E · Logo marquee

**What it does.** One row scrolls left forever, edges fading.

**How.** The track holds two identical copies of the logo set and translates by `-50%` over 30 seconds on a linear infinite loop. Because the second copy is identical, the reset is invisible. Mask the container edges with a `linear-gradient` so logos fade rather than clip. Pauses on hover.

---

### F · Card hover lift

**What it does.** Cards lift slightly and their shadow deepens on hover.

**How.** `translateY(-4px)` plus `shadow-sm → shadow-md` over 250ms. **Pointer devices only** — under `@media (pointer: coarse)` it is removed entirely, since a stuck hover state on touch is worse than none.

---

## 4. Blog pages

Two pages, same design system.

### Blog list — `/blog`

- Page header: **What's new in Beginso** · *Product updates, guides and release notes.*
- Category filter chips: All · Product · Guide · Changelog · Engineering
- Featured post — full width, large cover
- Grid of posts, three per row, dropping to two then one
- Same card shape as the landing section: cover, tag, title, excerpt, author, date
- Load more at the bottom

### Article — `/blog/[slug]`

- Breadcrumb: Blog › Category › Title
- Title, then author avatar, name, date, read time
- Full-width cover image
- Body constrained to **65 characters per line** — the readable measure, not the container width
- Sticky table of contents on the left at desktop, collapsing into an accordion under the title on mobile
- End of article: share row, author card, three related posts

**Animation here is deliberately quiet.** Blur reveal on the title, staggered reveal on the card grid, nothing else. A page people read should not move while they read it.

---

## 5. Build notes

**Where it goes.** `src/components/landing/` for the landing sections, `src/app/blog/` for the two blog routes.

**Everything imports from `components/ui/`.** No raw class names — same rule as the rest of the app, so a token change stays safe.

**Both themes from the first commit.** The landing page is mostly light, but the footer is `#041347` in both, and dark mode must not break the hero tilt or the marquee mask.

**Responsive.** Bento becomes a single column below 768px. The hero tilt reduces to `rotateX(12deg)` on tablet and switches off entirely below 520px — perspective on a small screen just makes text hard to read. FAQ goes one column. Marquee speeds up slightly so it does not feel stalled on a narrow viewport.

**Performance.** The hero visual is the largest paint on the page — it should be a real image, not a DOM recreation, with `priority` set on it. Everything below the fold lazy-loads. Animate only `transform`, `opacity` and `filter`; never `top`, `left`, `width` or `height`.

**React Bits** is a reasonable source for the text reveal, marquee and tilt card. MIT licensed, React plus Framer Motion, drops into your stack. Skip the elastic slider — that is a form input, not a landing animation.

---

## 6. Two things I need from you

**1 · The testimonial.** Do you have a real quote from a real user? If yes, send the name, role and quote. If not, section 8 is left out — an invented testimonial on a live site is a real problem, and the page works without it.

**2 · The logo marquee.** Any real customer or partner logos you may use? If not it ships with placeholder wordmark tiles, which is honest and takes ten minutes to swap later.

Everything else I can build from what is already in the product.
