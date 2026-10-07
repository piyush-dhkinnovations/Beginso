import React from "react";
import { Table, type TableColumn } from "@/components/ui/Table";
import { Alert } from "@/components/ui/Alert";

type Block =
  | { type: "heading"; level: 1 | 2 | 3 | 4; text: string; id: string }
  | { type: "paragraph"; text: string }
  | { type: "legal-strong"; text: string }
  | { type: "list"; items: string[] }
  | { type: "callout"; title?: string; text: string }
  | { type: "table"; header: string[]; rows: string[][] };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function isAllCapsEmphasis(text: string): boolean {
  if (text.length < 50) return false;
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 40) return false;
  const upper = letters.replace(/[^A-Z]/g, "");
  return upper.length / letters.length > 0.85;
}

function isTableChunk(lines: string[]): boolean {
  return lines.every((l) => l.trim().startsWith("|") && l.trim().endsWith("|"));
}

function isSeparatorRow(line: string): boolean {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c.trim()));
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

function parseChunk(chunk: string): Block {
  const lines = chunk.split("\n").filter((l) => l.trim().length > 0);

  const headingMatch = lines.length === 1 ? lines[0].match(/^(#{1,4})\s+(.*)$/) : null;
  if (headingMatch) {
    const level = headingMatch[1].length as 1 | 2 | 3 | 4;
    const text = headingMatch[2].trim();
    return { type: "heading", level, text, id: slugify(text) };
  }

  if (lines.every((l) => l.trim().startsWith("- "))) {
    return { type: "list", items: lines.map((l) => l.trim().slice(2).trim()) };
  }

  if (isTableChunk(lines)) {
    const rows = lines.map(splitTableRow);
    const header = rows[0];
    let body = rows.slice(1);
    if (body.length > 0 && isSeparatorRow(lines[1])) {
      body = rows.slice(2);
    }
    // A single-column "table" is really a boxed notice, not tabular data.
    if (header.length === 1) {
      if (body.length === 0) {
        return { type: "callout", text: header[0] };
      }
      if (body.length === 1 && body[0].length === 1) {
        return { type: "callout", title: header[0], text: body[0][0] };
      }
    }
    return { type: "table", header, rows: body };
  }

  const text = lines.join(" ");
  if (isAllCapsEmphasis(text)) {
    return { type: "legal-strong", text };
  }
  return { type: "paragraph", text };
}

export function parsePolicyMarkdown(content: string): Block[] {
  const chunks = content
    .split(/\n\s*\n/)
    .map((c) => c.trim())
    .filter(Boolean);
  return chunks.map(parseChunk);
}

const URL_EMAIL_RE = /(https?:\/\/[^\s|]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

function renderLinkified(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(URL_EMAIL_RE);
  return parts.map((part, i) => {
    if (!part) return null;
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={`${keyPrefix}-${i}`} href={part} target="_blank" rel="noopener noreferrer" className="text-(--text-link) hover:underline">
          {part}
        </a>
      );
    }
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(part)) {
      return (
        <a key={`${keyPrefix}-${i}`} href={`mailto:${part}`} className="text-(--text-link) hover:underline">
          {part}
        </a>
      );
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>;
  });
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  return segments.map((seg, i) => {
    const boldMatch = seg.match(/^\*\*([^*]+)\*\*$/);
    if (boldMatch) {
      return (
        <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-(--text-primary)">
          {renderLinkified(boldMatch[1], `${keyPrefix}-b-${i}`)}
        </strong>
      );
    }
    return <React.Fragment key={`${keyPrefix}-t-${i}`}>{renderLinkified(seg, `${keyPrefix}-t-${i}`)}</React.Fragment>;
  });
}

const HEADING_CLASS: Record<1 | 2 | 3 | 4, string> = {
  1: "bg-h3 text-(--text-primary) mt-12 mb-4 scroll-mt-28",
  2: "bg-h4 text-(--text-primary) mt-8 mb-3 scroll-mt-28",
  3: "bg-body-lg font-semibold text-(--text-primary) mt-6 mb-2 scroll-mt-28",
  4: "bg-body font-semibold text-(--text-secondary) mt-5 mb-2 scroll-mt-28",
};

interface ContactRow {
  [key: string]: React.ReactNode;
}

export function PolicyMarkdown({ content }: { content: string }) {
  const blocks = parsePolicyMarkdown(content);

  return (
    <div>
      {blocks.map((block, i) => {
        const key = `block-${i}`;
        switch (block.type) {
          case "heading": {
            const Tag = (`h${Math.min(block.level + 1, 6)}` as unknown) as "h2" | "h3" | "h4" | "h5";
            return (
              <Tag key={key} id={block.id} className={HEADING_CLASS[block.level]}>
                {block.text}
              </Tag>
            );
          }
          case "paragraph":
            return (
              <p key={key} className="bg-body text-(--text-secondary) mb-4 leading-relaxed">
                {renderInline(block.text, key)}
              </p>
            );
          case "legal-strong":
            return (
              <div
                key={key}
                className="mb-4 rounded-(--bg-radius-md) border border-(--border-default) bg-(--surface-hover) px-4 py-3 bg-body-sm font-medium leading-relaxed tracking-[0.01em] text-(--text-secondary)"
              >
                {renderInline(block.text, key)}
              </div>
            );
          case "list":
            return (
              <ul key={key} className="mb-4 list-disc space-y-1.5 pl-5 marker:text-(--text-muted)">
                {block.items.map((item, j) => (
                  <li key={`${key}-${j}`} className="bg-body text-(--text-secondary) leading-relaxed">
                    {renderInline(item, `${key}-${j}`)}
                  </li>
                ))}
              </ul>
            );
          case "callout":
            return (
              <Alert key={key} variant="warning" title={block.title} className="mb-6">
                <p>{renderInline(block.text, key)}</p>
              </Alert>
            );
          case "table": {
            const columns: TableColumn<ContactRow>[] = block.header.map((h, ci) => ({
              key: `col-${ci}`,
              header: h,
              render: (row) => row[`col-${ci}`],
            }));
            const rows: ContactRow[] = block.rows.map((r, ri) =>
              Object.fromEntries([
                ["__key", `row-${ri}`],
                ...r.map((cell, ci) => [`col-${ci}`, renderInline(cell, `${key}-${ri}-${ci}`)] as const),
              ])
            );
            return (
              <div key={key} className="mb-6">
                <Table columns={columns} rows={rows} rowKey={(row) => row.__key as string} />
              </div>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
