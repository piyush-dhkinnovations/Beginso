/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';

import { vi } from 'vitest';

// --- IntersectionObserver mock (required for FeaturesSection / HowItWorksSection) ---
class MockIntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: number[] = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

// --- ResizeObserver mock (required for EChartContainer) ---
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('ResizeObserver', MockResizeObserver);

// --- localStorage mock ---
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
vi.stubGlobal('localStorage', localStorageMock);

// --- document.cookie mock ---
let cookieStore = '';
Object.defineProperty(document, 'cookie', {
  get: () => cookieStore,
  set: (val: string) => { cookieStore = val; },
  configurable: true,
});

// --- window.matchMedia mock ---
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// --- window.scrollY mock ---
Object.defineProperty(window, 'scrollY', {
  writable: true,
  value: 0,
});

// Reset localStorage store before each test
beforeEach(() => {
  localStorageMock.clear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  cookieStore = '';
});

// --- Link clicks: jsdom cannot navigate and prints "Not implemented: navigation to another Document" for every
// click on a real <a href>. Tests assert on the href, never on an actual page load, so the default action is cancelled
// after React's own handlers have run (this listener sits on document, above React's root).
if (typeof document !== 'undefined') {
  document.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest?.('a[href]');
    if (link && !event.defaultPrevented) event.preventDefault();
  });
}

// findBy*/waitFor default to 1 s. Pages that lazy-load their charts and grid (dynamic imports) can take longer than
// that when 36 workers compile at once, which made a populated-state test fail once in a while. A passing test
// never waits longer than it needs to, so a roomier ceiling only affects runs that would otherwise flake.
import { configure } from '@testing-library/react';
configure({ asyncUtilTimeout: 5000 });
