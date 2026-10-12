/// <reference types="google.maps" />
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Expand, MapPin, Minimize2, X } from 'lucide-react';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from '@/components/ui/Card';
import { bx } from '@/lib/utils';
import type { LocationMetric } from './types';

// OpenStreetMap's standard street map (the familiar road-and-label look), drawn with Leaflet. It needs no API key or billing.
// OSM's public tile servers are meant for light use (https://operations.osmfoundation.org/policies/tiles/): for a busy
// production site set NEXT_PUBLIC_MAP_TILE_URL (and NEXT_PUBLIC_MAP_ATTRIBUTION) to a tile provider you have an account
// with, e.g. MapTiler, Stadia, Mapbox or Google's tile API, using that provider's {z}/{x}/{y} URL.
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const placeName = (p: LocationMetric['points'][number]) => [p.city, p.region, p.country].filter(Boolean).join(', ') || p.country;
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

// The interactive map itself. Mounted client-side only (Leaflet touches `window`); sized by its container, so the same
// component serves the card and the full-screen view.
function LeafletCanvas({ metric, height, fitKey }: { metric: LocationMetric; height: string; fitKey: string }) {
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
      // Dark theme: the street tiles are inverted by CSS (see .map-dark in globals.css) rather than fetched from a second tile set.
      if (document.documentElement.getAttribute('data-theme') === 'dark') el.current.classList.add('map-dark');
      L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 18 }).addTo(m);

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

declare global {
  interface Window {
    google?: typeof google;
  }
}

// ── Google Maps (used when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set) ─────────────────────────────────────────────────
// The key is a browser key: restrict it in the Google Cloud console to your site's domains and to the "Maps JavaScript API"
// only. If Google refuses it (bad key, no billing, domain not allowed) the card quietly falls back to the OpenStreetMap map.
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

let googleLoading: Promise<void> | null = null;
function loadGoogleMaps(key: string): Promise<void> {
  if (typeof window !== 'undefined' && window.google?.maps) return Promise.resolve();
  googleLoading ??= new Promise<void>((resolve, reject) => {
    const callback = '__beginsoGoogleMapsReady';
    (window as unknown as Record<string, unknown>)[callback] = () => resolve();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=${callback}&loading=async&v=weekly`;
    script.async = true;
    script.onerror = () => {
      googleLoading = null;
      reject(new Error('Google Maps failed to load'));
    };
    document.head.appendChild(script);
  });
  return googleLoading;
}

function GoogleCanvas({ metric, height, onFail }: { metric: LocationMetric; height: string; onFail: () => void }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    // Google calls this global when it rejects the key (invalid, billing off, referrer not allowed).
    (window as unknown as Record<string, unknown>).gm_authFailure = () => { if (!cancelled) onFail(); };
    loadGoogleMaps(GOOGLE_KEY as string)
      .then(() => {
        if (cancelled || !el.current) return;
        const g = (window.google as typeof google).maps;
        const map = new g.Map(el.current, {
          center: { lat: 20, lng: 0 },
          zoom: 2,
          minZoom: 2,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'cooperative', // Ctrl + scroll zooms; a plain scroll keeps scrolling the page
          clickableIcons: false,
        });
        const max = Math.max(...metric.points.map((p) => p.count), 1);
        const color = getComputedStyle(el.current).getPropertyValue('--action-primary').trim() || '#1D4ED8';
        const info = new g.InfoWindow();
        const bounds = new g.LatLngBounds();
        for (const p of metric.points) {
          const scale = 6 + 11 * Math.sqrt(p.count / max);
          const marker = new g.Marker({
            map,
            position: { lat: p.lat, lng: p.lng },
            icon: { path: g.SymbolPath.CIRCLE, scale, fillColor: color, fillOpacity: 0.78, strokeColor: '#fff', strokeWeight: 2 },
            title: `${placeName(p)}: ${p.count}`,
          });
          marker.addListener('mouseover', () => {
            info.setContent(`<strong>${escapeHtml(placeName(p))}</strong><br/>${p.count} response${p.count === 1 ? '' : 's'}`);
            info.open({ map, anchor: marker });
          });
          marker.addListener('mouseout', () => info.close());
          bounds.extend({ lat: p.lat, lng: p.lng });
        }
        if (metric.points.length > 0) {
          map.fitBounds(bounds, 48);
          g.event.addListenerOnce(map, 'idle', () => { if ((map.getZoom() ?? 0) > 6) map.setZoom(6); });
        }
      })
      .catch(() => { if (!cancelled) onFail(); });
    return () => { cancelled = true; };
  }, [metric, onFail]);

  return <div ref={el} role="application" aria-label="Map of where responses came from" className="z-0 w-full rounded-lg" style={{ height }} />;
}

// Google when a key is configured (and accepted), the keyless OpenStreetMap map otherwise.
function MapCanvas({ metric, height, fitKey }: { metric: LocationMetric; height: string; fitKey: string }) {
  const [googleFailed, setGoogleFailed] = useState(false);
  if (GOOGLE_KEY && !googleFailed) return <GoogleCanvas key={fitKey} metric={metric} height={height} onFail={() => setGoogleFailed(true)} />;
  return <LeafletCanvas metric={metric} height={height} fitKey={fitKey} />;
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
              <p className="bg-body-sm text-(--text-muted)">{metric.located.toLocaleString()} response{metric.located === 1 ? '' : 's'} · {metric.points.length} place{metric.points.length === 1 ? '' : 's'} · hold Ctrl and scroll to zoom</p>
            </div>
            <button type="button" onClick={() => setFull(false)} aria-label="Close full screen map" className="flex size-10 items-center justify-center rounded-lg border border-(--border-default) hover:bg-(--surface-hover)">
              <X size={18} />
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            <MapCanvas metric={metric} height="100%" fitKey="full" />
            <aside className="absolute right-4 top-4 z-1000 hidden max-h-[calc(100%-2rem)] w-64 flex-col gap-2 overflow-auto rounded-xl border border-(--border-default) bg-(--surface-card) p-4 shadow-(--shadow-md) md:flex">
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
