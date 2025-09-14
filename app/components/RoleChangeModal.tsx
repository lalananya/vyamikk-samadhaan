import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../src/api";
import Strings from "../../src/strings";

interface RoleChangeModalProps {
  visible: boolean;
  onClose: () => void;
  currentRole: "organisation" | "professional";
}

export default function RoleChangeModal({
  visible,
  onClose,
  currentRole,
}: RoleChangeModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const newRole =
    currentRole === "organisation" ? "professional" : "organisation";
  const newRoleLabel =
    newRole === "organisation"
      ? Strings.ROLES.ORGANISATION_LABEL
      : Strings.ROLES.PROFESSIONAL_LABEL;
  const currentRoleLabel =
    currentRole === "organisation"
      ? Strings.ROLES.ORGANISATION_LABEL
      : Strings.ROLES.PROFESSIONAL_LABEL;

  const isReasonValid = reason.trim().length >= 10;

  const handleSubmit = async () => {
    if (!isReasonValid) {
      Alert.alert(
        Strings.ROLE_CHANGE.ERROR,
        "Please provide a reason with at least 10 characters",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiFetch("/support/role-change", {
        method: "POST",
        body: JSON.stringify({
          to_role: newRole,
          reason: reason.trim(),
        }),
      });

      if (response.ok) {
        Alert.alert(
          Strings.ROLE_CHANGE.SUCCESS,
          `Request submitted successfully. Ticket ID: ${response.id}`,
          [{ text: "OK", onPress: onClose }],
        );
        setReason("");
      } else {
        Alert.alert(
          Strings.ROLE_CHANGE.ERROR,
          response.error || "Failed to submit request",
        );
      }
    } catch (error) {
      Alert.alert(Strings.ROLE_CHANGE.ERROR, error.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason("");
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {Strings.ROLE_CHANGE.REQUEST_ROLE_CHANGE}
            </Text>
            <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.roleInfo}>
              <Text style={styles.roleText}>
                From: <Text style={styles.roleBold}>{currentRoleLabel}</Text>
              </Text>
              <Text style={styles.roleText}>
                To: <Text style={styles.roleBold}>{newRoleLabel}</Text>
              </Text>
            </View>

            <Text style={styles.label}>{Strings.ROLE_CHANGE.REASON_LABEL}</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Please explain why you need to change your role..."
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
            <Text style={styles.charCount}>
              {reason.length}/500 characters (minimum 10)
            </Text>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                (!isReasonValid || isSubmitting) && styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={!isReasonValid || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {Strings.ROLE_CHANGE.SUBMIT_REQUEST}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "white",
    borderRadius: 12,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  content: {
    padding: 20,
  },
  roleInfo: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  roleText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  roleBold: {
    fontWeight: "bold",
    color: "#333",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: "#666",
    textAlign: "right",
    marginTop: 4,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    paddingTop: 0,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  submitButton: {
    backgroundColor: "#007bff",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
});
