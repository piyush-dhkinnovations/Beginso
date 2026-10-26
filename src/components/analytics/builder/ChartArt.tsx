// Small illustrations for the first step of the chart builder: drawn with the app's own colour tokens, so they follow the theme (light, dark).

// Sized by the height of the box it sits in (the picture keeps its shape), never stretched to the width of a wide card.
const FRAME = 'h-full w-auto max-w-full';

/** A simple chart: a row of coloured bars over a baseline, and a donut beside them. */
export function SimpleChartArt() {
  return (
    <svg viewBox="0 0 320 160" role="img" aria-label="A chart with coloured bars and a donut" className={FRAME}>
      <rect x="0" y="0" width="320" height="160" rx="14" fill="var(--accent-soft)" />
      <rect x="22" y="22" width="276" height="116" rx="10" fill="var(--surface-card)" opacity="0.92" />
      <g>
        <rect x="42" y="82" width="22" height="42" rx="5" fill="var(--action-primary)" />
        <rect x="72" y="58" width="22" height="66" rx="5" fill="var(--info)" />
        <rect x="102" y="70" width="22" height="54" rx="5" fill="var(--success)" />
        <rect x="132" y="44" width="22" height="80" rx="5" fill="var(--warning)" />
        <rect x="162" y="92" width="22" height="32" rx="5" fill="var(--error)" />
        <path d="M36 124.5H192" stroke="var(--border-default)" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g transform="translate(246 80)">
        <circle r="34" fill="none" stroke="var(--bg-sunken)" strokeWidth="14" />
        <circle r="34" fill="none" stroke="var(--action-primary)" strokeWidth="14" strokeDasharray="96 214" transform="rotate(-90)" />
        <circle r="34" fill="none" stroke="var(--info)" strokeWidth="14" strokeDasharray="62 214" strokeDashoffset="-96" transform="rotate(-90)" />
        <circle r="34" fill="none" stroke="var(--success)" strokeWidth="14" strokeDasharray="40 214" strokeDashoffset="-158" transform="rotate(-90)" />
      </g>
    </svg>
  );
}

/** A drill-down chart: a first level of bars, an arrow, and a second level that opens from one of them. */
export function DrillChartArt() {
  return (
    <svg viewBox="0 0 320 160" role="img" aria-label="A chart whose bar opens into a second, more detailed chart" className={FRAME}>
      <rect x="0" y="0" width="320" height="160" rx="14" fill="var(--accent-soft)" />
      <rect x="18" y="20" width="132" height="120" rx="10" fill="var(--surface-card)" opacity="0.92" />
      <rect x="34" y="84" width="20" height="42" rx="5" fill="var(--bg-sunken)" />
      <rect x="62" y="56" width="20" height="70" rx="5" fill="var(--action-primary)" />
      <rect x="90" y="72" width="20" height="54" rx="5" fill="var(--bg-sunken)" />
      <rect x="118" y="96" width="20" height="30" rx="5" fill="var(--bg-sunken)" />
      <path d="M28 126.5H142" stroke="var(--border-default)" strokeWidth="2" strokeLinecap="round" />
      <path d="M72 50 C 72 28, 120 28, 164 56" fill="none" stroke="var(--action-primary)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 7" />
      <path d="M158 49 L168 58 L155 61" fill="none" stroke="var(--action-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="170" y="44" width="132" height="96" rx="10" fill="var(--surface-card)" opacity="0.92" />
      <rect x="184" y="100" width="16" height="28" rx="4" fill="var(--info)" />
      <rect x="206" y="82" width="16" height="46" rx="4" fill="var(--success)" />
      <rect x="228" y="92" width="16" height="36" rx="4" fill="var(--warning)" />
      <rect x="250" y="70" width="16" height="58" rx="4" fill="var(--error)" />
      <rect x="272" y="104" width="16" height="24" rx="4" fill="var(--action-secondary)" />
      <path d="M180 128.5H292" stroke="var(--border-default)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
