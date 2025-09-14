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
  fundDisbursementService,
  PayoutRequest,
} from "../src/services/FundDisbursementService";
import { appState } from "../src/state/AppState";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

export default function PayoutConfirmationScreen() {
  const { payoutId } = useLocalSearchParams();
  const router = useRouter();
  const [payout, setPayout] = useState<PayoutRequest | null>(null);
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
    if (payoutId) {
      loadPayout();
    }
  }, [payoutId]);

  useEffect(() => {
    if (payout && payout.status === "pending") {
      const interval = setInterval(() => {
        const remaining = fundDisbursementService.getOTPTimeRemaining(
          payout.otpExpiresAt,
        );
        setTimeRemaining(remaining);

        if (remaining.expired) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [payout]);

  const loadPayout = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!payoutId || typeof payoutId !== "string") {
        setError("Invalid payout ID");
        return;
      }

      const payoutData =
        await fundDisbursementService.getPayoutRequest(payoutId);
      if (!payoutData) {
        setError("Payout request not found");
        return;
      }

      setPayout(payoutData);

      // Track payout confirmation view
      analytics.track({
        event: "payout_confirmation_viewed",
        properties: {
          payoutId: payoutData.id,
          organizationId: payoutData.organizationId,
          amount: payoutData.amount,
          purpose: payoutData.purpose,
        },
        timestamp: new Date(),
      });
    } catch (err: any) {
      console.error("Failed to load payout:", err);
      setError(err.message || "Failed to load payout request");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayout = async () => {
    try {
      if (!otpCode.trim()) {
        Alert.alert("Required", "Please enter the OTP code");
        return;
      }

      if (!payout) {
        Alert.alert("Error", "Payout request not found");
        return;
      }

      const user = appState.getUser();
      if (!user) {
        Alert.alert("Error", "User not found");
        return;
      }

      setConfirming(true);

      const result = await fundDisbursementService.confirmPayoutRequest(
        payout.id,
        otpCode,
        user.id,
        user.phone, // Using phone as name for now
      );

      if (result.success) {
        Alert.alert("Success", "Payout confirmed successfully!", [
          {
            text: "OK",
            onPress: () => router.replace("/dashboard"),
          },
        ]);
      } else {
        Alert.alert("Error", result.error || "Failed to confirm payout");
      }
    } catch (error: any) {
      console.error("Error confirming payout:", error);
      Alert.alert("Error", "Failed to confirm payout");
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout title="Confirm Payout">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading payout request...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  if (error) {
    return (
      <AuthenticatedLayout title="Confirm Payout">
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPayout}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </AuthenticatedLayout>
    );
  }

  if (!payout) {
    return (
      <AuthenticatedLayout title="Confirm Payout">
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Payout request not found</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout title="Confirm Payout">
      <ScrollView style={styles.container}>
        {/* Payout Details */}
        <View style={styles.payoutCard}>
          <Text style={styles.payoutTitle}>Payout Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>From:</Text>
            <Text style={styles.detailValue}>{payout.supervisorName}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>To:</Text>
            <Text style={styles.detailValue}>{payout.labourName}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount:</Text>
            <Text style={styles.amountValue}>
              {fundDisbursementService.formatAmount(payout.amount)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Purpose:</Text>
            <Text style={styles.detailValue}>
              {fundDisbursementService.getPurposeLabel(payout.purpose)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reference:</Text>
            <Text style={styles.detailValue}>{payout.referenceNote}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created:</Text>
            <Text style={styles.detailValue}>
              {new Date(payout.createdAt).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Status Display */}
        <View style={styles.statusCard}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: fundDisbursementService.getStatusColor(
                  payout.status,
                ),
              },
            ]}
          >
            <Text style={styles.statusText}>
              {fundDisbursementService.getStatusLabel(payout.status)}
            </Text>
          </View>
        </View>

        {/* OTP Section */}
        {payout.status === "pending" && !timeRemaining.expired && (
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
              onPress={handleConfirmPayout}
              disabled={confirming || !otpCode.trim()}
            >
              {confirming ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Payout</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Expired Section */}
        {payout.status === "pending" && timeRemaining.expired && (
          <View style={styles.expiredCard}>
            <Text style={styles.expiredTitle}>OTP Expired</Text>
            <Text style={styles.expiredSubtitle}>
              The OTP has expired. Please contact the supervisor to resend the
              payout request.
            </Text>
          </View>
        )}

        {/* Confirmed Section */}
        {payout.status === "confirmed" && (
          <View style={styles.confirmedCard}>
            <Text style={styles.confirmedTitle}>Payout Confirmed</Text>
            <Text style={styles.confirmedSubtitle}>
              Confirmed by: {payout.confirmedBy}
            </Text>
            <Text style={styles.confirmedSubtitle}>
              Confirmed at: {new Date(payout.confirmedAt!).toLocaleString()}
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
  payoutCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  payoutTitle: {
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
  confirmedCard: {
    backgroundColor: "#1b2d1b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  confirmedTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
    textAlign: "center",
    marginBottom: 8,
  },
  confirmedSubtitle: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
    marginBottom: 4,
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
