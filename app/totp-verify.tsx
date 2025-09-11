import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { apiFetch } from "../src/api";
import SafeScreen from "../src/components/SafeScreen";
import BottomBar from "../src/components/BottomBar";

const PHONE_KEY = "vyamikk_phone";

export default function TotpVerify() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load stored phone on mount
  useEffect(() => {
    loadStoredPhone();
  }, []);

  const loadStoredPhone = async () => {
    try {
      const storedPhone = await SecureStore.getItemAsync(PHONE_KEY);
      if (storedPhone) {
        setPhone(storedPhone);
      }
    } catch (err) {
      console.log("Could not load stored phone:", err);
    }
  };

  const handleVerify = async () => {
    if (!phone.trim() || code.length !== 6) {
      setError("Please enter phone number and 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await apiFetch("/totp/verify", {
        method: "POST",
        body: JSON.stringify({
          phone: phone.trim(),
          code: code.trim(),
        }),
      });

      Alert.alert("Success", "TOTP verified successfully!", [
        { text: "OK", onPress: () => router.replace("/dashboard") },
      ]);
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeScreen title="Verify TOTP">
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="6-digit code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          editable={!loading}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <BottomBar>
        <TouchableOpacity
          style={[
            styles.button,
            (!phone.trim() || code.length !== 6 || loading) &&
              styles.disabledButton,
          ]}
          onPress={handleVerify}
          disabled={!phone.trim() || code.length !== 6 || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Verify TOTP</Text>
          )}
        </TouchableOpacity>
      </BottomBar>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    flex: 1,
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: "white",
  },
  error: {
    color: "#e74c3c",
    textAlign: "center",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: "#6c757d",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
