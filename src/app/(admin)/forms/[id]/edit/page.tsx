'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { formsService } from '@/services/forms';
import { useBuilderStore } from '@/store/builderStore';
import { BuilderHeader } from '@/components/form-builder/BuilderHeader';
import { BuilderTabs, BuilderTab } from '@/components/form-builder/BuilderTabs';
import { useToast } from '@/components/common/Toast';
import { Canvas } from '@/components/form-builder/Canvas';
import { PropertiesPanel } from '@/components/form-builder/PropertiesPanel';
import { Toolbox, FIELD_TYPE_CONFIG } from '@/components/form-builder/Toolbox';
import type { FieldType } from '@/types/form';

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
  
  const initForm = useBuilderStore((state) => state.initForm);
  const setFormTitle = useBuilderStore((state) => state.setFormTitle);
  const addField = useBuilderStore((state) => state.addField);
  const reorderFields = useBuilderStore((state) => state.reorderFields);
  const softDeleteField = useBuilderStore((state) => state.softDeleteField);
  const setActiveFieldId = useBuilderStore((state) => state.setActiveFieldId);
  const updateField = useBuilderStore((state) => state.updateField);
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
      try {
        setSaveState('saving');
        await formsService.updateForm(formId, { fields, title: formTitle });
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
        setSaveState('error');
      }
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [dirty, fields, formTitle, formId, markSaved]);

  // Cancel the idle reset timer on unmount to prevent setState on unmounted component
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Use refs to avoid re-binding and firing effect on every stroke
  const saveStateRef = useRef({ dirty, fields, formTitle, formId });
  useEffect(() => {
    saveStateRef.current = { dirty, fields, formTitle, formId };
  }, [dirty, fields, formTitle, formId]);

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
        formsService.updateForm(current.formId, { fields: current.fields, title: current.formTitle }).catch(() => {});
      }
    };
  }, []);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

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
  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  // ─── Drag end: determine action based on source and over target ───────────
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    // Drop from toolbox → create new field
    if (active.data.current?.from === 'toolbox') {
      const type = active.data.current.type as FieldType;
      const overIndex = fields.filter((f) => !f.deleted).findIndex((f) => f.fieldId === over.id);
      
      if (overIndex !== -1) {
        // We calculate if we are dropping below the center of the hovered item
        const isBelowOverItem =
          active.rect.current.translated &&
          over.rect &&
          active.rect.current.translated.top > over.rect.top + over.rect.height / 2;

        const modifier = isBelowOverItem ? 1 : 0;
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

  // ─── DragOverlay preview label ─────────────────────────────────────────────
  const activeDragConfig = activeDragId?.startsWith('toolbox-')
    ? FIELD_TYPE_CONFIG.find(
        (c) => `toolbox-${c.type}` === activeDragId
      )
    : null;

  return (
    <>
      {/* Mobile Gate (visible at viewport width <= 520px) */}
      <div className="flex max-[520px]:flex items-center justify-center h-screen min-[521px]:hidden bg-neutral-50 px-6">
        <div className="text-center bg-white p-8 rounded-xl shadow-card border border-neutral-200 max-w-sm">
          <p className="text-neutral-600 font-semibold text-body-lg">
            For the best experience, use a desktop or laptop to build forms.
          </p>
        </div>
      </div>

      {/* Desktop Wrapper (visible at viewport width >= 521px) */}
      <div className="hidden min-[521px]:flex flex-col h-screen overflow-hidden bg-neutral-50">
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
            />
            
            <BuilderTabs activeTab={activeTab} onChange={setActiveTab} />
            
            <div className="flex flex-1 overflow-hidden">
              {activeTab === 'build' ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={pointerWithin}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <Toolbox onAdd={addField} />
                  <Canvas
                    fields={fields}
                    activeFieldId={activeFieldId}
                    onFieldSelect={setActiveFieldId}
                    onFieldDelete={softDeleteField}
                  />
                  <DragOverlay dropAnimation={null}>
                    {activeDragConfig ? (
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-white border border-blue-400 shadow-lg opacity-90 min-h-[44px] cursor-grabbing pointer-events-none">
                        <activeDragConfig.icon size={18} className="text-blue-500 shrink-0" />
                        <span className="text-body font-medium text-neutral-700">
                          {activeDragConfig.label}
                        </span>
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
                />
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
