import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";
let memoryToken: string | null = null; // fallback for web/dev

export async function setToken(token: string) {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    memoryToken = token;
  }
}

export async function getToken(): Promise<string | null> {
  try {
    const t = await SecureStore.getItemAsync(TOKEN_KEY);
    return t ?? memoryToken;
  } catch {
    return memoryToken;
  }
}

export async function clearToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } finally {
    memoryToken = null;
  }
}
