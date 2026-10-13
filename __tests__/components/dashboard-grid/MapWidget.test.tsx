import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LocationMetric } from '@/components/dashboard-grid/types';

// Leaflet needs real layout and tiles; mock it and test the logic around markers, empty state and the tile URL.
const leaflet = vi.hoisted(() => {
  const mapObj = {
    fitBounds: vi.fn(),
    setView: vi.fn(),
    remove: vi.fn(),
    invalidateSize: vi.fn(),
    scrollWheelZoom: { enable: vi.fn(), disable: vi.fn() },
  };
  const markers: { opts: { radius: number }; tooltip?: string }[] = [];
  const L = {
    map: vi.fn(() => mapObj),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    circleMarker: vi.fn((_ll: number[], opts: { radius: number }) => {
      const m = { opts, tooltip: undefined as string | undefined, addTo: () => m, bindTooltip: (html: string) => { m.tooltip = html; } };
      markers.push(m);
      return m;
    }),
    featureGroup: vi.fn(() => ({ getBounds: () => ({ pad: (n: number) => `bounds-${n}` }) })),
  };
  return { mapObj, markers, L };
});
vi.mock('leaflet', () => ({ default: leaflet.L }));
vi.mock('leaflet/dist/leaflet.css', () => ({}));

const point = (over: Partial<LocationMetric['points'][number]> = {}) => ({ country: 'India', region: 'Maharashtra', city: 'Pune', lat: 18.5, lng: 73.8, count: 4, ...over });
const metric = (over: Partial<LocationMetric> = {}): LocationMetric => ({
  label: 'Where responses came from',
  points: [point(), point({ city: null, region: null, country: 'France', lat: 48, lng: 2, count: 1 })],
  located: 5,
  total: 8,
  ...over,
});

async function loadMapWidget() {
  vi.resetModules();
  return (await import('@/components/dashboard-grid/MapWidget')).MapWidget;
}

describe('MapWidget', () => {
  beforeEach(() => {
    leaflet.markers.length = 0;
    Object.values(leaflet.mapObj).forEach((v) => typeof v === 'function' && (v as ReturnType<typeof vi.fn>).mockClear());
    leaflet.L.map.mockClear();
    leaflet.L.tileLayer.mockClear();
    leaflet.L.circleMarker.mockClear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders a static picture only in preview mode, without starting a map', async () => {
    const MapWidget = await loadMapWidget();
    render(<MapWidget metric={metric()} preview />);
    expect(screen.getByText('Where responses came from')).toBeInTheDocument();
    expect(leaflet.L.map).not.toHaveBeenCalled();
  });

  it('shows the empty state with no full-screen button when there are no points', async () => {
    const MapWidget = await loadMapWidget();
    render(<MapWidget metric={metric({ points: [], located: 0, total: 3 })} />);
    expect(screen.getByText('No locations yet')).toBeInTheDocument();
    expect(screen.getByText(/appears on the map when it is submitted from a public link/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View map full screen' })).not.toBeInTheDocument();
    expect(leaflet.L.map).not.toHaveBeenCalled();
  });

  it('summarises located responses and notes the unlocated ones', async () => {
    const MapWidget = await loadMapWidget();
    render(<MapWidget metric={metric()} />);
    expect(screen.getByText('5 of 8 responses located across 2 places')).toBeInTheDocument();
    expect(screen.getByText('3 responses had no location and are not shown.')).toBeInTheDocument();
  });

  it('omits the unlocated note when every response has a position', async () => {
    const MapWidget = await loadMapWidget();
    render(<MapWidget metric={metric({ located: 8, total: 8, points: [point()] })} />);
    expect(screen.getByText('8 of 8 responses located across 1 place')).toBeInTheDocument();
    expect(screen.queryByText(/had no location/)).not.toBeInTheDocument();
  });

  it('uses a custom title', async () => {
    const MapWidget = await loadMapWidget();
    render(<MapWidget metric={metric()} title="My map" />);
    expect(screen.getByRole('heading', { name: 'My map' })).toBeInTheDocument();
  });

  it('draws one bubble per place, scaled by count, and fits the bounds', async () => {
    const MapWidget = await loadMapWidget();
    render(<MapWidget metric={metric()} />);
    await waitFor(() => expect(leaflet.markers).toHaveLength(2));
    expect(leaflet.markers[0].opts.radius).toBeCloseTo(17); // busiest = 6 + 11
    expect(leaflet.markers[1].opts.radius).toBeCloseTo(6 + 11 * Math.sqrt(1 / 4));
    expect(leaflet.markers[0].tooltip).toBe('<strong>Pune, Maharashtra, India</strong><br/>4 responses');
    expect(leaflet.markers[1].tooltip).toBe('<strong>France</strong><br/>1 response');
    expect(leaflet.mapObj.fitBounds).toHaveBeenCalledWith('bounds-0.3', { maxZoom: 6 });
  });

  it('escapes HTML in place names', async () => {
    const MapWidget = await loadMapWidget();
    render(<MapWidget metric={metric({ points: [point({ city: '<b>x</b>', region: null, country: 'A&B' })] })} />);
    await waitFor(() => expect(leaflet.markers).toHaveLength(1));
    expect(leaflet.markers[0].tooltip).toContain('&lt;b&gt;x&lt;/b&gt;, A&amp;B');
  });

  it('uses the OpenStreetMap tiles by default', async () => {
    const MapWidget = await loadMapWidget();
    render(<MapWidget metric={metric()} />);
    await waitFor(() => expect(leaflet.L.tileLayer).toHaveBeenCalled());
    expect(leaflet.L.tileLayer.mock.calls[0]).toEqual(['https://tile.openstreetmap.org/{z}/{x}/{y}.png', expect.objectContaining({ maxZoom: 18 })]);
  });

  it('honours NEXT_PUBLIC_MAP_TILE_URL and NEXT_PUBLIC_MAP_ATTRIBUTION', async () => {
    vi.stubEnv('NEXT_PUBLIC_MAP_TILE_URL', 'https://tiles.example.com/{z}/{x}/{y}.png');
    vi.stubEnv('NEXT_PUBLIC_MAP_ATTRIBUTION', 'Example Tiles');
    const MapWidget = await loadMapWidget();
    render(<MapWidget metric={metric()} />);
    await waitFor(() => expect(leaflet.L.tileLayer).toHaveBeenCalled());
    expect(leaflet.L.tileLayer.mock.calls[0]).toEqual(['https://tiles.example.com/{z}/{x}/{y}.png', expect.objectContaining({ attribution: 'Example Tiles' })]);
  });

  it('removes the map on unmount', async () => {
    const MapWidget = await loadMapWidget();
    const { unmount } = render(<MapWidget metric={metric()} />);
    await waitFor(() => expect(leaflet.L.map).toHaveBeenCalled());
    unmount();
    expect(leaflet.mapObj.remove).toHaveBeenCalled();
  });

  it('opens a full-screen dialog with top places, and closes with Escape and the close button', async () => {
    const user = userEvent.setup();
    const MapWidget = await loadMapWidget();
    render(<MapWidget metric={metric()} />);
    await user.click(screen.getByRole('button', { name: 'View map full screen' }));
    const dialog = screen.getByRole('dialog', { name: 'Where responses came from' });
    expect(dialog).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    expect(dialog).toHaveTextContent('Top places');
    expect(dialog).toHaveTextContent('Pune, Maharashtra, India');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');

    await user.click(screen.getByRole('button', { name: 'View map full screen' }));
    await user.click(screen.getByRole('button', { name: 'Close full screen map' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lists at most eight top places, busiest first', async () => {
    const user = userEvent.setup();
    const MapWidget = await loadMapWidget();
    const points = Array.from({ length: 10 }, (_, i) => point({ city: `C${i}`, region: null, country: 'X', lat: i, lng: i, count: i + 1 }));
    render(<MapWidget metric={metric({ points, located: 55, total: 55 })} />);
    await user.click(screen.getByRole('button', { name: 'View map full screen' }));
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(8);
    expect(items[0]).toHaveTextContent('C9, X10');
  });

  it('loads Google Maps when a key is set, and falls back to Leaflet if the script fails', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-key');
    const MapWidget = await loadMapWidget();
    render(<MapWidget metric={metric()} />);
    const script = await waitFor(() => {
      const s = document.head.querySelector('script[src*="maps.googleapis.com"]') as HTMLScriptElement;
      expect(s).toBeTruthy();
      return s;
    });
    expect(script.src).toContain('key=test-key');
    expect(leaflet.L.map).not.toHaveBeenCalled();
    script.onerror?.(new Event('error'));
    await waitFor(() => expect(leaflet.L.map).toHaveBeenCalled());
    script.remove();
  });
});
