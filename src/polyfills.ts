import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  (window as any).global = window;
  (window as any).process = {
    env: {},
    browser: true,
    version: '',
    versions: {},
    nextTick: (cb: Function) => setTimeout(cb, 0),
  };
}
