import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

interface TotpModalProps {
  visible: boolean;
  title?: string;
  submitting?: boolean;
  onConfirm: (code: string) => Promise<void> | void;
  onCancel: () => void;
}

export default function TotpModal({
  visible,
  title = "Enter 6-digit code",
  submitting = false,
  onConfirm,
  onCancel,
}: TotpModalProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  // Clear code and error when modal hides
  useEffect(() => {
    if (!visible) {
      setCode("");
      setError("");
    }
  }, [visible]);

  const handleConfirm = async () => {
    if (code.length !== 6) return;

    try {
      setError("");
      await onConfirm(code);
    } catch (err: any) {
      setError(err.message || "Verification failed");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>

          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            editable={!submitting}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={submitting}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                (code.length !== 6 || submitting) && styles.disabledButton,
              ]}
              onPress={handleConfirm}
              disabled={code.length !== 6 || submitting}
            >
              <Text style={styles.confirmText}>
                {submitting ? "Verifying..." : "Confirm"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 320,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 4,
    marginBottom: 16,
    backgroundColor: "#f9f9f9",
  },
  error: {
    color: "#e74c3c",
    textAlign: "center",
    marginBottom: 16,
    fontSize: 14,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  confirmButton: {
    backgroundColor: "#007bff",
  },
  disabledButton: {
    backgroundColor: "#6c757d",
  },
  cancelText: {
    color: "#6c757d",
    fontWeight: "500",
  },
  confirmText: {
    color: "white",
    fontWeight: "500",
  },
});
