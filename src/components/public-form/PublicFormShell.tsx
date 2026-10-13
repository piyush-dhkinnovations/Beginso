'use client';

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useForm, type FieldError, type FieldErrors, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import type { FormField } from '@/types/form';
import type { PublicFormSchema, FieldValue, UploadState, FieldRendererProps, Answer } from '@/types/publicForm';
import { evaluateLogicRules, getVisiblePageFields, buildAnswers } from '@/lib/logicEngine';
import { buildPublicFormSchema } from '@/lib/schemas/publicFormSchema';
import { publicFormService } from '@/services/publicForm';
import { saveDraft, loadDraft, clearDraft } from '@/lib/formDraft';
import { Button } from '@/components/ui/Button';
import { normaliseLayout } from '@/lib/layoutPresets';
import { brandButtonStyle, brandShowsProgress } from '@/lib/formTheme';
import { LAYOUT_COMPONENTS, fieldsClassFor, isGrouped } from './layouts';
import { parseEmbedOptions, carryEmbedSearch } from '@/lib/embed/embedParams';
import { resolvePrefill } from '@/lib/embed/prefill';
import { FormProgress } from './FormProgress';
import { ReviewStep } from './ReviewStep';
import { EmailStep } from './EmailStep';
import { LoginGate } from './LoginGate';
import { useAuth } from '@/hooks/useAuth';
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
import { ImageUploadRenderer } from './fields/ImageUploadRenderer';
import { RatingRenderer } from './fields/RatingRenderer';
import { YesNoRenderer } from './fields/YesNoRenderer';
import { UrlRenderer } from './fields/UrlRenderer';
import { TimeRenderer } from './fields/TimeRenderer';
import { DateTimeRenderer } from './fields/DateTimeRenderer';
import { CurrencyRenderer } from './fields/CurrencyRenderer';
import { AddressRenderer } from './fields/AddressRenderer';
import { SignatureRenderer } from './fields/SignatureRenderer';

interface PublicFormShellProps {
  schema: PublicFormSchema;
  slug: string;
  /** User-only "see it as a respondent would" mode — disables the real submit network call. */
  previewMode?: boolean;
  /**
   * Preview only (Sprint 13, CF2.6). When given, a secondary "Send a test submission" button appears: it runs the
   * form's own validation and hands the answers to this callback, which posts them as an `isTest` response. The
   * normal Submit still submits nothing. Rejects with a message for a role that may not send one.
   */
  onTestSubmit?: (answers: Answer[]) => Promise<void>;
  /** The request's query string (embed options: cover, progress, title, theme, prefill[...]). Read on the server, so SSR and hydration agree. */
  search?: string;
}

// long_text/choice/file fields need room to wrap or list options — always full-width,
// even in the two-column layout. The rest pair up two-per-row.
const FULL_WIDTH_TYPES = new Set<FormField['type']>(['long_text', 'multiple_choice', 'checkbox', 'file_upload', 'image_upload', 'address', 'signature']);

// file_upload and image_upload are dispatched separately below — they need onFileChange/onFilesChange,
// which the other renderers don't take, so they don't fit this shared prop shape.
const RENDERER_MAP: Record<Exclude<FormField['type'], 'file_upload' | 'image_upload'>, ComponentType<FieldRendererProps>> = {
  short_text: ShortTextRenderer,
  long_text: LongTextRenderer,
  email: EmailRenderer,
  phone: PhoneRenderer,
  number: NumberRenderer,
  date: DateRenderer,
  dropdown: DropdownRenderer,
  multiple_choice: MultipleChoiceRenderer,
  checkbox: CheckboxRenderer,
  rating: RatingRenderer,
  yes_no: YesNoRenderer,
  url: UrlRenderer,
  time: TimeRenderer,
  datetime: DateTimeRenderer,
  currency: CurrencyRenderer,
  address: AddressRenderer,
  signature: SignatureRenderer,
};

export function PublicFormShell({ schema, slug, previewMode: previewProp, onTestSubmit, search = '' }: PublicFormShellProps) {
  const router = useRouter();
  const embedOpts = useMemo(() => parseEmbedOptions(search), [search]);
  const previewMode = previewProp || embedOpts.preview;
  const sortedPages = useMemo(() => [...schema.pages].sort((a, b) => a.order - b.order), [schema.pages]);
  const layout = normaliseLayout(schema.settings.layout);
  const isGuided = layout === 'guided';

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  // Guided only: which question of the current page is showing. Page-level draft persistence is
  // unchanged; a restored draft resumes at the first question of its page.
  const [questionIndex, setQuestionIndex] = useState(0);
  // Review-before-submit (D1.2). The review screen replaces the page body; values stay in RHF.
  const [showReview, setShowReview] = useState(false);
  // Access modes (Sprint 13, D1.1). The mode is read from the schema; the SERVER enforces it independently.
  //   tracked → a built-in "Your email" input outside the answers.   login → a signed-in account, via ticket.
  const accessMode = schema.settings.accessMode ?? 'open';
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [testState, setTestState] = useState<{ status: 'idle' | 'sending' | 'sent' | 'error'; message?: string }>({ status: 'idle' });
  const [respondentEmail, setRespondentEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewSubmitted, setPreviewSubmitted] = useState(false);
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>({});
  const [files, setFiles] = useState<Record<string, File[]>>({});

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

  // Count this visit once per tab session so the completion rate on Form Overview has a denominator
  // (the backend also counts one view per visitor per hour, so a reload cannot inflate it).
  // Sprint 13 (F15, requirements.md 3.3): a preview is never a view — the owner opening Preview must
  // not move the completion-rate denominator.
  useEffect(() => {
    if (previewMode) return;
    try {
      const key = `beginso:viewed:${slug}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // storage blocked (private mode): count it anyway, the backend de-duplicates
    }
    publicFormService.recordView(slug);
  }, [slug, previewMode]);

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
  // A drawn signature is a large data URL, so it is kept out of localStorage too.
  const fileFieldIds = useMemo(
    () => new Set(schema.fields.filter((f) => f.type === 'file_upload' || f.type === 'image_upload' || f.type === 'signature').map((f) => f.fieldId)),
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

  // Embed/link pre-fill (?prefill[key]=value): only fields that exist, never files, values validated per type, never
  // submitted automatically. Runs after the draft restore so an explicit link wins over a stale draft.
  useEffect(() => {
    const values = resolvePrefill(schema.fields, embedOpts.prefill);
    for (const [fieldId, value] of Object.entries(values)) methods.setValue(fieldId, value, { shouldDirty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount/link, not on every field change
  }, [slug, search]);

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

  // Guided shows one question at a time; every other layout shows the whole page.
  const shownFields = isGuided ? currentPageFields.slice(questionIndex, questionIndex + 1) : currentPageFields;
  const isLastStep = isLastPage && (!isGuided || questionIndex >= currentPageFields.length - 1);
  // Decision 18: on for 2+ page forms, off for single-page, and ALWAYS on for Guided (it hides earlier
  // answers by design, so it owes the respondent a summary).
  const reviewEnabled = totalPages >= 2 || isGuided;

  // Guided progress: question N of M across every page, counting only fields currently visible.
  const guidedQuestion = isGuided
    ? (() => {
        const perPage = sortedPages.map((p) => getVisiblePageFields(schema.fields, p.id, hiddenFieldIds).length);
        const before = perPage.slice(0, currentPageIndex).reduce((sum, n) => sum + n, 0);
        return { current: before + questionIndex + 1, total: perPage.reduce((sum, n) => sum + n, 0) };
      })()
    : undefined;

  async function handleNext() {
    const fieldIds = shownFields.map((f) => f.fieldId);
    const valid = await methods.trigger(fieldIds);
    if (!valid) {
      const firstErrorId = fieldIds.find((id) => methods.formState.errors[id]);
      if (firstErrorId) {
        document.getElementById(firstErrorId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    if (isGuided && questionIndex < currentPageFields.length - 1) {
      setQuestionIndex((i) => i + 1);
      return;
    }
    setCurrentPageIndex((i) => i + 1);
    setQuestionIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleBack() {
    if (isGuided && questionIndex > 0) {
      setQuestionIndex((i) => i - 1);
      return;
    }
    if (isGuided) {
      // Land on the LAST question of the previous page.
      const prev = sortedPages[currentPageIndex - 1];
      const prevCount = prev ? getVisiblePageFields(schema.fields, prev.id, hiddenFieldIds).length : 0;
      setQuestionIndex(Math.max(0, prevCount - 1));
    }
    setCurrentPageIndex((i) => i - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Last step of a review-enabled form: validate EVERYTHING (the resolver covers every page), then show
  // the review screen. Invalid → the existing onInvalid jumps back to the earliest page with an error.
  async function handleReview() {
    setSubmitError(null);
    await methods.handleSubmit(() => {
      setShowReview(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, onInvalid)();
  }

  async function onSubmit(values: Record<string, FieldValue>) {
    setSubmitError(null);

    if (previewMode) {
      setPreviewSubmitted(true);
      return;
    }

    // Mode 2: the address is required and checked BEFORE anything is sent.
    if (accessMode === 'tracked') {
      const candidate = respondentEmail.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) {
        setEmailError('Please enter a valid email address.');
        return;
      }
      setEmailError(null);
    }

    setIsSubmitting(true);

    try {
      const answers = buildAnswers(schema.fields, hiddenFieldIds, values);
      // The resolver strips keys the schema does not know, so `values` never carries the hidden `_hp` input: read it from the form state.
      const hp = methods.getValues('_hp');
      const honeypot = typeof hp === 'string' ? hp : '';

      // Mode 3: a one-shot ticket proves the signed-in account without the browser ever holding a session token.
      let ticket: string | undefined;
      if (accessMode === 'login') {
        try {
          ticket = (await publicFormService.getSubmitTicket(slug)).ticket;
        } catch {
          setSubmitError('We could not confirm your sign-in. Please sign in again and retry.');
          return;
        }
      }

      const result = await publicFormService.submitForm(
        slug,
        { answers, ...(accessMode === 'tracked' ? { respondentEmail: respondentEmail.trim() } : {}) },
        files,
        honeypot,
        { ticket }
      );

      if (result.ok) {
        submittedRef.current = true;
        clearDraft(slug);
        const params = new URLSearchParams(carryEmbedSearch(search));
        params.set('title', schema.title);
        if (schema.settings.successMessage) params.set('message', schema.settings.successMessage);
        router.push(`/f/${slug}/success?${params.toString()}`);
        return;
      }

      if (result.code === 'EMAIL_REQUIRED') {
        setEmailError(result.message ?? 'Please enter a valid email address.');
        setSubmitError(null);
      } else if (result.code === 'LOGIN_REQUIRED') {
        setSubmitError('Your sign-in has expired. Please sign in again to submit.');
      } else if (result.status === 429) {
        setSubmitError('Too many submissions from your connection. Please wait a minute and try again.');
      } else if ((result.status === 422 || result.status === 400) && result.message) {
        // Bug fix: a 400 used to always show one hardcoded "file too large / too many files"
        // guess, discarding whatever specific message the backend actually sent — including for
        // Multer errors that have nothing to do with file size at all (e.g. a field value too
        // long). The backend's message now states the real limit for whichever check actually
        // failed; show that instead of guessing.
        setSubmitError(result.message);
      } else if (result.status === 413) {
        setSubmitError('Your answers are too large. Please shorten them and try again.');
      } else if (result.status === 400) {
        // Fallback only for the rare case the backend sent a 400 with no message at all.
        setSubmitError('An attachment is too large or there are too many files. Please check your files and try again.');
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
    } catch {
      setSubmitError('Unable to connect. Check your internet connection and try again.');
    } finally {
      if (!submittedRef.current) setIsSubmitting(false);
    }
  }

  // Final-submit validation covers every page's fields (see resolver above), but only the
  // current page's fields are rendered — a stale draft can leave an earlier page's required
  // field (e.g. a file upload, which can't survive a reload) failing invisibly, making Submit
  // look like it does nothing. Jump back to the earliest page with an error instead.
  function onInvalid(errors: FieldErrors<Record<string, FieldValue>>) {
    const erroredFieldIds = new Set(Object.keys(errors));
    const erroredPageIndices = schema.fields
      .filter((f) => erroredFieldIds.has(f.fieldId))
      .map((f) => sortedPages.findIndex((p) => p.id === f.pageId))
      .filter((i) => i >= 0);
    if (erroredPageIndices.length === 0) return;

    const earliestPageIndex = Math.min(...erroredPageIndices);
    if (earliestPageIndex < currentPageIndex || showReview) {
      setShowReview(false);
      setCurrentPageIndex(earliestPageIndex);
      setQuestionIndex(0);
      setSubmitError('Please complete all required fields before submitting.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    // Enter inside the review screen (e.g. in an inline editor) must never submit; the Submit button
    // there is the only way to send.
    if (showReview) {
      e.preventDefault();
      return;
    }
    if (isLastStep && reviewEnabled) {
      e.preventDefault();
      void handleReview();
      return;
    }
    if (!isLastStep) {
      e.preventDefault();
      // Guided: Enter on a question advances, like Next.
      if (isGuided) void handleNext();
      return;
    }
    methods.handleSubmit(onSubmit, onInvalid)(e);
  }

  const anyUploading = Object.values(uploadStates).some((s) => s.status === 'uploading');
  const submitDisabled = isSubmitting || anyUploading;

  // One field, rendered exactly as the respondent filled it — used by the page body AND by the
  // review screen's inline editor, so there is one renderer and one validation path.
  function renderField(field: FormField) {
      const fieldError = methods.formState.errors[field.fieldId] as FieldError | undefined;
      const spanClass = isGrouped(layout, schema.branding.fieldGrouping) && FULL_WIDTH_TYPES.has(field.type) ? 'md:col-span-2' : '';

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
                  if (file) next[field.fieldId] = [file];
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

      if (field.type === 'image_upload') {
        return (
          <div key={field.fieldId} className={spanClass}>
            <ImageUploadRenderer
              field={field}
              control={methods.control}
              register={methods.register}
              trigger={methods.trigger}
              setValue={methods.setValue}
              error={fieldError}
              disabled={isSubmitting}
              onFilesChange={(list) =>
                setFiles((prev) => {
                  const next = { ...prev };
                  if (list.length) next[field.fieldId] = list;
                  else delete next[field.fieldId];
                  return next;
                })
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
          />
        </div>
      );
  }

  const fieldsContainerClass = fieldsClassFor(layout, schema.branding.spacing, schema.branding.fieldGrouping);
  const buttonTheme = brandButtonStyle(schema.branding);
  const LayoutFrame = LAYOUT_COMPONENTS[layout];
  // The banner already shows the form's name as a large headline, so the in-body <h1> goes screen-reader-only when it
  // would only repeat it (single page, or a page titled like the form).
  const headlineInBanner = layout !== 'split_feature' && embedOpts.cover && (!currentPage?.title || currentPage.title === schema.title);
  const FieldsWrap = layout === 'card_stack' ? 'fieldset' : 'div';

  const frameProps = {
    layout,
    // ?bg=0 (embed): no page background, so the host page shows around the card.
    branding: embedOpts.background ? schema.branding : { ...schema.branding, backgroundStyle: 'none' as const },
    title: embedOpts.hideTitle ? '' : schema.title,
    previewMode,
    hideCover: !embedOpts.cover,
    hideProgress: !embedOpts.progress,
    stepNames: sortedPages.map((p) => p.title ?? ''),
    currentPage: currentPageIndex,
    question: guidedQuestion,
  };

  // Mode 3: a visitor who is not signed in sees a sign-in gate INSTEAD of the form (the owner's preview is
  // never gated). The server refuses an unauthenticated submission regardless.
  if (accessMode === 'login' && !previewMode) {
    if (authLoading) {
      return (
        <LayoutFrame {...frameProps}>
          <p role="status" className="p-6 bg-body text-(--text-muted)">Checking your sign-in…</p>
        </LayoutFrame>
      );
    }
    if (!authUser) {
      return (
        <LayoutFrame {...frameProps}>
          <LoginGate slug={slug} formTitle={schema.title} />
        </LayoutFrame>
      );
    }
  }

  // Preview only: send the current answers through the real pipeline as an isTest response. Validation is the
  // form's own (handleSubmit), so a test can never get past a rule a real submission could not.
  async function sendTest(values: Record<string, FieldValue>) {
    if (!onTestSubmit) return;
    setTestState({ status: 'sending' });
    try {
      await onTestSubmit(buildAnswers(schema.fields, hiddenFieldIds, values));
      setTestState({ status: 'sent' });
    } catch (err) {
      setTestState({ status: 'error', message: err instanceof Error ? err.message : 'Could not send the test submission.' });
    }
  }
  const testControls =
    previewMode && onTestSubmit ? (
      <div className="flex flex-col gap-2 rounded-md border border-dashed border-(--border-strong) p-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => void methods.handleSubmit(sendTest, onInvalid)()}
          isLoading={testState.status === 'sending'}
        >
          Send a test submission
        </Button>
        <p className="bg-caption text-(--text-muted)" role="status">
          {testState.status === 'sent'
            ? "Test submission recorded — it won't count anywhere."
            : testState.status === 'error'
              ? testState.message
              : "Runs your form's real rules and saves a test response. It is never counted."}
        </p>
      </div>
    ) : null;

  // Shown above the submit buttons: the Mode 2 email step, or who a Mode 3 respondent is submitting as.
  const accessExtra = (
    <>
      {accessMode === 'tracked' ? (
      <EmailStep value={respondentEmail} onChange={setRespondentEmail} error={emailError} disabled={isSubmitting} />
    ) : accessMode === 'login' && authUser ? (
      <p className="bg-body-sm text-(--text-muted)">
        Responding as <strong className="text-(--text-primary)">{authUser.email}</strong>
      </p>
    ) : null}
      {testControls}
    </>
  );
  const hasAccessExtra = accessMode === 'tracked' || (accessMode === 'login' && !!authUser) || !!testControls;

  return (
    <LayoutFrame {...frameProps}>
        <form onSubmit={handleFormSubmit} noValidate className="p-6 md:p-8">
          {!showReview && (
            <>
            {layout !== 'steps' && !isGuided && brandShowsProgress(schema.branding) && embedOpts.progress && (
              <FormProgress currentPage={currentPageIndex + 1} totalPages={totalPages} />
            )}

            <h1 className={embedOpts.hideTitle || headlineInBanner ? 'sr-only' : layout === 'card_stack' ? 'bg-h4 text-(--text-primary) border-b border-(--border-default) pb-3' : 'bg-h3 text-(--text-primary)'}>{currentPage?.title ?? schema.title}</h1>
            {currentPage?.description && <p className="bg-body text-(--text-muted) mt-1">{currentPage.description}</p>}

            </>
          )}

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

          {showReview ? (
            <ReviewStep
              formTitle={schema.title}
              pages={sortedPages}
              fields={schema.fields}
              hiddenFieldIds={hiddenFieldIds}
              values={watchedValues}
              fileNames={Object.fromEntries(Object.entries(files).map(([id, list]) => [id, list.map((f) => f.name).join(', ')]))}
              renderField={renderField}
              validateField={(id) => methods.trigger(id)}
              restoreField={(id, value) => methods.setValue(id, value)}
              onBack={() => setShowReview(false)}
              onSubmit={() => void methods.handleSubmit(onSubmit, onInvalid)()}
              isSubmitting={isSubmitting}
              submitDisabled={submitDisabled}
              submitError={submitError}
              primaryColor={primaryColor}
              buttonStyle={buttonTheme}
              previewSubmitted={previewMode && previewSubmitted}
              extra={accessExtra}
            />
          ) : (
            <>
              {/* Card Stack: each page's group is a <fieldset> with a <legend> so screen readers announce it
                  (wireframe a11y note). The legend is the page title already shown above, so it is sr-only. */}
              <FieldsWrap className={layout === 'card_stack' ? `${fieldsContainerClass} min-w-0 border-0 p-0 mx-0 mb-0` : fieldsContainerClass}>
                {layout === 'card_stack' && <legend className="sr-only">{currentPage?.title ?? schema.title}</legend>}
                {shownFields.map((field) => renderField(field))}
              </FieldsWrap>

              {isLastStep && !reviewEnabled && hasAccessExtra && <div className="mt-6 flex flex-col gap-4">{accessExtra}</div>}

              {submitError && (
                <p role="alert" className="bg-caption text-(--error-text) font-semibold mt-4">
                  {submitError}
                </p>
              )}

              {previewMode && previewSubmitted ? (
                <p className="mt-6 bg-body-sm text-center text-(--text-muted) font-medium">
                  This is a preview — nothing was submitted.
                </p>
              ) : (
                <div className="mt-6 flex gap-3">
                  {(currentPageIndex > 0 || (isGuided && questionIndex > 0)) && (
                    <Button key="back" type="button" variant="secondary" className="flex-1" onClick={handleBack} disabled={isSubmitting}>
                      Back
                    </Button>
                  )}
                  {isLastStep ? (
                    <Button
                      key="submit"
                      type={reviewEnabled ? 'button' : 'submit'}
                      onClick={reviewEnabled ? () => void handleReview() : undefined}
                      className="flex-1"
                      style={buttonTheme}
                      isLoading={isSubmitting}
                      disabled={submitDisabled}
                      aria-label={isSubmitting ? 'Submitting your response...' : undefined}
                    >
                      {reviewEnabled ? 'Review answers' : 'Submit'}
                    </Button>
                  ) : (
                    <Button key="next" type="button" className="flex-1" style={buttonTheme} onClick={handleNext}>
                      Next
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </form>
    </LayoutFrame>
  );
}
