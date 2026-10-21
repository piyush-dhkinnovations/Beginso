import type { ComponentType } from 'react';
import type { ResponseLayout } from '@/types/responseView';
import { GridLayout } from './GridLayout';
import { ListLayout } from './ListLayout';
import { TableLayout } from './TableLayout';
import type { ResponseLayoutProps } from './types';

// Adding a layout later is one file here plus one name in RESPONSE_LAYOUTS (and the backend allow-list).
export const LAYOUTS: Record<ResponseLayout, ComponentType<ResponseLayoutProps>> = {
  grid: GridLayout,
  list: ListLayout,
  table: TableLayout,
};

export type { ResponseLayoutProps } from './types';
