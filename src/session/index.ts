import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "authToken";
let mem: string | null = null;

export async function setToken(t: string | null): Promise<void> {
  mem = t;
  if (__DEV__) console.log("💾 Storing token:", t ? "YES" : "NO");
  if (t) {
    await AsyncStorage.setItem(KEY, t);
    if (__DEV__) console.log("💾 Token stored to AsyncStorage");
  } else {
    await AsyncStorage.removeItem(KEY);
    if (__DEV__) console.log("💾 Token removed from AsyncStorage");
  }
}

export async function getToken(): Promise<string | null> {
  if (mem) {
    if (__DEV__) console.log("💾 Token from memory:", "YES");
    return mem;
  }
  if (__DEV__) console.log("💾 Token not in memory, checking AsyncStorage...");
  mem = await AsyncStorage.getItem(KEY);
  if (__DEV__) console.log("💾 Token from AsyncStorage:", mem ? "YES" : "NO");
  if (mem && __DEV__) console.log("💾 Token preview:", mem.substring(0, 20) + "...");
  return mem;
}

export async function clearToken(): Promise<void> {
  mem = null;
  if (__DEV__) console.log("💾 Clearing token");
  await AsyncStorage.removeItem(KEY);
}
