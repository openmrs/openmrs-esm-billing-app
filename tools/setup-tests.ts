import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

declare global {
  interface Window {
    openmrsBase: string;
    spaBase: string;
  }
}

window.openmrsBase = '/openmrs';
window.spaBase = '/spa';
window.getOpenmrsSpaBase = () => '/openmrs/spa/';
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock ResizeObserver for Carbon components that use it (e.g., TextArea)
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Suppress single-spa warnings in tests (these are expected when using framework mocks)
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('single-spa')) {
    return;
  }
  originalWarn(...args);
};
