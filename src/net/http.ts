import { API_BASE } from "../config";
import { getToken } from "../session";
import { appState } from "../state/AppState";

export class HttpError extends Error {
  url: string;
  status?: number;
  body?: string;
  base: string;
  constructor(
    msg: string,
    info: { url: string; status?: number; body?: string; base: string },
  ) {
    super(msg);
    Object.assign(this, info);
  }
}

async function read(res: Response) {
  const text = await res.text();
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text };
  }
}

export async function request(
  path: string,
  opts: {
    method?: string;
    json?: any;
    headers?: Record<string, string>;
    timeoutMs?: number;
    requireOrgId?: boolean;
  } = {},
) {
  const base = API_BASE,
    url = `${base}${path}`;
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 8000);
  try {
    const token = await getToken();
    const currentOrgId = appState.getCurrentOrganizationId();

    // Check if X-Org-Id is required for business routes
    const isBusinessRoute =
      path.includes("/organizations/") ||
      path.includes("/employees/") ||
      path.includes("/attendance/") ||
      path.includes("/billing/") ||
      path.includes("/reports/");

    if (isBusinessRoute && opts.requireOrgId !== false && !currentOrgId) {
      throw new HttpError("Organization context required", {
        url,
        status: 400,
        body: "X-Org-Id header missing",
        base,
      });
    }

    if (__DEV__) {
      console.log("🌐 Request to:", url);
      console.log("🔑 Token available:", token ? "YES" : "NO");
      console.log("🏢 Org ID:", currentOrgId || "NONE");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(currentOrgId && isBusinessRoute ? { "X-Org-Id": currentOrgId } : {}),
      ...(opts.headers || {}),
    };

    const res = await fetch(url, {
      method: opts.method || (opts.json ? "POST" : "GET"),
      headers,
      body: opts.json ? JSON.stringify(opts.json) : undefined,
      signal: ctl.signal,
    });
    clearTimeout(to);
    if (!res.ok) {
      const { text } = await read(res);
      throw new HttpError(`HTTP ${res.status}`, {
        url,
        status: res.status,
        body: text?.slice(0, 500),
        base,
      });
    }
    const { json, text } = await read(res);
    return json ?? text;
  } catch (e: any) {
    clearTimeout(to);
    if (e instanceof HttpError) throw e;
    throw new HttpError(e?.message || "Network error", { url, base });
  }
}
