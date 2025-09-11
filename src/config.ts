import Constants from "expo-constants";

function inferLan() {
  const c: any = Constants;
  const host = (
    c?.expoConfig?.hostUri ||
    c?.manifest2?.extra?.expoClient?.hostUri ||
    c?.manifest?.hostUri ||
    c?.debuggerHost ||
    ""
  ).split(":")[0];
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ? host : null;
}

// Resolve API base in this precedence:
// 1) EXPO_PUBLIC_API_BASE from env files
// 2) app.json extra.apiBase or extra.apiUrl
// 3) USB mode -> 127.0.0.1
// 4) LAN IP
// 5) Tunnel fallback
const extra: any = (Constants as any)?.expoConfig?.extra || {};
const envBase = String(process.env.EXPO_PUBLIC_API_BASE || "").trim();
const extraBase = String(extra.apiBase || extra.apiUrl || "").trim();
const usb =
  String(process.env.EXPO_PUBLIC_API_MODE || "").toLowerCase() === "usb";
const lan = inferLan();
const tunnel = "https://vyamikk-api.loca.lt"; // change if you use another

export const API_BASE =
  envBase ||
  extraBase ||
  (usb ? "http://127.0.0.1:4000/api/v1" : "") ||
  (lan ? `http://${lan}:4000/api/v1` : "") ||
  tunnel;

// Debug logging
if (__DEV__) {
  console.log("🔧 API_BASE resolved to:", API_BASE);
  console.log("🔧 envBase:", envBase);
  console.log("🔧 extraBase:", extraBase);
  console.log("🔧 lan:", lan);
  console.log("🔧 usb:", usb);
}

// Cache for health check results to prevent excessive API calls
let healthCheckCache: { result: any; timestamp: number } | null = null;
const HEALTH_CHECK_CACHE_DURATION = 10000; // 10 seconds

export async function pingApi(ms = 2500) {
  // Return cached result if it's still fresh
  if (
    healthCheckCache &&
    Date.now() - healthCheckCache.timestamp < HEALTH_CHECK_CACHE_DURATION
  ) {
    return healthCheckCache.result;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const candidates = [
    `${API_BASE}/health`,
    `${API_BASE}/healthz`,
    `${API_BASE.replace(/\/api\/v1$/, "")}/health`,
    `${API_BASE.replace(/\/api\/v1$/, "")}/healthz`,
  ];
  try {
    for (const url of candidates) {
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (res.ok) {
          clearTimeout(timer);
          const result = { ok: true, status: res.status, base: API_BASE };
          // Cache the successful result
          healthCheckCache = { result, timestamp: Date.now() };
          return result;
        }
      } catch (_) {
        // try next
      }
    }
    clearTimeout(timer);
    const result = {
      ok: false,
      status: 0,
      base: API_BASE,
      error: "unreachable",
    };
    // Cache the failed result for a shorter duration
    healthCheckCache = { result, timestamp: Date.now() };
    return result;
  } catch (e: any) {
    clearTimeout(timer);
    const result = {
      ok: false,
      status: 0,
      base: API_BASE,
      error: e?.message || "net",
    };
    // Cache the error result for a shorter duration
    healthCheckCache = { result, timestamp: Date.now() };
    return result;
  }
}

export const normalizePhone = (s: string) => {
  const digits = s.replace(/\D/g, "");
  // If it's already 12 digits starting with 91, return as is
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  // If it's 10 digits, add +91 prefix
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  // If it's 11 digits starting with 0, remove the 0 and add +91
  if (digits.length === 11 && digits.startsWith("0")) {
    return `+91${digits.slice(1)}`;
  }
  // For any other case, try to extract last 10 digits and add +91
  return `+91${digits.slice(-10)}`;
};
