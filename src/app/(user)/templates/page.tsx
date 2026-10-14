'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LayoutTemplate, Plus } from 'lucide-react';
import { templatesService } from '@/services/templates';
import { workspacesService } from '@/services/workspaces';
import { templateKeys, workspaceKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { TemplatePreviewModal } from '@/components/templates/TemplatePreviewModal';
import { cn } from '@/lib/utils';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';
import type { Template } from '@/types/form';

type SortKey = 'relevant' | 'name' | 'fields';

// Sprint 13 (B6.1–B6.3). One page for both contexts, like FormsPage: `scope` is 'personal' (Beginso templates
// only — A4.1) or a workspace slug (the workspace's OWN templates first, section hidden when empty, then
// Beginso's). Never "My templates" — they belong to the workspace, same rule as forms.
export interface TemplatesPageProps {
  scope?: string;
}

export default function TemplatesPage({ scope = 'personal' }: TemplatesPageProps = {}) {
  const router = useRouter();
  const isWorkspace = scope !== 'personal';
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('relevant');
  const [usingId, setUsingId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<Template | null>(null);

  const { data: templates, isLoading, error } = useQuery({
    queryKey: templateKeys.list(scope),
    queryFn: () => templatesService.getTemplates(scope),
  });

  // The workspace's id (the use-template call wants an id, the URL carries a slug) and display name.
  const { data: workspaces } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: workspacesService.list,
    enabled: isWorkspace,
  });
  const workspace = isWorkspace ? workspaces?.find((w) => w.slug === scope) : undefined;

  const useMutationHook = useMutation({
    mutationFn: (templateId: string) =>
      templatesService.useTemplate(templateId, isWorkspace ? workspace?.id ?? null : null),
    onMutate: (id) => setUsingId(id),
    onSuccess: (data) => router.push(isWorkspace ? `/forms/${data._id}/edit?ws=${scope}` : `/forms/${data._id}/edit`),
    onError: () => {
      toast('Failed to create form from template. Please try again.', 'error');
      setUsingId(null);
    },
  });

  const categories = ['All', ...new Set((templates ?? []).map((t) => t.category))];

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = (templates ?? []).filter(
      (t) =>
        (activeCategory === 'All' || t.category === activeCategory) &&
        (!term || `${t.name} ${t.category} ${t.description}`.toLowerCase().includes(term))
    );
    if (sort === 'name') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'fields') return [...list].sort((a, b) => b.fields.length - a.fields.length);
    return list;
  }, [templates, activeCategory, search, sort]);

  // Two labelled sources. Search and category above already span both; only the grouping happens here.
  const workspaceVisible = visible.filter((t) => t.source === 'workspace');
  const builtInVisible = visible.filter((t) => t.source !== 'workspace');
  const workspaceName = workspace?.name ?? 'Workspace';

  const hasTemplates = !!templates && templates.length > 0;
  // A lone last card in the 3-column grid goes wide, so the final row has no hole.
  const wideLast = visible.length > 2 && visible.length % 3 === 1;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <PageHeader
        title="Templates"
        description={
          isWorkspace
            ? 'Start from a template your team saved, or one of Beginso\'s.'
            : 'Start from a pre-built template instead of a blank form.'
        }
        actionsAlign="center"
        actions={
          // One slim row — copy on the left, the button on the right — so the header stays the height
          // of the title instead of growing a tall card that pushes the filters down.
          <Card className="flex-row flex-wrap items-center gap-x-5 gap-y-3 px-4! py-3!">
            <div className="min-w-0">
              <h2 className="bg-body font-semibold text-(--text-primary)">Need a custom form?</h2>
              <p className="bg-body-sm text-(--text-muted)">Start with a blank form and build it your way.</p>
            </div>
            <Button onClick={() => router.push(isWorkspace ? `/forms/new?ws=${encodeURIComponent(scope)}` : '/forms/new')}>
              <Plus size={16} className="mr-2" aria-hidden="true" />
              Create a blank form
            </Button>
          </Card>
        }
      />

      {isLoading ? (
        <CardGridSkeleton count={6} media />
      ) : error ? (
        <div className="flex items-center justify-center py-20">
          <p className="bg-body text-(--error-text)">Failed to load templates. Please refresh.</p>
        </div>
      ) : !hasTemplates ? (
        <EmptyState
          illustration="empty-forms"
          icon={<LayoutTemplate />}
          title="No templates available yet"
          description="Check back soon for pre-built starter templates."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={activeCategory === category}
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    'min-h-8 rounded-full px-4 bg-body-sm font-semibold capitalize transition-colors',
                    activeCategory === category
                      ? 'bg-(--action-primary) text-(--text-on-brand)'
                      : 'border border-(--border-default) bg-(--surface-card) text-(--text-secondary) hover:bg-(--surface-hover)'
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <div className="flex-1 sm:w-56 sm:flex-none">
                <Input
                  id="templates-search"
                  aria-label="Search templates"
                  placeholder="Search templates…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="w-40 shrink-0">
                <Select id="templates-sort" aria-label="Sort templates" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                  <option value="relevant">Most relevant</option>
                  <option value="name">Name (A–Z)</option>
                  <option value="fields">Most fields</option>
                </Select>
              </div>
            </div>
          </div>

          <p className="bg-caption text-(--text-muted)" aria-live="polite">
            Showing {visible.length} template{visible.length !== 1 ? 's' : ''}
          </p>

          {visible.length === 0 ? (
            <EmptyState
              illustration="no-results"
              icon={<LayoutTemplate />}
              title="No matching templates"
              description="Try a different search term or category."
              actions={
                <Button variant="secondary" onClick={() => { setSearch(''); setActiveCategory('All'); }}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-8">
              {workspaceVisible.length > 0 && (
                <section aria-labelledby="workspace-templates-heading" className="flex flex-col gap-3">
                  <h2 id="workspace-templates-heading" className="bg-h5 font-semibold text-(--text-primary)">
                    {workspaceName} templates
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {workspaceVisible.map((template) => (
                      <TemplateCard
                        key={template._id}
                        template={template}
                        onUse={(id) => useMutationHook.mutate(id)}
                        onPreview={setPreviewing}
                        isLoading={usingId === template._id}
                      />
                    ))}
                  </div>
                </section>
              )}
              {builtInVisible.length > 0 && (
                <section aria-labelledby="beginso-templates-heading" className="flex flex-col gap-3">
                  <h2 id="beginso-templates-heading" className="bg-h5 font-semibold text-(--text-primary)">
                    Beginso templates
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {builtInVisible.map((template, index) => (
                      <TemplateCard
                        key={`${template._id}-${index}`}
                        template={template}
                        onUse={(id) => useMutationHook.mutate(id)}
                        onPreview={setPreviewing}
                        isLoading={usingId === template._id}
                        wide={workspaceVisible.length === 0 && wideLast && index === builtInVisible.length - 1}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}

      <TemplatePreviewModal
        template={previewing}
        onClose={() => setPreviewing(null)}
        onUse={(id) => useMutationHook.mutate(id)}
        isLoading={previewing !== null && usingId === previewing._id}
      />
    </div>
  );
}
