import React, { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { authLoginReq, API_BASE, pingApi } from "../src/api";
import { NetworkStatus } from "../src/components/NetworkStatus";
import { useNetworkStatus } from "../src/hooks/useNetworkStatus";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<{
    ok: boolean;
    status?: number;
    error?: string;
    base: string;
  }>({ ok: false, base: API_BASE });
  const { isOnline, forceCheck } = useNetworkStatus();

  useEffect(() => {
    (async () => setStatus(await pingApi()))();
  }, []);

  async function onSubmit() {
    try {
      const data = await authLoginReq({ phone, totp: otp });
      Alert.alert("Success", "Logged in");
      // navigate to dashboard...
    } catch (e: any) {
      const msg = [
        "Request failed",
        `Base: ${API_BASE}`,
        `Online: ${isOnline}`,
        e?.status ? `HTTP: ${e.status}` : "HTTP: (no response)",
        e?.message ? `Msg: ${e.message}` : "",
        e?.body ? `Body: ${String(e.body).slice(0, 200)}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      Alert.alert("Error", msg);
    }
  }

  return (
    <SafeAreaView style={s.wrap}>
      <NetworkStatus onRetry={() => setStatus({ ok: false, base: API_BASE })} />

      <Text style={s.h1}>Vyamikk Samadhaan</Text>
      <Text style={s.sub}>Login to continue</Text>

      <TextInput
        style={s.input}
        placeholder="+91XXXXXXXXXX"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <TextInput
        style={s.input}
        placeholder="OTP (try 000000)"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
      />

      <TouchableOpacity style={s.btn} onPress={onSubmit}>
        <Text style={s.btnTxt}>Login</Text>
      </TouchableOpacity>

      {__DEV__ && (
        <View style={s.debug}>
          <Text style={s.debugTxt}>API: {status.base}</Text>
          <Text style={s.debugTxt}>
            Reachable: {String(status.ok)}{" "}
            {status.status
              ? `(HTTP ${status.status})`
              : status.error
                ? `(${status.error})`
                : ""}
          </Text>
          <Text style={s.debugTxt}>Online: {String(isOnline)}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#000",
    padding: 24,
    justifyContent: "center",
  },
  h1: { color: "#fff", fontSize: 28, fontWeight: "800", marginBottom: 6 },
  sub: { color: "#aaa", marginBottom: 16 },
  input: {
    backgroundColor: "#111",
    color: "#fff",
    borderColor: "#333",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnTxt: { color: "#fff", fontWeight: "700" },
  debug: {
    marginTop: 18,
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    padding: 12,
  },
  debugTxt: { color: "#9acdff", fontSize: 12 },
});
