'use client';

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useForm, type FieldError, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import type { FormField } from '@/types/form';
import type { PublicFormSchema, FieldValue, UploadState, FieldRendererProps } from '@/types/publicForm';
import { evaluateLogicRules, getVisiblePageFields, buildAnswers } from '@/lib/logicEngine';
import { buildPublicFormSchema } from '@/lib/schemas/publicFormSchema';
import { publicFormService } from '@/services/publicForm';
import { saveDraft, loadDraft, clearDraft } from '@/lib/formDraft';
import { Button } from '@/components/ui/Button';
import { FormBanner } from './FormBanner';
import { FormProgress } from './FormProgress';
import { ShortTextRenderer } from './fields/ShortTextRenderer';
import { LongTextRenderer } from './fields/LongTextRenderer';
import { EmailRenderer } from './fields/EmailRenderer';
import { PhoneRenderer } from './fields/PhoneRenderer';
import { NumberRenderer } from './fields/NumberRenderer';
import { DateRenderer } from './fields/DateRenderer';
import { DropdownRenderer } from './fields/DropdownRenderer';
import { MultipleChoiceRenderer } from './fields/MultipleChoiceRenderer';
import { CheckboxRenderer } from './fields/CheckboxRenderer';
import { FileUploadRenderer } from './fields/FileUploadRenderer';

interface PublicFormShellProps {
  schema: PublicFormSchema;
  slug: string;
  /** User-only "see it as a respondent would" mode — disables the real submit network call. */
  previewMode?: boolean;
}

// long_text/choice/file fields need room to wrap or list options — always full-width,
// even in the two-column layout. The rest pair up two-per-row.
const FULL_WIDTH_TYPES = new Set<FormField['type']>(['long_text', 'multiple_choice', 'checkbox', 'file_upload']);

// file_upload is dispatched separately below — it needs onFileChange/onUploadStateChange,
// which the other 9 renderers don't take, so it doesn't fit this shared prop shape.
const RENDERER_MAP: Record<Exclude<FormField['type'], 'file_upload'>, ComponentType<FieldRendererProps>> = {
  short_text: ShortTextRenderer,
  long_text: LongTextRenderer,
  email: EmailRenderer,
  phone: PhoneRenderer,
  number: NumberRenderer,
  date: DateRenderer,
  dropdown: DropdownRenderer,
  multiple_choice: MultipleChoiceRenderer,
  checkbox: CheckboxRenderer,
};

export function PublicFormShell({ schema, slug, previewMode }: PublicFormShellProps) {
  const router = useRouter();
  const sortedPages = useMemo(() => [...schema.pages].sort((a, b) => a.order - b.order), [schema.pages]);
  const layout = schema.settings.layout ?? 'single_column';

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewSubmitted, setPreviewSubmitted] = useState(false);
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>({});
  const [files, setFiles] = useState<Record<string, File>>({});

  // Read fresh inside the resolver (called at validation time) — avoids a stale schema
  // if we captured hiddenFieldIds by closure at useForm() call time instead.
  const hiddenFieldIdsRef = useRef<Set<string>>(new Set());

  // Guards the debounced draft-save effect below against a real race: a save scheduled
  // just before Submit is clicked can still be pending when the submission succeeds and
  // clearDraft() runs — without this, that stale timeout fires afterward and resurrects
  // the just-submitted draft. Found via the e2e suite, not by inspection.
  const submittedRef = useRef(false);

  const methods = useForm<Record<string, FieldValue>>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    // buildPublicFormSchema's shape is dynamic (keyed by fieldId), so Zod infers its output as
    // Record<string, unknown> rather than our known Record<string, FieldValue> — safe to assert,
    // every branch in buildPublicFormSchema only ever produces a string/string[]/number/undefined.
    resolver: ((values, context, options) =>
      zodResolver(buildPublicFormSchema(schema.fields, hiddenFieldIdsRef.current))(
        values as Record<string, unknown>,
        context,
        options as never
      )) as Resolver<Record<string, FieldValue>>,
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- watch() must return live values every render for real-time logic evaluation (Requirement 5.1); this is inherent to RHF's watch() API, not a bug.
  const watchedValues = methods.watch();
  const hiddenFieldIds = evaluateLogicRules(schema.fields, watchedValues);
  const hiddenFieldIdsKey = Array.from(hiddenFieldIds).sort().join(',');

  useEffect(() => {
    hiddenFieldIdsRef.current = hiddenFieldIds;
  });

  // Fields hidden by a logic rule are unmounted from RHF state so they're never submitted
  // and never contribute a required-validation error (Requirements 5.3, 5.5).
  useEffect(() => {
    hiddenFieldIds.forEach((fieldId) => {
      methods.unregister(fieldId);
      methods.setValue(fieldId, undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the stable string form of the set on purpose
  }, [hiddenFieldIdsKey]);

  // File values are placeholder filenames, not the actual File — there's nothing
  // real to restore for them after a reload, so they're excluded from the saved draft.
  const fileFieldIds = useMemo(
    () => new Set(schema.fields.filter((f) => f.type === 'file_upload').map((f) => f.fieldId)),
    [schema.fields]
  );

  // Restore an in-progress draft once on mount, so a reload or dropped connection
  // mid-fill doesn't force the respondent to re-enter everything from scratch.
  useEffect(() => {
    const draft = loadDraft(slug);
    if (!draft) return;
    methods.reset(draft.values);
    setCurrentPageIndex((i) => {
      const restored = draft.pageIndex;
      return restored >= 0 && restored < sortedPages.length ? restored : i;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore-on-mount only, deliberately not re-run on every field change
  }, [slug]);

  // Save the draft after a short pause in typing — every keystroke would be wasteful.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (submittedRef.current) return; // see submittedRef's comment above
      const values = Object.fromEntries(
        Object.entries(watchedValues).filter(([fieldId]) => fieldId !== '_hp' && !fileFieldIds.has(fieldId))
      );
      saveDraft(slug, { pageIndex: currentPageIndex, values });
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- watchedValues is a new object every render; JSON below is the real dependency
  }, [JSON.stringify(watchedValues), currentPageIndex, slug]);

  const currentPage = sortedPages[currentPageIndex];
  const currentPageFields = currentPage
    ? getVisiblePageFields(schema.fields, currentPage.id, hiddenFieldIds)
    : [];
  const totalPages = sortedPages.length;
  const isLastPage = currentPageIndex === totalPages - 1;
  const primaryColor = schema.branding.primaryColor ?? '#1D4ED8';

  async function handleNext() {
    const fieldIds = currentPageFields.map((f) => f.fieldId);
    const valid = await methods.trigger(fieldIds);
    if (!valid) {
      const firstErrorId = fieldIds.find((id) => methods.formState.errors[id]);
      if (firstErrorId) {
        document.getElementById(firstErrorId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    setCurrentPageIndex((i) => i + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleBack() {
    setCurrentPageIndex((i) => i - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onSubmit(values: Record<string, FieldValue>) {
    setSubmitError(null);

    if (previewMode) {
      setPreviewSubmitted(true);
      return;
    }

    setIsSubmitting(true);

    const answers = buildAnswers(schema.fields, hiddenFieldIds, values);
    const honeypot = typeof values._hp === 'string' ? values._hp : '';
    const result = await publicFormService.submitForm(slug, { answers }, files, honeypot);

    if (result.ok) {
      submittedRef.current = true;
      clearDraft(slug);
      const params = new URLSearchParams({ title: schema.title });
      if (schema.settings.successMessage) params.set('message', schema.settings.successMessage);
      router.push(`/f/${slug}/success?${params.toString()}`);
      return;
    }

    setIsSubmitting(false);
    if (result.status === 429) {
      setSubmitError('Too many submissions from your connection. Please wait a minute and try again.');
    } else if (result.status === 422 && result.message) {
      setSubmitError(result.message);
    } else {
      setSubmitError('Something went wrong. Please try again.');
    }
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!isLastPage) {
      e.preventDefault();
      return;
    }
    methods.handleSubmit(onSubmit)(e);
  }

  const anyUploading = Object.values(uploadStates).some((s) => s.status === 'uploading');
  const submitDisabled = isSubmitting || anyUploading;

  const fieldsContainerClass =
    layout === 'two_column'
      ? 'mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5'
      : layout === 'compact'
      ? 'mt-6 flex flex-col gap-3'
      : 'mt-6 flex flex-col gap-5';

  const cardMaxWidth = layout === 'two_column' ? 'max-w-[680px]' : layout === 'compact' ? 'max-w-[560px]' : 'max-w-[520px]';

  return (
    <div className={`bg-neutral-50 flex justify-center p-4 ${previewMode ? '' : 'min-h-screen'}`}>
      <div className={`bg-white rounded-xl border border-neutral-200 shadow-card w-full overflow-hidden ${cardMaxWidth}`}>
        <FormBanner branding={schema.branding} />
        <form onSubmit={handleFormSubmit} noValidate className={schema.branding.logoUrl ? 'p-6 pt-8' : 'p-6'}>
          <FormProgress currentPage={currentPageIndex + 1} totalPages={totalPages} />

          <h1 className="text-display text-neutral-900">{currentPage?.title ?? schema.title}</h1>
          {currentPage?.description && <p className="text-body text-neutral-500 mt-1">{currentPage.description}</p>}

          {/* Honeypot: real respondents never see or reach this; a bot's scripted fill-everything
              behavior does, and that value is passed through to the backend as-is (Requirement 6.5). */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] w-px h-px overflow-hidden"
            {...methods.register('_hp')}
          />

          <div className={fieldsContainerClass}>
            {currentPageFields.map((field) => {
              const fieldError = methods.formState.errors[field.fieldId] as FieldError | undefined;
              const spanClass = layout === 'two_column' && FULL_WIDTH_TYPES.has(field.type) ? 'sm:col-span-2' : '';

              if (field.type === 'file_upload') {
                return (
                  <div key={field.fieldId} className={spanClass}>
                    <FileUploadRenderer
                      field={field}
                      control={methods.control}
                      register={methods.register}
                      trigger={methods.trigger}
                      setValue={methods.setValue}
                      error={fieldError}
                      disabled={isSubmitting}
                      onFileChange={(file) =>
                        setFiles((prev) => {
                          const next = { ...prev };
                          if (file) next[field.fieldId] = file;
                          else delete next[field.fieldId];
                          return next;
                        })
                      }
                      onUploadStateChange={(state) =>
                        setUploadStates((prev) => ({ ...prev, [field.fieldId]: state }))
                      }
                    />
                  </div>
                );
              }

              const Renderer = RENDERER_MAP[field.type];
              return (
                <div key={field.fieldId} className={spanClass}>
                  <Renderer
                    field={field}
                    control={methods.control}
                    register={methods.register}
                    trigger={methods.trigger}
                    setValue={methods.setValue}
                    error={fieldError}
                    disabled={isSubmitting}
                    inline={layout === 'compact' && !FULL_WIDTH_TYPES.has(field.type)}
                  />
                </div>
              );
            })}
          </div>

          {submitError && (
            <p role="alert" className="text-caption text-error font-semibold mt-4">
              {submitError}
            </p>
          )}

          {previewMode && previewSubmitted ? (
            <p className="mt-6 text-body-sm text-center text-neutral-500 font-medium">
              This is a preview — nothing was submitted.
            </p>
          ) : (
            <div className="mt-6 flex gap-3">
              {currentPageIndex > 0 && (
                <Button key="back" type="button" variant="secondary" className="flex-1" onClick={handleBack} disabled={isSubmitting}>
                  Back
                </Button>
              )}
              {isLastPage ? (
                <Button
                  key="submit"
                  type="submit"
                  className="flex-1"
                  style={{ backgroundColor: primaryColor }}
                  isLoading={isSubmitting}
                  disabled={submitDisabled}
                  aria-label={isSubmitting ? 'Submitting your response...' : undefined}
                >
                  Submit
                </Button>
              ) : (
                <Button key="next" type="button" className="flex-1" style={{ backgroundColor: primaryColor }} onClick={handleNext}>
                  Next
                </Button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
