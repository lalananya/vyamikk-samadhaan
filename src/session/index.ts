import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "authToken";
let mem: string | null = null;

export async function setToken(t: string | null): Promise<void> {
  mem = t;
  if (__DEV__) console.log("💾 Storing token:", t ? "YES" : "NO");
  t ? await AsyncStorage.setItem(KEY, t) : await AsyncStorage.removeItem(KEY);
}

export async function getToken(): Promise<string | null> {
  if (mem) {
    if (__DEV__) console.log("💾 Token from memory:", "YES");
    return mem;
  }
  mem = await AsyncStorage.getItem(KEY);
  if (__DEV__) console.log("💾 Token from storage:", mem ? "YES" : "NO");
  return mem;
}

export async function clearToken(): Promise<void> {
  mem = null;
  if (__DEV__) console.log("💾 Clearing token");
  await AsyncStorage.removeItem(KEY);
}
