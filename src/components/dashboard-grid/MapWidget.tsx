'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Expand, MapPin, Minimize2, X } from 'lucide-react';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from '@/components/ui/Card';
import { bx } from '@/lib/utils';
import type { LocationMetric } from './types';

// A clean street-style basemap (CARTO "Voyager": light, labelled, close to what people expect from a Google map) drawn with
// Leaflet. No API key or billing needed; set NEXT_PUBLIC_MAP_TILE_URL to use any other XYZ tile server instead
// (for example a self-hosted or paid one), and keep the attribution that provider requires.
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL ?? 'https://{s}.basemaps.cartocdn.com/rasterTiles/voyager/{z}/{x}/{y}{r}.png';
const ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const placeName = (p: LocationMetric['points'][number]) => [p.city, p.region, p.country].filter(Boolean).join(', ') || p.country;
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

// The interactive map itself. Mounted client-side only (Leaflet touches `window`); sized by its container, so the same
// component serves the card and the full-screen view.
function MapCanvas({ metric, height, fitKey }: { metric: LocationMetric; height: string; fitKey: string }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !el.current) return;
      const m = L.map(el.current, { zoomControl: true, scrollWheelZoom: false, worldCopyJump: true, minZoom: 2 });
      map.current = m;
      // Dark theme gets CARTO's dark basemap (unless a custom tile server is configured).
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      const url = !process.env.NEXT_PUBLIC_MAP_TILE_URL && dark ? TILE_URL.replace('voyager', 'dark_all') : TILE_URL;
      L.tileLayer(url, { attribution: ATTRIBUTION, subdomains: 'abcd', maxZoom: 18 }).addTo(m);

      const max = Math.max(...metric.points.map((p) => p.count), 1);
      const color = getComputedStyle(el.current).getPropertyValue('--action-primary').trim() || '#1D4ED8';
      const markers = metric.points.map((p) => {
        // Area-proportional bubbles: the busiest place is 34px across, a single response 12px.
        const radius = 6 + 11 * Math.sqrt(p.count / max);
        const marker = L.circleMarker([p.lat, p.lng], { radius, color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.78 }).addTo(m);
        marker.bindTooltip(`<strong>${escapeHtml(placeName(p))}</strong><br/>${p.count} response${p.count === 1 ? '' : 's'}`, { direction: 'top', offset: [0, -radius] });
        return marker;
      });
      if (markers.length > 0) m.fitBounds(L.featureGroup(markers).getBounds().pad(0.3), { maxZoom: 6 });
      else m.setView([20, 0], 2);

      // Zoom with the wheel only while the pointer is on the map and Ctrl/Cmd is held, so scrolling the dashboard past it never gets stuck.
      el.current.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) m.scrollWheelZoom.enable(); else m.scrollWheelZoom.disable(); }, { passive: true });
      observer = new ResizeObserver(() => m.invalidateSize());
      observer.observe(el.current);
    })();
    return () => {
      cancelled = true;
      observer?.disconnect();
      map.current?.remove();
      map.current = null;
    };
    // fitKey changes when the map is moved between the card and the full-screen frame, which rebuilds it at the new size.
  }, [metric, fitKey]);

  return <div ref={el} role="application" aria-label="Map of where responses came from" className="z-0 w-full rounded-lg" style={{ height }} />;
}

export function MapWidget({ metric, title, preview }: { metric: LocationMetric; title?: string; preview?: boolean }) {
  const [full, setFull] = useState(false);
  const label = title ?? metric.label;
  const top = [...metric.points].sort((a, b) => b.count - a.count).slice(0, 8);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [full]);

  // The add-widget picker only needs a picture of the idea, not a live map.
  if (preview) {
    return (
      <Card className="relative flex h-full items-center justify-center overflow-hidden bg-(--bg-subtle)">
        <div aria-hidden="true" className="absolute inset-0 opacity-60" style={{ backgroundImage: 'radial-gradient(var(--border-strong) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
        <div className="relative flex flex-col items-center gap-1 text-(--text-secondary)">
          <MapPin className="size-7 text-(--action-primary)" aria-hidden="true" />
          <span className="bg-body-sm font-semibold">{label}</span>
        </div>
      </Card>
    );
  }

  const empty = metric.points.length === 0;
  const unlocated = Math.max(metric.total - metric.located, 0);

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="bg-body font-semibold text-(--text-primary)">{label}</h3>
        <p className="bg-caption text-(--text-muted)">
          {empty ? 'No locations yet' : `${metric.located.toLocaleString()} of ${metric.total.toLocaleString()} responses located across ${metric.points.length} place${metric.points.length === 1 ? '' : 's'}`}
        </p>
      </div>
      {!empty && (
        <button
          type="button"
          onClick={() => setFull((f) => !f)}
          aria-label={full ? 'Exit full screen' : 'View map full screen'}
          className="pointer-events-auto flex size-8 flex-none items-center justify-center rounded-lg border border-(--border-default) bg-(--surface-card) text-(--text-secondary) hover:bg-(--surface-hover)"
        >
          {full ? <Minimize2 size={16} /> : <Expand size={16} />}
        </button>
      )}
    </div>
  );

  if (empty) {
    return (
      <Card className="flex h-full flex-col gap-3">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg bg-(--bg-subtle) p-6 text-center">
          <MapPin className="size-6 text-(--text-muted)" aria-hidden="true" />
          <p className="bg-body-sm text-(--text-muted)">
            A response appears on the map when it is submitted from a public link. Responses made before this existed, or from a private network, have no location.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className={bx('flex h-full flex-col gap-3', full && 'invisible')}>
        {header}
        {/* In the card the map is only mounted while the full-screen copy is closed, so there is never a second live map. */}
        <div className="min-h-64 flex-1">{!full && <MapCanvas metric={metric} height="100%" fitKey="card" />}</div>
        {unlocated > 0 && <p className="bg-caption text-(--text-muted)">{unlocated.toLocaleString()} response{unlocated === 1 ? '' : 's'} had no location and are not shown.</p>}
      </Card>

      {full && createPortal(
        <div role="dialog" aria-modal="true" aria-label={label} className="pointer-events-auto fixed inset-0 z-90 flex flex-col bg-(--surface-card)">
          <div className="flex items-center justify-between gap-3 border-b border-(--border-default) px-5 py-3">
            <div className="min-w-0">
              <h2 className="bg-h5 font-bold text-(--text-primary)">{label}</h2>
              <p className="bg-body-sm text-(--text-muted)">{metric.located.toLocaleString()} responses · {metric.points.length} places · hold Ctrl and scroll to zoom</p>
            </div>
            <button type="button" onClick={() => setFull(false)} aria-label="Close full screen map" className="flex size-10 items-center justify-center rounded-lg border border-(--border-default) hover:bg-(--surface-hover)">
              <X size={18} />
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            <MapCanvas metric={metric} height="100%" fitKey="full" />
            <aside className="absolute left-4 top-4 z-1000 hidden max-h-[calc(100%-2rem)] w-64 flex-col gap-2 overflow-auto rounded-xl border border-(--border-default) bg-(--surface-card) p-4 shadow-(--shadow-md) md:flex">
              <h3 className="bg-overline text-(--text-muted)">Top places</h3>
              <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
                {top.map((p) => (
                  <li key={`${p.lat},${p.lng}`} className="flex items-center justify-between gap-3 bg-body-sm text-(--text-secondary)">
                    <span className="truncate">{placeName(p)}</span>
                    <span className="font-semibold tabular-nums text-(--text-primary)">{p.count.toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
