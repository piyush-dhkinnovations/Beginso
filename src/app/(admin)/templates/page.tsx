'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LayoutTemplate } from 'lucide-react';
import { templatesService } from '@/services/templates';
import { useToast } from '@/components/common/Toast';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { EmptyState } from '@/components/common/EmptyState';
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
    <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-fade-in">
      <DashboardHeader title="Templates" subtitle="Start from a pre-built template instead of a blank form." />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-48 rounded-lg border border-neutral-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-body text-error">Failed to load templates. Please refresh.</p>
        </div>
      ) : !templates || templates.length === 0 ? (
        <EmptyState icon={<LayoutTemplate />} heading="No templates available yet" body="Check back soon for pre-built starter templates." />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={cn(
                  'px-3 h-8 rounded-full text-body-sm font-semibold capitalize transition-colors',
                  activeCategory === category
                    ? 'bg-brand-700 text-white'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                )}
              >
                {category}
              </button>
            ))}
          </div>

          <p className="text-caption text-neutral-400">
            Showing {filtered?.length ?? 0} template{(filtered?.length ?? 0) !== 1 ? 's' : ''}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered?.map((template) => (
              <TemplateCard
                key={template._id}
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
