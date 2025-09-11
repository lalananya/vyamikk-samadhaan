import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { apiFetch } from "../../src/api";
import TotpModal from "../../src/components/TotpModal";

export default function LoiSign() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSign = async (totpCode: string) => {
    setSubmitting(true);

    try {
      await apiFetch(`/loi/${id}/sign`, {
        method: "POST",
        body: JSON.stringify({ totpCode }),
      });

      setShowModal(false);
      Alert.alert("Success", "LOI signed successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      throw new Error(err.message || "Signing failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Letter of Intent</Text>
      <Text style={styles.id}>ID: {id}</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.buttonText}>Sign LOI</Text>
      </TouchableOpacity>

      <TotpModal
        visible={showModal}
        title="Enter TOTP to sign LOI"
        submitting={submitting}
        onConfirm={handleSign}
        onCancel={() => setShowModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    color: "#333",
  },
  id: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    color: "#666",
    fontFamily: "monospace",
  },
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
