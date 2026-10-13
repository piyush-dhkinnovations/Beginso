import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { useBuilderStore } from '@/store/builderStore';
import { useBuilderDnd } from '@/components/form-builder/useBuilderDnd';
import { CANVAS_ID } from '@/components/form-builder/Canvas';

type Rect = { top: number; height: number };
interface FakeActive { id: string; data: { current?: Record<string, unknown> }; rect: { current: { translated: Rect | null } } }

const active = (id: string, data: Record<string, unknown>, translatedTop: number | null = null): FakeActive => ({
  id,
  data: { current: data },
  rect: { current: { translated: translatedTop === null ? null : { top: translatedTop, height: 40 } } },
});
const over = (id: string, top = 100, height = 40) => ({ id, rect: { top, height } });

const start = (a: FakeActive) => ({ active: a }) as unknown as DragStartEvent;
const dragOver = (a: FakeActive, o: ReturnType<typeof over> | null) => ({ active: a, over: o }) as unknown as DragOverEvent;
const end = (a: FakeActive, o: ReturnType<typeof over> | null) => ({ active: a, over: o }) as unknown as DragEndEvent;

const toolbox = (type: string, top: number | null = null) => active(`toolbox-${type}`, { from: 'toolbox', type }, top);
const canvasItem = (id: string) => active(id, { from: 'canvas' });

const fieldIds = () => useBuilderStore.getState().fields.filter((f) => !f.deleted).map((f) => f.fieldId);
const types = () => useBuilderStore.getState().fields.filter((f) => !f.deleted).map((f) => f.type);

beforeEach(() => {
  useBuilderStore.getState().initForm({
    _id: 'f1',
    title: 'T',
    status: 'draft',
    pages: [{ id: 'p1', order: 0 }],
    fields: [
      { fieldId: 'a', pageId: 'p1', type: 'short_text', label: 'A', deleted: false },
      { fieldId: 'b', pageId: 'p1', type: 'email', label: 'B', deleted: false },
    ],
    branding: {},
    settings: {},
  } as never);
});

describe('drag start', () => {
  it('tracks the active drag id', () => {
    const { result } = renderHook(() => useBuilderDnd());
    act(() => result.current.handleDragStart(start(toolbox('number'))));
    expect(result.current.activeDragConfig?.type).toBe('number');
    expect(result.current.activeDragField).toBeFalsy();
  });

  it('disables the drop animation for toolbox drags only', () => {
    const { result } = renderHook(() => useBuilderDnd());
    expect(result.current.dropAnimation).toBeUndefined();
    act(() => result.current.handleDragStart(start(toolbox('number'))));
    expect(result.current.dropAnimation).toBeNull();
    act(() => result.current.handleDragStart(start(canvasItem('a'))));
    expect(result.current.dropAnimation).toBeUndefined();
  });

  it('a canvas drag exposes the field and its toolbox config for the overlay', () => {
    const { result } = renderHook(() => useBuilderDnd());
    act(() => result.current.handleDragStart(start(canvasItem('b'))));
    expect(result.current.activeDragConfig).toBeFalsy();
    expect(result.current.activeDragField?.fieldId).toBe('b');
    expect(result.current.activeDragFieldConfig?.type).toBe('email');
  });
});

describe('drag over', () => {
  it('ignores canvas-originated drags', () => {
    const { result } = renderHook(() => useBuilderDnd());
    act(() => result.current.handleDragOver(dragOver(canvasItem('a'), over('b'))));
    expect(result.current.dragOverInfo).toBeNull();
    expect(result.current.isToolboxOver).toBe(false);
  });

  it('clears when a toolbox drag is over nothing', () => {
    const { result } = renderHook(() => useBuilderDnd());
    act(() => result.current.handleDragOver(dragOver(toolbox('number'), over('b'))));
    expect(result.current.isToolboxOver).toBe(true);
    act(() => result.current.handleDragOver(dragOver(toolbox('number'), null)));
    expect(result.current.isToolboxOver).toBe(false);
    expect(result.current.dragOverInfo).toBeNull();
  });

  it('tints the canvas but shows no per-field indicator over the empty canvas', () => {
    const { result } = renderHook(() => useBuilderDnd());
    act(() => result.current.handleDragOver(dragOver(toolbox('number'), over(CANVAS_ID))));
    expect(result.current.isToolboxOver).toBe(true);
    expect(result.current.dragOverInfo).toBeNull();
  });

  it('shows "above" in the top half of a card and "below" in the bottom half', () => {
    const { result } = renderHook(() => useBuilderDnd());
    // card spans 100..140, midpoint 120
    act(() => result.current.handleDragOver(dragOver(toolbox('number', 110), over('b'))));
    expect(result.current.dragOverInfo).toEqual({ fieldId: 'b', position: 'above' });
    act(() => result.current.handleDragOver(dragOver(toolbox('number', 130), over('b'))));
    expect(result.current.dragOverInfo).toEqual({ fieldId: 'b', position: 'below' });
  });

  it('defaults to "above" when no pointer rect is known', () => {
    const { result } = renderHook(() => useBuilderDnd());
    act(() => result.current.handleDragOver(dragOver(toolbox('number', null), over('b'))));
    expect(result.current.dragOverInfo?.position).toBe('above');
  });
});

describe('drag end', () => {
  it('does nothing and resets indicators when dropped outside', () => {
    const { result } = renderHook(() => useBuilderDnd());
    act(() => result.current.handleDragStart(start(toolbox('number'))));
    act(() => result.current.handleDragOver(dragOver(toolbox('number'), over(CANVAS_ID))));
    act(() => result.current.handleDragEnd(end(toolbox('number'), null)));
    expect(fieldIds()).toHaveLength(2);
    expect(result.current.isToolboxOver).toBe(false);
    expect(result.current.activeDragConfig).toBeFalsy();
  });

  it('appends a new field when dropped on the empty canvas', () => {
    const { result } = renderHook(() => useBuilderDnd());
    act(() => result.current.handleDragEnd(end(toolbox('number'), over(CANVAS_ID))));
    expect(types()).toEqual(['short_text', 'email', 'number']);
  });

  it('inserts above the hovered card in its top half', () => {
    const { result } = renderHook(() => useBuilderDnd());
    act(() => result.current.handleDragEnd(end(toolbox('number', 105), over('b'))));
    expect(types()).toEqual(['short_text', 'number', 'email']);
  });

  it('inserts below the hovered card in its bottom half', () => {
    const { result } = renderHook(() => useBuilderDnd());
    act(() => result.current.handleDragEnd(end(toolbox('number', 135), over('a'))));
    expect(types()).toEqual(['short_text', 'number', 'email']);
  });

  it('reorders canvas fields', () => {
    const { result } = renderHook(() => useBuilderDnd());
    const before = fieldIds();
    act(() => result.current.handleDragEnd(end(canvasItem('a'), over('b'))));
    expect(fieldIds()).toEqual([before[1], before[0]]);
  });

  it('does not reorder when dropped on itself', () => {
    const { result } = renderHook(() => useBuilderDnd());
    const before = fieldIds();
    act(() => result.current.handleDragEnd(end(canvasItem('a'), over('a'))));
    expect(fieldIds()).toEqual(before);
    expect(useBuilderStore.getState().undoStack).toHaveLength(0);
  });
});

describe('sensors and collision detection', () => {
  it('exposes pointer and keyboard sensors and a collision function', () => {
    const { result } = renderHook(() => useBuilderDnd());
    expect(result.current.sensors).toHaveLength(2);
    expect(typeof result.current.collisionDetection).toBe('function');
  });
});
