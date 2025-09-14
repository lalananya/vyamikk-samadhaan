// app/cash-receipts.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { apiFetch } from "../src/api";
import { getToken } from "../src/auth";

interface CashReceipt {
  id: string;
  amount: number;
  description: string;
  from: string;
  to: string;
  date: string;
  status: "pending" | "acknowledged" | "rejected";
  otp?: string;
}

export default function CashReceipts() {
  const [receipts, setReceipts] = useState<CashReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<CashReceipt | null>(
    null,
  );
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpInput, setOtpInput] = useState("");

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      // In a real app, this would fetch from the backend
      // For now, we'll use mock data
      const mockReceipts: CashReceipt[] = [
        {
          id: "1",
          amount: 5000,
          description: "Payment for construction work",
          from: "ABC Construction",
          to: "John Doe",
          date: "2024-01-15",
          status: "pending",
          otp: "1234",
        },
        {
          id: "2",
          amount: 3000,
          description: "Daily wages",
          from: "XYZ Builders",
          to: "Jane Smith",
          date: "2024-01-14",
          status: "acknowledged",
        },
        {
          id: "3",
          amount: 7500,
          description: "Project completion bonus",
          from: "DEF Contractors",
          to: "Mike Johnson",
          date: "2024-01-13",
          status: "rejected",
        },
      ];
      setReceipts(mockReceipts);
    } catch (error) {
      Alert.alert("Error", "Failed to load receipts");
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = (receipt: CashReceipt) => {
    setSelectedReceipt(receipt);
    setOtpModalVisible(true);
  };

  const verifyOTP = async () => {
    if (!selectedReceipt) return;

    if (otpInput !== selectedReceipt.otp) {
      Alert.alert("Invalid OTP", "Please enter the correct OTP");
      return;
    }

    try {
      // In a real app, this would send to backend
      setReceipts((prev) =>
        prev.map((r) =>
          r.id === selectedReceipt.id
            ? { ...r, status: "acknowledged" as const }
            : r,
        ),
      );

      setOtpModalVisible(false);
      setOtpInput("");
      setSelectedReceipt(null);
      Alert.alert("Success", "Receipt acknowledged successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to acknowledge receipt");
    }
  };

  const handleReject = (receipt: CashReceipt) => {
    Alert.alert(
      "Reject Receipt",
      "Are you sure you want to reject this receipt?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => {
            setReceipts((prev) =>
              prev.map((r) =>
                r.id === receipt.id ? { ...r, status: "rejected" as const } : r,
              ),
            );
            Alert.alert("Receipt Rejected", "The receipt has been rejected");
          },
        },
      ],
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#f59e0b";
      case "acknowledged":
        return "#10b981";
      case "rejected":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "acknowledged":
        return "Acknowledged";
      case "rejected":
        return "Rejected";
      default:
        return "Unknown";
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cash Receipts</Text>
      <Text style={styles.subtitle}>Manage your payment receipts</Text>

      {loading ? (
        <Text style={styles.loadingText}>Loading receipts...</Text>
      ) : (
        <ScrollView style={styles.receiptsList}>
          {receipts.map((receipt) => (
            <View key={receipt.id} style={styles.receiptCard}>
              <View style={styles.receiptHeader}>
                <Text style={styles.amount}>
                  ₹{receipt.amount.toLocaleString()}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(receipt.status) },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {getStatusText(receipt.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.description}>{receipt.description}</Text>
              <Text style={styles.fromTo}>From: {receipt.from}</Text>
              <Text style={styles.fromTo}>To: {receipt.to}</Text>
              <Text style={styles.date}>Date: {receipt.date}</Text>

              {receipt.status === "pending" && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acknowledgeButton]}
                    onPress={() => handleAcknowledge(receipt)}
                  >
                    <Text style={styles.actionButtonText}>Acknowledge</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(receipt)}
                  >
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={otpModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verify OTP</Text>
            <Text style={styles.modalDescription}>
              Enter the OTP sent to your phone to acknowledge this receipt
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="Enter OTP"
              value={otpInput}
              onChangeText={setOtpInput}
              keyboardType="numeric"
              maxLength={6}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setOtpModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.verifyButton]}
                onPress={verifyOTP}
              >
                <Text style={styles.verifyButtonText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 8,
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    color: "#666",
    paddingHorizontal: 24,
  },
  loadingText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#666",
  },
  receiptsList: {
    padding: 24,
  },
  receiptCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  receiptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  amount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  description: {
    fontSize: 16,
    color: "#374151",
    marginBottom: 8,
  },
  fromTo: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  acknowledgeButton: {
    backgroundColor: "#10b981",
  },
  rejectButton: {
    backgroundColor: "#ef4444",
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 12,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
    color: "#1a1a1a",
  },
  modalDescription: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#666",
  },
  otpInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  verifyButton: {
    backgroundColor: "#3b82f6",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  verifyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
