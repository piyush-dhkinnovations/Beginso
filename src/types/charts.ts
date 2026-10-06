// Sprint 14, design.md §13 / OQ-1 (decided: bar | donut | line; group by value | day | week).
// Uncertain until BE 0.3 ships.
export type ChartType = 'bar' | 'donut' | 'line';
export type ChartGroupBy = 'value' | 'day' | 'week';

export interface SavedChart {
  _id: string;
  fieldId: string;
  chartType: ChartType;
  groupBy: ChartGroupBy;
  order: number;
  fieldMissing?: boolean;
}

export interface ChartDefinition {
  fieldId: string;
  chartType: ChartType;
  groupBy: ChartGroupBy;
}

export interface ChartSeries {
  series: { label: string; value: number }[];
  total: number;
}
