import { describe, it, expect, vi, afterEach } from 'vitest';
import { deriveInboxViewModel } from '@/components/responses/inboxViewModel';

type Input = Parameters<typeof deriveInboxViewModel>[0];

const base = (o: Partial<Input> = {}): Input =>
  ({
    filters: {},
    search: '',
    stages: [{ id: 's1', name: 'Interview' }],
    page: 1,
    form: { fields: [{ fieldId: 'q1', label: 'Satisfaction', type: 'rating' }, { fieldId: 'd1', label: 'Joined', type: 'date' }] },
    stats: { total: 12, unread: 3, byCategory: { new: 4 } },
    firstResponseSubmittedAt: undefined,
    ...o,
  }) as unknown as Input;

afterEach(() => vi.useRealTimers());

describe('deriveInboxViewModel', () => {
  it('has no active filters or summary by default', () => {
    const vm = deriveInboxViewModel(base());
    expect(vm.hasActiveFilters).toBe(false);
    expect(vm.filterSummary).toBe('');
    expect(vm.fieldChipLabel).toBeUndefined();
  });

  it.each([
    ['search', { search: 'bob' }],
    ['stage', { filters: { stageId: 's1' } }],
    ['assignee', { filters: { assigneeId: 'u1' } }],
    ['unread', { filters: { unread: true } }],
    ['field', { filters: { field: 'q1' } }],
    ['tags', { filters: { tagIds: ['t1'] } }],
    ['from', { filters: { from: '2026-01-01' } }],
    ['to', { filters: { to: '2026-01-01' } }],
    ['duplicate', { filters: { duplicate: true } }],
  ])('flags %s as an active filter', (_n, o) => {
    expect(deriveInboxViewModel(base(o as Partial<Input>)).hasActiveFilters).toBe(true);
  });

  it('an empty tag list is not a filter', () => {
    expect(deriveInboxViewModel(base({ filters: { tagIds: [] } } as Partial<Input>)).hasActiveFilters).toBe(false);
  });

  it('builds the chart drill chip', () => {
    expect(deriveInboxViewModel(base({ filters: { field: 'q1', value: 'Very satisfied' } } as Partial<Input>)).fieldChipLabel).toBe('Satisfaction: Very satisfied');
    expect(deriveInboxViewModel(base({ filters: { field: 'q1' } } as Partial<Input>)).fieldChipLabel).toBe('Satisfaction: answered');
    expect(deriveInboxViewModel(base({ filters: { field: 'gone', value: 'x' } } as Partial<Input>)).fieldChipLabel).toBe('Chart filter: x');
  });

  it('shows date buckets as plain words', () => {
    expect(deriveInboxViewModel(base({ filters: { field: 'd1', value: '2026-09' } } as Partial<Input>)).fieldChipLabel).toBe('Joined: Sep 2026');
  });

  it('names filters in the no-results summary', () => {
    const vm = deriveInboxViewModel(
      base({ search: 'bob', filters: { stageId: 's1', unread: true, assigneeId: 'u', tagIds: ['t'], from: '2026-01-01', field: 'q1', value: 'A' } } as Partial<Input>),
    );
    expect(vm.filterSummary).toBe('stage Interview + unread + that assignee + that tag + that date range + "bob" + Satisfaction: A');
  });

  it('names an unknown stage', () => {
    expect(deriveInboxViewModel(base({ filters: { stageId: 'nope' } } as Partial<Input>)).filterSummary).toBe('stage unknown');
  });

  describe('headerFacts', () => {
    it('is undefined until stats load', () => {
      expect(deriveInboxViewModel(base({ stats: undefined })).headerFacts).toBeUndefined();
    });

    it('pluralises and joins counts', () => {
      expect(deriveInboxViewModel(base()).headerFacts).toBe('12 responses · 3 unread · 4 new');
      expect(deriveInboxViewModel(base({ stats: { total: 1, unread: 0, byCategory: { new: 0 } } } as Partial<Input>)).headerFacts).toBe('1 response · 0 unread · 0 new');
    });

    it('adds "last submitted" only on the unfiltered first page', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-12T12:00:00Z'));
      const at = '2026-10-12T10:00:00Z';
      expect(deriveInboxViewModel(base({ firstResponseSubmittedAt: at })).headerFacts).toContain('last submitted 2 hours ago');
      expect(deriveInboxViewModel(base({ firstResponseSubmittedAt: at, page: 2 })).headerFacts).not.toContain('last submitted');
      expect(deriveInboxViewModel(base({ firstResponseSubmittedAt: at, search: 'x' })).headerFacts).not.toContain('last submitted');
    });
  });
});
