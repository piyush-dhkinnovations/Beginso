'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Search } from 'lucide-react';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchResultGroup } from './SearchResultGroup';
import { SEARCH_MAX_CHARS, SEARCH_MIN_CHARS, useGlobalSearch } from '@/hooks/useGlobalSearch';
import { RESPONSES_SCOPE_NOTE, useSearchScopeNote } from '@/hooks/useSearchScopeNote';
import { SEARCH_GROUP_ORDER } from '@/types/search';

interface SearchResultsViewProps {
  /** 'personal' or a workspace slug. */
  scope: string;
}

// Sprint 14 (B10, requirements 2.2/2.4, task 3.11) - wireframe 09. The palette's "See all results"
// destination. `?q=` is trimmed and length-capped; "no query" and "no results" are different states.
export function SearchResultsView({ scope }: SearchResultsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initial = (searchParams.get('q') ?? '').trim().slice(0, SEARCH_MAX_CHARS);
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const search = useGlobalSearch(scope, value);
  const data = search.data;
  const scopeNote = useSearchScopeNote(scope, data?.scope.label);
  const trimmed = value.trim();
  const longEnough = trimmed.length >= SEARCH_MIN_CHARS;

  // Keep the URL shareable: mirror the settled (debounced) query into ?q=.
  useEffect(() => {
    const current = searchParams.get('q') ?? '';
    if (search.debouncedQuery === current) return;
    const params = new URLSearchParams(searchParams.toString());
    if (search.debouncedQuery) params.set('q', search.debouncedQuery);
    else params.delete('q');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [search.debouncedQuery, searchParams, pathname, router]);

  const total = data ? SEARCH_GROUP_ORDER.reduce((sum, key) => sum + data.groups[key].total, 0) : 0;
  const forbidden = isAxiosError(search.error) && search.error.response?.status === 403;

  let body: React.ReactNode;
  if (!longEnough) {
    body = (
      <EmptyState
        illustration="no-results"
        icon={<Search />}
        title="Search forms, responses, members, templates"
        description="Type at least 2 characters."
      />
    );
  } else if (search.isError) {
    body = (
      <EmptyState
        illustration="error"
        icon={<AlertCircle />}
        title={forbidden ? 'You can no longer search here' : 'We could not search right now.'}
        description={forbidden ? 'You are not a member of this workspace.' : undefined}
        actions={forbidden ? undefined : <Button onClick={() => void search.refetch()}>Try again</Button>}
      />
    );
  } else if (search.pending || search.isLoading || !data) {
    body = (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Searching">
        {SEARCH_GROUP_ORDER.map((key) => (
          <Card key={key} padded={false}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="m-3 h-8 animate-pulse rounded-lg bg-(--bg-sunken)" />
            ))}
          </Card>
        ))}
      </div>
    );
  } else if (total === 0) {
    body = (
      <EmptyState
        illustration="no-results"
        icon={<Search />}
        title={`No results for “${trimmed}”`}
        description="Try a shorter or different term."
      />
    );
  } else {
    body = (
      <div className="flex flex-col gap-4">
        {SEARCH_GROUP_ORDER.map((key) => (
          <SearchResultGroup
            key={key}
            groupKey={key}
            group={data.groups[key]}
            query={data.q}
            scope={scope}
            note={key === 'responses' && !data.answerSearch ? RESPONSES_SCOPE_NOTE : undefined}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <PageHeader title="Search" description={scopeNote} />
      <div>
        <Input
          ref={inputRef}
          id="search-page-input"
          aria-label="Search forms, responses, members, templates"
          placeholder="Search forms, responses, members, templates…"
          leftIcon={<Search className="bg-icon" />}
          maxLength={SEARCH_MAX_CHARS}
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {longEnough && data && !search.pending ? (total === 0 ? 'No results' : `${total} results`) : ''}
      </p>
      {body}
    </div>
  );
}
