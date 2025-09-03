import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

export const API_BASE =
  (Constants.expoConfig?.extra as any)?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://10.0.2.2:4000'; // emulator default

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await SecureStore.getItemAsync('authToken');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();

  // Try to parse JSON; fall back to text
  let data: any;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const msg = (data && (data.message || data.detail)) || res.statusText || 'Request failed';
    throw new Error(msg);
  }
  return data;
}

export async function postJson<T = any>(path: string, body: any) {
  return apiFetch(path, { method: 'POST', body: JSON.stringify(body) }) as Promise<T>;
}
