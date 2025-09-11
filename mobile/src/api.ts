import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE } from "./config";

export const api = axios.create({ baseURL: API_BASE, timeout: 15000 });

export async function loginReq(
  phone: string,
  password: string,
  orgId?: string,
) {
  const body: any = { phone, password };
  if (orgId && orgId.trim()) body.orgId = orgId.trim();
  const { data } = await api.post("/auth/login", body);
  await SecureStore.setItemAsync("auth_token", data.access_token ?? "");
  await SecureStore.setItemAsync("org_id", data.orgId ?? "");
  return data;
}
