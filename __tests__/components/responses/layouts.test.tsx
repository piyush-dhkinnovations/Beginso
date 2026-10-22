import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { LAYOUTS } from '@/components/responses/layouts';
import { RESPONSE_LAYOUTS } from '@/types/responseView';
import { submittedItems, TOTAL_QUESTIONS } from '../../fixtures/submittedResponse';

vi.mock('@/components/responses/answers/FileAnswer', () => ({ FileAnswer: () => <div /> }));
vi.mock('@/components/responses/answers/ImageAnswer', () => ({ ImageAnswer: () => <div /> }));
vi.mock('@/components/responses/answers/UrlAnswer', () => ({
  UrlAnswer: ({ value, small }: { value: string; small?: boolean }) => <a href={value} data-small={String(!!small)}>{value}</a>,
}));

const items = submittedItems();
const base = { items, responseId: 'r1', scope: 'acme', showNumbers: true, density: 'comfortable' as const, query: '' };

describe('the three layouts show the same data', () => {
  it('has exactly the layouts the server allows', () => {
    expect(Object.keys(LAYOUTS).sort()).toEqual([...RESPONSE_LAYOUTS].sort());
  });

  it.each(RESPONSE_LAYOUTS)('%s: every question appears once, in form order, with its answer', (name) => {
    const Layout = LAYOUTS[name];
    const { container } = render(<Layout {...base} />);
    const text = container.textContent ?? '';
    expect(items).toHaveLength(TOTAL_QUESTIONS);
    let at = -1;
    for (const it of items) {
      const next = text.indexOf(`${it.number}.`, at + 1);
      expect(next, `question ${it.number} is shown after the previous one`).toBeGreaterThan(at);
      at = next;
    }
    for (const needle of ['Night Train', 'Asha Rao', 'Blue Door Films', 'asha.rao@example.com', 'Pune', 'Line 12 of the synopsis']) {
      expect(text).toContain(needle);
    }
  });

  it.each(RESPONSE_LAYOUTS)('%s: question numbers can be turned off', (name) => {
    const Layout = LAYOUTS[name];
    const { container } = render(<Layout {...base} showNumbers={false} />);
    expect(container.textContent).not.toMatch(/\b1\.\s*Email address/);
    expect(container.textContent).toContain('Email address');
  });

  it.each(RESPONSE_LAYOUTS)('%s: search matches are highlighted', (name) => {
    const Layout = LAYOUTS[name];
    const { container } = render(<Layout {...base} query="night" />);
    expect(container.querySelector('mark')?.textContent?.toLowerCase()).toBe('night');
  });

  it.each(RESPONSE_LAYOUTS)('%s: renders nothing broken for 0 answers and for 1 answer', (name) => {
    const Layout = LAYOUTS[name];
    const none = render(<Layout {...base} items={[]} />);
    expect(none.container.querySelectorAll('h4, th, tr')).toHaveLength(0);
    none.unmount();
    const one = render(<Layout {...base} items={items.slice(0, 1)} />);
    expect(one.container.textContent).toContain('Email address');
  });

  it.each(RESPONSE_LAYOUTS)('%s: copes with 100 answers', (name) => {
    const Layout = LAYOUTS[name];
    const many = Array.from({ length: 100 }, (_, i) => ({ ...items[2], key: `k${i}`, number: i + 1, label: `Q${i + 1}` }));
    const { container } = render(<Layout {...base} items={many} />);
    expect(container.textContent).toContain('Q100');
  });
});

describe('Grid', () => {
  it('is two columns where the card is wide enough, with long answers across both', () => {
    const { container } = render(<LAYOUTS.grid {...base} />);
    const grid = container.firstElementChild!;
    expect(grid).toHaveClass('@lg:grid-cols-2');
    const rowOf = (label: string) => screen.getByRole('heading', { name: new RegExp(label) }).closest('div.group')!;
    expect(rowOf('SYNOPSIS - in detail')).toHaveClass('@lg:col-span-2'); // long text
    expect(rowOf('Address')).toHaveClass('@lg:col-span-2');
    expect(rowOf('Trailer Link')).toHaveClass('@lg:col-span-2'); // link
    expect(rowOf('Content Title')).not.toHaveClass('@lg:col-span-2'); // short answer shares the row
    expect(rowOf('Language')).not.toHaveClass('@lg:col-span-2');
  });
});

describe('List', () => {
  it('is one column with more room than Grid', () => {
    const { container } = render(<LAYOUTS.list {...base} />);
    expect(container.firstElementChild).not.toHaveClass('grid');
    const row = screen.getByRole('heading', { name: /Content Title/ }).closest('div.group')!;
    expect(row).toHaveClass('py-3.5');
  });

  it('compact density tightens it', () => {
    render(<LAYOUTS.list {...base} density="compact" />);
    expect(screen.getByRole('heading', { name: /Content Title/ }).closest('div.group')).toHaveClass('py-1.25');
  });
});

describe('Table', () => {
  it('is a real table: a header row, then one row per question with the question in a row header', () => {
    render(<LAYOUTS.table {...base} />);
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(TOTAL_QUESTIONS + 1);
    const header = within(table).getByRole('rowheader', { name: /Content Title/ });
    expect(header.closest('tr')).toHaveTextContent('Night Train');
  });

  it('names its two columns, Question and Answer, so nobody has to guess', () => {
    render(<LAYOUTS.table {...base} />);
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Question', 'Answer']);
  });

  it('splits the width 30 / 70: the question column is 30%, the answer column 70%', () => {
    const { container } = render(<LAYOUTS.table {...base} />);
    const cols = container.querySelectorAll('colgroup > col');
    expect(cols).toHaveLength(2);
    expect(cols[0]).toHaveClass('w-[30%]');
    expect(cols[1]).toHaveClass('w-[70%]');
    expect(container.querySelector('table')).toHaveClass('table-fixed'); // so the columns keep those widths
  });

  it('shows links as small cards', () => {
    render(<LAYOUTS.table {...base} />);
    const links = screen.getAllByRole('link').filter((a) => a.getAttribute('data-small') !== null);
    expect(links.length).toBeGreaterThan(0);
    expect(links.every((a) => a.getAttribute('data-small') === 'true')).toBe(true);
  });

  it('Grid and List ask for the full link card instead', () => {
    render(<LAYOUTS.list {...base} />);
    expect(screen.getAllByRole('link').filter((a) => a.getAttribute('data-small') === 'true')).toHaveLength(0);
  });
});
