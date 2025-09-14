import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  cashTransactionService,
  CashTransaction,
} from "../src/services/CashTransactionService";
import { appState } from "../src/state/AppState";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

export default function CashConfirmationScreen() {
  const { transactionId } = useLocalSearchParams();
  const router = useRouter();
  const [transaction, setTransaction] = useState<CashTransaction | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState({
    minutes: 0,
    seconds: 0,
    expired: false,
  });

  useEffect(() => {
    if (transactionId) {
      loadTransaction();
    }
  }, [transactionId]);

  useEffect(() => {
    if (transaction && transaction.status === "pending") {
      const interval = setInterval(() => {
        const remaining = cashTransactionService.getOTPTimeRemaining(
          transaction.otpExpiresAt,
        );
        setTimeRemaining(remaining);

        if (remaining.expired) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [transaction]);

  const loadTransaction = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!transactionId || typeof transactionId !== "string") {
        setError("Invalid transaction ID");
        return;
      }

      const tx = await cashTransactionService.getTransaction(transactionId);
      if (!tx) {
        setError("Transaction not found");
        return;
      }

      setTransaction(tx);

      // Track confirmation screen view
      analytics.track({
        event: "cash_confirmation_viewed",
        properties: {
          transactionId: tx.id,
          organizationId: tx.organizationId,
          amount: tx.amount,
          purpose: tx.purpose,
        },
        timestamp: new Date(),
      });
    } catch (err: any) {
      console.error("Failed to load transaction:", err);
      setError(err.message || "Failed to load transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTransaction = async () => {
    try {
      if (!otpCode.trim()) {
        Alert.alert("Required", "Please enter the OTP code");
        return;
      }

      if (!transaction) {
        Alert.alert("Error", "Transaction not found");
        return;
      }

      const user = appState.getUser();
      if (!user) {
        Alert.alert("Error", "User not found");
        return;
      }

      setConfirming(true);

      const result = await cashTransactionService.confirmTransaction(
        transaction.id,
        otpCode,
        user.id,
        user.phone, // Using phone as name for now
      );

      if (result.success) {
        Alert.alert("Success", "Transaction confirmed successfully!", [
          {
            text: "OK",
            onPress: () => router.replace("/dashboard"),
          },
        ]);
      } else {
        Alert.alert("Error", result.error || "Failed to confirm transaction");
      }
    } catch (error: any) {
      console.error("Error confirming transaction:", error);
      Alert.alert("Error", "Failed to confirm transaction");
    } finally {
      setConfirming(false);
    }
  };

  const handleOverrideTransaction = async () => {
    try {
      if (!transaction) {
        Alert.alert("Error", "Transaction not found");
        return;
      }

      const user = appState.getUser();
      if (!user) {
        Alert.alert("Error", "User not found");
        return;
      }

      Alert.prompt(
        "Override Transaction",
        "Enter reason for overriding this transaction:",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Override",
            onPress: async (reason) => {
              if (!reason || !reason.trim()) {
                Alert.alert("Required", "Please enter a reason for override");
                return;
              }

              setConfirming(true);

              const result = await cashTransactionService.overrideTransaction(
                transaction.id,
                user.id,
                user.phone, // Using phone as name for now
                reason,
              );

              if (result.success) {
                Alert.alert("Success", "Transaction overridden successfully!", [
                  {
                    text: "OK",
                    onPress: () => router.replace("/dashboard"),
                  },
                ]);
              } else {
                Alert.alert(
                  "Error",
                  result.error || "Failed to override transaction",
                );
              }

              setConfirming(false);
            },
          },
        ],
      );
    } catch (error: any) {
      console.error("Error overriding transaction:", error);
      Alert.alert("Error", "Failed to override transaction");
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout title="Confirm Transaction">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading transaction...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  if (error) {
    return (
      <AuthenticatedLayout title="Confirm Transaction">
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadTransaction}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </AuthenticatedLayout>
    );
  }

  if (!transaction) {
    return (
      <AuthenticatedLayout title="Confirm Transaction">
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Transaction not found</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout title="Confirm Transaction">
      <ScrollView style={styles.container}>
        {/* Transaction Details */}
        <View style={styles.transactionCard}>
          <Text style={styles.transactionTitle}>Transaction Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>From:</Text>
            <Text style={styles.detailValue}>{transaction.initiatorName}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>To:</Text>
            <Text style={styles.detailValue}>{transaction.recipientName}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount:</Text>
            <Text style={styles.amountValue}>
              {cashTransactionService.formatAmount(transaction.amount)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Purpose:</Text>
            <Text style={styles.detailValue}>
              {cashTransactionService.getPurposeLabel(transaction.purpose)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reference:</Text>
            <Text style={styles.detailValue}>{transaction.referenceNote}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created:</Text>
            <Text style={styles.detailValue}>
              {new Date(transaction.createdAt).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Status Display */}
        <View style={styles.statusCard}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: cashTransactionService.getStatusColor(
                  transaction.status,
                ),
              },
            ]}
          >
            <Text style={styles.statusText}>
              {cashTransactionService.getStatusLabel(transaction.status)}
            </Text>
          </View>
        </View>

        {/* OTP Section */}
        {transaction.status === "pending" && !timeRemaining.expired && (
          <View style={styles.otpCard}>
            <Text style={styles.otpTitle}>Enter OTP to Confirm</Text>
            <Text style={styles.otpSubtitle}>
              OTP sent to your registered phone number
            </Text>

            <TextInput
              style={styles.otpInput}
              value={otpCode}
              onChangeText={setOtpCode}
              placeholder="Enter 6-digit OTP"
              placeholderTextColor="#666"
              keyboardType="numeric"
              maxLength={6}
              autoFocus
            />

            <Text style={styles.otpTimer}>
              Time remaining: {timeRemaining.minutes}:
              {timeRemaining.seconds.toString().padStart(2, "0")}
            </Text>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                confirming && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirmTransaction}
              disabled={confirming || !otpCode.trim()}
            >
              {confirming ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  Confirm Transaction
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Expired Section */}
        {transaction.status === "pending" && timeRemaining.expired && (
          <View style={styles.expiredCard}>
            <Text style={styles.expiredTitle}>OTP Expired</Text>
            <Text style={styles.expiredSubtitle}>
              The OTP has expired. Please contact the initiator to resend the
              transaction.
            </Text>
          </View>
        )}

        {/* Completed Section */}
        {transaction.status === "completed" && (
          <View style={styles.completedCard}>
            <Text style={styles.completedTitle}>Transaction Completed</Text>
            <Text style={styles.completedSubtitle}>
              Confirmed by: {transaction.confirmedBy}
            </Text>
            <Text style={styles.completedSubtitle}>
              Confirmed at:{" "}
              {new Date(transaction.confirmedAt!).toLocaleString()}
            </Text>
          </View>
        )}

        {/* Overridden Section */}
        {transaction.status === "overridden" && (
          <View style={styles.overriddenCard}>
            <Text style={styles.overriddenTitle}>Transaction Overridden</Text>
            <Text style={styles.overriddenSubtitle}>
              Overridden by: {transaction.overriddenBy}
            </Text>
            <Text style={styles.overriddenSubtitle}>
              Reason: {transaction.overrideReason}
            </Text>
            <Text style={styles.overriddenSubtitle}>
              Overridden at:{" "}
              {new Date(transaction.overriddenAt!).toLocaleString()}
            </Text>
          </View>
        )}

        {/* Override Button (for authorized users) */}
        {(transaction.status === "pending" ||
          transaction.status === "expired") && (
          <View style={styles.overrideSection}>
            <TouchableOpacity
              style={styles.overrideButton}
              onPress={handleOverrideTransaction}
              disabled={confirming}
            >
              <Text style={styles.overrideButtonText}>
                Override Transaction
              </Text>
            </TouchableOpacity>
            <Text style={styles.overrideNote}>
              Only authorized users can override transactions
            </Text>
          </View>
        )}

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    color: "#f44336",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#f44336",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  transactionCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  transactionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: "#999",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: "#fff",
    flex: 2,
    textAlign: "right",
  },
  amountValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
    flex: 2,
    textAlign: "right",
  },
  statusCard: {
    alignItems: "center",
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  otpCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  otpTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  otpSubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 24,
  },
  otpInput: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    color: "#fff",
    textAlign: "center",
    letterSpacing: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  otpTimer: {
    fontSize: 14,
    color: "#ff9800",
    textAlign: "center",
    marginBottom: 24,
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#666",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  expiredCard: {
    backgroundColor: "#2d1b1b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  expiredTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f44336",
    textAlign: "center",
    marginBottom: 8,
  },
  expiredSubtitle: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
  },
  completedCard: {
    backgroundColor: "#1b2d1b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  completedTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
    textAlign: "center",
    marginBottom: 8,
  },
  completedSubtitle: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
    marginBottom: 4,
  },
  overriddenCard: {
    backgroundColor: "#2d1b2d",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  overriddenTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#9C27B0",
    textAlign: "center",
    marginBottom: 8,
  },
  overriddenSubtitle: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
    marginBottom: 4,
  },
  overrideSection: {
    alignItems: "center",
    marginBottom: 16,
  },
  overrideButton: {
    backgroundColor: "#9C27B0",
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 8,
  },
  overrideButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  overrideNote: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
  backButton: {
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
