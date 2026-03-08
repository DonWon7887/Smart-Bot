// Fix for "Cannot set property fetch of #<Window> which has only a getter"
// This must be at the absolute top before any other imports
if (typeof window !== 'undefined') {
  try {
    const originalFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      value: originalFetch,
      writable: true,
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    try {
      const f = window.fetch;
      Object.defineProperty(window, 'fetch', {
        get: () => f,
        set: () => { console.warn('Blocked attempt to overwrite window.fetch'); },
        configurable: true,
        enumerable: true
      });
    } catch (e2) {
      // @ts-ignore
      const globalProxy = new Proxy(window, {
        get: (target, prop) => target[prop as keyof Window],
        set: (target, prop, value) => {
          if (prop === 'fetch') {
            console.warn('Blocked attempt to overwrite fetch via global proxy');
            return true;
          }
          try {
            // @ts-ignore
            target[prop] = value;
          } catch (err) {
            console.warn('Failed to set ' + String(prop) + ' on window:', err);
          }
          return true;
        }
      });
      // @ts-ignore
      window.global = globalProxy;
      // @ts-ignore
      window.globalThis = globalProxy;
    }
  }
}

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
