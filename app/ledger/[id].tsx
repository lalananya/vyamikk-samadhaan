import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { apiFetch } from "../../src/api";
import TotpModal from "../../src/components/TotpModal";

export default function LedgerAck() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAcknowledge = async (totpCode: string) => {
    setSubmitting(true);

    try {
      await apiFetch(`/ledger/${id}/ack`, {
        method: "POST",
        body: JSON.stringify({ totpCode }),
      });

      setShowModal(false);
      Alert.alert("Success", "Ledger entry acknowledged!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      throw new Error(err.message || "Acknowledgment failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ledger Entry</Text>
      <Text style={styles.id}>ID: {id}</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.buttonText}>Acknowledge</Text>
      </TouchableOpacity>

      <TotpModal
        visible={showModal}
        title="Enter TOTP to acknowledge"
        submitting={submitting}
        onConfirm={handleAcknowledge}
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
    backgroundColor: "#28a745",
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
