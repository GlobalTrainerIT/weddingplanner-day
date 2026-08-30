/// <reference types="vite/client" />

interface Gtag {
  (...args: unknown[]): void;
}

interface Window {
  dataLayer?: unknown[];
  gtag?: Gtag;
}
