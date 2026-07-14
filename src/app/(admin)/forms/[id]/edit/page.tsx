'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Active,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  Over,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';
import { formsService } from '@/services/forms';
import { useBuilderStore } from '@/store/builderStore';
import { BuilderHeader } from '@/components/form-builder/BuilderHeader';
import { BuilderTabs, BuilderTab } from '@/components/form-builder/BuilderTabs';
import { useToast } from '@/components/common/Toast';
import { Canvas, CANVAS_ID } from '@/components/form-builder/Canvas';
import { PropertiesPanel } from '@/components/form-builder/PropertiesPanel';
import { Toolbox, FIELD_TYPE_CONFIG } from '@/components/form-builder/Toolbox';
import type { FieldType } from '@/types/form';

// Shared by handleDragOver (visual indicator) and handleDragEnd (actual insert)
// so the two never disagree about which side of the hovered card the drag is on.
function isDroppingBelow(active: Active, over: Over | null): boolean {
  return Boolean(
    active.rect.current.translated &&
    over?.rect &&
    active.rect.current.translated.top > over.rect.top + over.rect.height / 2
  );
}

export default function BuilderPageShell() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<BuilderTab>('build');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Read state and actions from builderStore
  const formId = useBuilderStore((state) => state.formId);
  const formTitle = useBuilderStore((state) => state.formTitle);
  const fields = useBuilderStore((state) => state.fields);
  const activeFieldId = useBuilderStore((state) => state.activeFieldId);
  const dirty = useBuilderStore((state) => state.dirty);
  const branding = useBuilderStore((state) => state.branding);
  const settings = useBuilderStore((state) => state.settings);
  
  const initForm = useBuilderStore((state) => state.initForm);
  const setFormTitle = useBuilderStore((state) => state.setFormTitle);
  const addField = useBuilderStore((state) => state.addField);
  const duplicateField = useBuilderStore((state) => state.duplicateField);
  const reorderFields = useBuilderStore((state) => state.reorderFields);
  const softDeleteField = useBuilderStore((state) => state.softDeleteField);
  const setActiveFieldId = useBuilderStore((state) => state.setActiveFieldId);
  const updateField = useBuilderStore((state) => state.updateField);
  const updateFieldOptions = useBuilderStore((state) => state.updateFieldOptions);
  const markSaved = useBuilderStore((state) => state.markSaved);
  const undo = useBuilderStore((state) => state.undo);
  const redo = useBuilderStore((state) => state.redo);
  const undoStack = useBuilderStore((state) => state.undoStack);
  const redoStack = useBuilderStore((state) => state.redoStack);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  // Query to fetch the form details
  const { data: form, isLoading, error } = useQuery({
    queryKey: ['form', id],
    queryFn: () => formsService.getFormById(id),
    retry: false,
  });

  // Init builderStore state when query returns data
  useEffect(() => {
    if (form) {
      initForm(form);
    }
  }, [form, initForm]);

  const hasRedirected = useRef(false);

  // Handle data fetch error
  useEffect(() => {
    if (error && !hasRedirected.current) {
      hasRedirected.current = true;
      toast('Form not found or access denied', 'error');
      router.push('/forms');
    }
  }, [error, router, toast]);

  // Debounced Autosave effect
  useEffect(() => {
    if (!dirty || !formId || formId === 'undefined') return;

    const timer = setTimeout(async () => {
      const hasEmptyChoiceOptions = fields.some(
        (f) =>
          !f.deleted &&
          (f.type === 'dropdown' || f.type === 'multiple_choice' || f.type === 'checkbox') &&
          (!f.options || f.options.length === 0)
      );
      if (hasEmptyChoiceOptions) {
        setSaveState('error');
        return;
      }

      try {
        setSaveState('saving');
        await formsService.updateForm(formId, { fields, title: formTitle, branding, settings });
        markSaved();
        setSaveState('saved');
        setSavedAt(new Date());

        // Reset save state back to idle after showing success indicator for 2 seconds
        // idleTimerRef keeps this handle so the unmount cleanup below can cancel it
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
          idleTimerRef.current = null;
          setSaveState('idle');
        }, 2000);
      } catch (err) {
        console.error('Autosave failed:', err);
        setSaveState('error');
      }
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [dirty, fields, formTitle, formId, branding, settings, markSaved]);

  // Cancel the idle reset timer on unmount to prevent setState on unmounted component
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Use refs to avoid re-binding and firing effect on every stroke
  const saveStateRef = useRef({ dirty, fields, formTitle, formId, branding, settings });
  useEffect(() => {
    saveStateRef.current = { dirty, fields, formTitle, formId, branding, settings };
  }, [dirty, fields, formTitle, formId, branding, settings]);

  // Synchronous flush on unmount or tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStateRef.current.dirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      const current = saveStateRef.current;
      // Flush save on unmount if still dirty
      if (current.dirty && current.formId && current.formId !== 'undefined') {
        formsService.updateForm(current.formId, {
          fields: current.fields,
          title: current.formTitle,
          branding: current.branding,
          settings: current.settings,
        }).catch(() => {});
      }
    };
  }, []);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ fieldId: string; position: 'above' | 'below' } | null>(null);
  // true when a toolbox item hovers over the canvas droppable (to tint the canvas)
  const [isToolboxOver, setIsToolboxOver] = useState(false);

  // Sensors: require 8px movement before drag activates (preserves click)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ─── Drag start: track which item is being dragged ────────────────────────
  // dropAnimation is set here (not derived from activeDragId state) so it
  // stays correct during the re-render triggered by setActiveDragId(null) in
  // handleDragEnd — otherwise activeDragId is already null and dnd-kit picks
  // up the default snap-back animation, flying the overlay to the toolbox.
  const [dropAnimation, setDropAnimation] = useState<null | undefined>(undefined);
  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setDropAnimation(id.startsWith('toolbox-') ? null : undefined);
    setActiveDragId(id);
  }

  // ─── Drag over: track exact insertion point for toolbox → canvas drops ────
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;

    if (active.data.current?.from !== 'toolbox') {
      setDragOverInfo(null);
      setIsToolboxOver(false);
      return;
    }

    if (!over) {
      setDragOverInfo(null);
      setIsToolboxOver(false);
      return;
    }

    // Hovering the empty canvas area — no per-field indicator, just canvas tint
    if (over.id === CANVAS_ID) {
      setDragOverInfo(null);
      setIsToolboxOver(true);
      return;
    }

    // Hovering over an existing FieldCard — compute above/below
    const position = isDroppingBelow(active, over) ? 'below' : 'above';

    setDragOverInfo({ fieldId: String(over.id), position });
    setIsToolboxOver(true);
  }

  // ─── Drag end: determine action based on source and over target ───────────
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragId(null);
    setDragOverInfo(null);
    setIsToolboxOver(false);

    if (!over) return;

    // Drop from toolbox → create new field
    if (active.data.current?.from === 'toolbox') {
      const type = active.data.current.type as FieldType;
      const overIndex = fields.filter((f) => !f.deleted).findIndex((f) => f.fieldId === over.id);

      if (overIndex !== -1) {
        const modifier = isDroppingBelow(active, over) ? 1 : 0;
        addField(type, overIndex + modifier);
      } else {
        addField(type);
      }
      return;
    }

    // Reorder existing canvas fields → sortable handles this
    if (
      active.data.current?.from === 'canvas' &&
      active.id !== over.id
    ) {
      reorderFields(active.id as string, over.id as string);
    }
  }

  // ─── DragOverlay preview content ───────────────────────────────────────────
  const activeDragConfig = activeDragId?.startsWith('toolbox-')
    ? FIELD_TYPE_CONFIG.find(
        (c) => `toolbox-${c.type}` === activeDragId
      )
    : null;

  // Reordering an existing canvas field → render a floating ghost of that card
  const activeDragField = !activeDragConfig
    ? fields.find((f) => f.fieldId === activeDragId)
    : null;
  const activeDragFieldConfig = activeDragField
    ? FIELD_TYPE_CONFIG.find((c) => c.type === activeDragField.type)
    : null;

  return (
    <>
      {/* Mobile Gate (visible at viewport width <= 520px) */}
      {/* -m-6 cancels the (admin) layout's <main className="p-6">; calc offsets the fixed 56px TopNav — both needed so this fills the viewport exactly instead of overflowing it and forcing a page-level scrollbar */}
      <div className="flex max-[520px]:flex items-center justify-center h-[calc(100vh-56px)] -m-6 min-[521px]:hidden bg-neutral-50 px-6">
        <div className="text-center bg-white p-8 rounded-xl shadow-card border border-neutral-200 max-w-sm">
          <p className="text-neutral-600 font-semibold text-body-lg">
            For the best experience, use a desktop or laptop to build forms.
          </p>
        </div>
      </div>

      {/* Desktop Wrapper (visible at viewport width >= 521px) */}
      {/* -m-6 cancels the (admin) layout's <main className="p-6">; calc offsets the fixed 56px TopNav — both needed so this fills the viewport exactly instead of overflowing it and forcing a page-level scrollbar. Canvas and PropertiesPanel keep their own internal overflow-y-auto below. */}
      <div className="hidden min-[521px]:flex flex-col h-[calc(100vh-56px)] -m-6 overflow-hidden bg-neutral-50">
        {isLoading ? (
          /* Loading Skeleton */
          <div className="flex flex-col h-full w-full">
            <div className="h-14 border-b bg-white flex items-center justify-between px-4 animate-pulse">
              <div className="h-6 bg-neutral-200 rounded w-48"></div>
              <div className="h-8 bg-neutral-200 rounded w-32"></div>
            </div>
            <div className="h-12 border-b bg-white animate-pulse"></div>
            <div className="flex-1 flex p-6 gap-6 animate-pulse max-w-7xl mx-auto w-full mt-10">
              <div className="w-[280px] bg-white border rounded-lg h-96"></div>
              <div className="flex-1 bg-white border rounded-lg h-96"></div>
              <div className="w-[320px] bg-white border rounded-lg h-96"></div>
            </div>
          </div>
        ) : (
          /* Form Builder Content */
          <>
            <BuilderHeader
              formTitle={formTitle}
              canUndo={canUndo}
              canRedo={canRedo}
              isSaving={saveState === 'saving'}
              saveState={saveState}
              savedAt={savedAt}
              onTitleChange={setFormTitle}
              onUndo={undo}
              onRedo={redo}
              onPreview={() => {}}
              onBack={() => router.push('/forms')}
            />
            
            <BuilderTabs activeTab={activeTab} onChange={setActiveTab} />
            
            <div className="flex flex-1 overflow-hidden">
              {activeTab === 'build' ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={pointerWithin}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                >
                  <Toolbox onAdd={addField} />
                  <Canvas
                    fields={fields}
                    activeFieldId={activeFieldId}
                    onFieldSelect={setActiveFieldId}
                    onFieldDelete={softDeleteField}
                    onFieldDuplicate={duplicateField}
                    onFieldReorder={reorderFields}
                    dragOverFieldId={dragOverInfo?.fieldId ?? null}
                    dragOverPosition={dragOverInfo?.position ?? null}
                    isToolboxOver={isToolboxOver}
                  />
                  <DragOverlay dropAnimation={dropAnimation}>
                    {activeDragConfig ? (
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-white border border-brand-500 shadow-lg opacity-90 min-h-[44px] cursor-grabbing pointer-events-none">
                        <activeDragConfig.icon size={16} className="text-brand-500 shrink-0" />
                        <span className="text-body font-medium text-neutral-700">
                          {activeDragConfig.label}
                        </span>
                      </div>
                    ) : activeDragField ? (
                      <div className="w-full flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-lg min-h-[56px] cursor-grabbing pointer-events-none"
                        style={{ boxShadow: '0 8px 24px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.08)', transform: 'scale(1.015)' }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <GripVertical size={16} className="text-neutral-400 shrink-0" />
                          {activeDragFieldConfig && (
                            <activeDragFieldConfig.icon size={16} className="text-neutral-500 shrink-0" />
                          )}
                          <span className="text-body font-medium text-neutral-800 truncate pr-4">
                            {activeDragField.label}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              ) : (
                <div className="flex-1 flex items-center justify-center text-neutral-400 text-body">
                  Coming in Sprint 2 Part 2
                </div>
              )}

              {/* Properties Panel — only shown in Build tab */}
              {activeTab === 'build' && (
                <PropertiesPanel
                  field={
                    fields.find(
                      (f) => f.fieldId === activeFieldId && !f.deleted
                    ) ?? null
                  }
                  onUpdate={updateField}
                  onUpdateOptions={updateFieldOptions}
                />
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
