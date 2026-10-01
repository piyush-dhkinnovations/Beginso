'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LayoutTemplate } from 'lucide-react';
import { templatesService } from '@/services/templates';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { cn } from '@/lib/utils';

export default function TemplatesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState('All');
  const [usingId, setUsingId] = useState<string | null>(null);

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['templates'],
    queryFn: templatesService.getTemplates,
  });

  const useMutationHook = useMutation({
    mutationFn: (templateId: string) => templatesService.useTemplate(templateId),
    onMutate: (id) => setUsingId(id),
    onSuccess: (data) => router.push(`/forms/${data._id}/edit`),
    onError: () => {
      toast('Failed to create form from template. Please try again.', 'error');
      setUsingId(null);
    },
  });

  const categories = ['All', ...new Set((templates ?? []).map((t) => t.category))];
  const filtered = activeCategory === 'All' ? templates : templates?.filter((t) => t.category === activeCategory);

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <PageHeader title="Templates" description="Start from a pre-built template instead of a blank form." />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-lg border border-(--border-default) bg-(--surface-card) p-6 animate-pulse">
              <div className="flex items-start justify-between gap-2">
                <div className="h-5 bg-(--border-default) rounded w-2/5" />
                <div className="h-5 w-16 bg-(--bg-sunken) rounded shrink-0" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-(--bg-sunken) rounded w-full" />
                <div className="h-3 bg-(--bg-sunken) rounded w-4/5" />
              </div>
              <div className="h-3 bg-(--bg-sunken) rounded w-1/4" />
              <div className="h-9 bg-(--border-default) rounded w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20">
          <p className="bg-body text-(--error-text)">Failed to load templates. Please refresh.</p>
        </div>
      ) : !templates || templates.length === 0 ? (
        <EmptyState illustration="empty-forms" icon={<LayoutTemplate />} title="No templates available yet" description="Check back soon for pre-built starter templates." />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={cn(
                  'px-3 min-h-11 rounded-full bg-body-sm font-semibold capitalize transition-colors',
                  activeCategory === category
                    ? 'bg-(--action-primary-hover) text-(--text-on-brand)'
                    : 'bg-(--surface-card) border border-(--border-default) text-(--text-secondary) hover:bg-(--surface-hover)'
                )}
              >
                {category}
              </button>
            ))}
          </div>

          <p className="bg-caption text-(--text-muted)">
            Showing {filtered?.length ?? 0} template{(filtered?.length ?? 0) !== 1 ? 's' : ''}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered?.map((template, index) => (
              <TemplateCard
                key={`${template._id}-${index}`}
                template={template}
                onUse={(id) => useMutationHook.mutate(id)}
                isLoading={usingId === template._id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
