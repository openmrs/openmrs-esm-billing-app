import '@testing-library/jest-dom';

declare global {
  interface Window {
    openmrsBase: string;
    spaBase: string;
  }
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    function fn(): any;
  }
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace vi {
    function fn(): any;
  }
}

window.openmrsBase = '/openmrs';
window.spaBase = '/spa';
window.getOpenmrsSpaBase = () => '/openmrs/spa/';

// Use vitest's vi if available, otherwise fall back to jest
if (typeof (globalThis as any).vi !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = (globalThis as any).vi.fn();
} else {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
}
