// Legacy shim: point old imports to the canonical API barrel at src/api/index.ts
// Important: reference the explicit index to avoid a self-import cycle.
export * from './api/index';
