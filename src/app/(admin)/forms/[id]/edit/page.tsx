'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { formsService } from '@/services/forms';
import { useBuilderStore } from '@/store/builderStore';
import { BuilderHeader } from '@/components/form-builder/BuilderHeader';
import { BuilderTabs, BuilderTab } from '@/components/form-builder/BuilderTabs';
import { useToast } from '@/components/common/Toast';
import { DndContext } from '@dnd-kit/core';
import { Toolbox } from '@/components/form-builder/Toolbox';

export default function BuilderPageShell() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<BuilderTab>('build');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Read state and actions from builderStore
  const formId = useBuilderStore((state) => state.formId);
  const formTitle = useBuilderStore((state) => state.formTitle);
  const fields = useBuilderStore((state) => state.fields);
  const dirty = useBuilderStore((state) => state.dirty);
  
  const initForm = useBuilderStore((state) => state.initForm);
  const setFormTitle = useBuilderStore((state) => state.setFormTitle);
  const markSaved = useBuilderStore((state) => state.markSaved);
  const undo = useBuilderStore((state) => state.undo);
  const redo = useBuilderStore((state) => state.redo);
  const undoStack = useBuilderStore((state) => state.undoStack);
  const redoStack = useBuilderStore((state) => state.redoStack);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  // Query to fetch the form details (TEMPORARY MOCK FOR DEMO)
  const { data: form, isLoading, error } = useQuery({
    queryKey: ['form', id],
    queryFn: () => Promise.resolve({
      _id: id,
      workspaceId: 'test-workspace',
      title: 'My Awesome Monday/Tuesday Form',
      status: 'draft' as const,
      fields: [],
      branding: {},
      settings: { honeypotEnabled: true },
      schemaVersion: 1,
      responseCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    retry: false,
  });

  // Init builderStore state when query returns data
  useEffect(() => {
    if (form) {
      initForm(form);
    }
  }, [form, initForm]);

  // Handle data fetch error
  useEffect(() => {
    if (error) {
      toast('Form not found or access denied', 'error');
      router.push('/forms');
    }
  }, [error, router, toast]);

  // Debounced Autosave effect
  useEffect(() => {
    if (!dirty || !formId) return;

    const timer = setTimeout(async () => {
      try {
        setSaveState('saving');
        await formsService.updateForm(formId, { fields, title: formTitle });
        markSaved();
        setSaveState('saved');
        
        // Reset save state back to idle after showing success indicator for 2 seconds
        const idleTimer = setTimeout(() => {
          setSaveState('idle');
        }, 2000);
        
        return () => clearTimeout(idleTimer);
      } catch (err) {
        setSaveState('error');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [dirty, fields, formTitle, formId, markSaved]);

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
              onTitleChange={setFormTitle}
              onUndo={undo}
              onRedo={redo}
              onPreview={() => {}}
            />
            
            <BuilderTabs activeTab={activeTab} onChange={setActiveTab} />
            
            <div className="flex flex-1 overflow-hidden">
              {activeTab === 'build' ? (
                <DndContext>
                  <Toolbox />
                  
                  {/* Center panel placeholder for Canvas */}
                  <div className="flex-1 bg-neutral-50 flex items-center justify-center p-6 text-neutral-400 text-body text-center overflow-y-auto">
                    Canvas Coming in Thursday Tasks
                  </div>
                  
                  {/* Right panel placeholder for PropertiesPanel */}
                  <div className="w-[320px] border-l bg-white flex items-center justify-center p-6 text-neutral-400 text-body text-center shrink-0">
                    Properties Panel Coming in Friday Tasks
                  </div>
                </DndContext>
              ) : (
                <div className="flex-1 flex items-center justify-center text-neutral-400 text-body">
                  Coming in Sprint 2 Part 2
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
