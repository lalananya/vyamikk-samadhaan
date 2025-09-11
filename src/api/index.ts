import { request } from "../net/http";
export * from "../config";

// canonical login used everywhere
export async function login(payload: { phone: string; totp?: string }) {
  return request("/auth/login", { json: payload, timeoutMs: 8000 });
}

// BACKWARD COMPAT: some screens still import { loginReq } from '../src/api'
export const loginReq = login;

// Ensure normalizePhone is available
export { normalizePhone } from "../config";

// BACKWARD COMPAT: some screens still import { apiFetch } from '../src/api'
// This thin wrapper adapts old fetch-like calls to the new request() client
export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  const method = options.method || (options.body ? "POST" : "GET");
  let json: any | undefined = undefined;
  if (typeof options.body !== "undefined") {
    try {
      json =
        typeof options.body === "string"
          ? JSON.parse(options.body as string)
          : (options.body as any);
    } catch {
      // If body isn't JSON, pass-through as is (request will ignore non-objects)
      json = options.body as any;
    }
  }
  return request(path, { method, headers, json });
}
