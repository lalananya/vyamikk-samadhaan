// app/login.tsx
import React, { useState } from "react";
import { View, Text, TextInput, Button, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { router } from "expo-router";
import { API_BASE } from "../src/config";
import { setToken } from "../src/auth";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!phone.trim()) return Alert.alert("Enter phone number");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), otp: otp.trim() || undefined }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // ignore JSON parse errors; we'll handle via res.ok below
      }

      if (!res.ok) {
        const msg = data?.message ?? `HTTP ${res.status}`;
        throw new Error(msg);
      }

      // Accept several possible response shapes
      const token = data?.token ?? data?.data?.token;
      if (!token) throw new Error("Token missing in response");

      await setToken(token);

      const displayPhone =
        data?.phone ?? data?.user?.phone ?? data?.data?.phone ?? phone.trim();

      Alert.alert("Success", `Logged in as ${displayPhone}`);
      router.replace("/dashboard");
    } catch (e: any) {
      Alert.alert("Login failed", e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Phone"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      <TextInput
        style={styles.input}
        placeholder="OTP (optional)"
        keyboardType="number-pad"
        value={otp}
        onChangeText={setOtp}
      />

      {loading ? <ActivityIndicator /> : <Button title="Submit" onPress={submit} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  input: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "white",
  },
});
