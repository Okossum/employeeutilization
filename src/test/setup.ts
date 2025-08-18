/**
 * Vitest setup for unit tests
 */

// Mock DOM APIs if needed
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Firebase to prevent initialization during unit tests
vi.mock('../lib/firebase', () => ({
  db: {},
  auth: {},
  storage: {}
}));

// Setup global test utilities
global.beforeEach = beforeEach;
global.afterEach = afterEach;
global.describe = describe;
global.it = it;
global.test = test;
global.expect = expect;
global.vi = vi;

