import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  if (typeof window === 'undefined') return; // Node-Umgebung (Transporttests)
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});
