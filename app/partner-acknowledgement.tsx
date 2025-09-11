import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { partnershipService } from "../src/services/PartnershipService";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

export default function PartnerAcknowledgementScreen() {
  const { token } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [acknowledgement, setAcknowledgement] = useState<any>(null);
  const [partnership, setPartnership] = useState<any>(null);
  const [acknowledged, setAcknowledged] = useState<boolean | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    loadAcknowledgement();
  }, [token]);

  const loadAcknowledgement = async () => {
    try {
      setLoading(true);

      if (!token) {
        Alert.alert("Invalid Link", "This acknowledgement link is invalid");
        router.replace("/login");
        return;
      }

      // Get acknowledgement details
      const ack = await partnershipService.getAcknowledgementByToken(
        token as string,
      );
      if (!ack) {
        Alert.alert(
          "Invalid Link",
          "This acknowledgement link is invalid or expired",
        );
        router.replace("/login");
        return;
      }

      // Get partnership details
      const part = await partnershipService.getPartnershipRegistration(
        ack.partnershipId,
      );
      if (!part) {
        Alert.alert("Error", "Partnership not found");
        router.replace("/login");
        return;
      }

      setAcknowledgement(ack);
      setPartnership(part);

      // Track acknowledgement opened
      analytics.track({
        event: "partner_ack_opened",
        properties: {
          partnershipId: ack.partnershipId,
          partnerId: ack.partnerId,
          partnerName: ack.partnerName,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error loading acknowledgement:", error);
      Alert.alert("Error", "Failed to load acknowledgement details");
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgement = async (accepted: boolean) => {
    if (!acknowledgement) return;

    if (!accepted && !reason.trim()) {
      Alert.alert("Reason Required", "Please provide a reason for declining");
      return;
    }

    try {
      setSubmitting(true);

      const result = await partnershipService.acknowledgePartnership(
        token as string,
        acknowledgement.partnerId,
        accepted,
        accepted ? undefined : reason,
      );

      if (result.success) {
        setAcknowledged(accepted);

        Alert.alert(
          accepted ? "Acknowledgement Accepted" : "Acknowledgement Declined",
          accepted
            ? "You have successfully acknowledged the partnership."
            : "Your decline has been recorded.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/login"),
            },
          ],
        );
      } else {
        Alert.alert(
          "Error",
          result.error || "Failed to submit acknowledgement",
        );
      }
    } catch (error) {
      console.error("Error submitting acknowledgement:", error);
      Alert.alert("Error", "Failed to submit acknowledgement");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout title="Partner Acknowledgement">
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading acknowledgement...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  if (!acknowledgement || !partnership) {
    return (
      <AuthenticatedLayout title="Partner Acknowledgement">
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Invalid acknowledgement link</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  if (acknowledged !== null) {
    return (
      <AuthenticatedLayout title="Partner Acknowledgement">
        <View style={styles.centerContainer}>
          <Text style={styles.successText}>
            {acknowledged
              ? "Acknowledgement Accepted"
              : "Acknowledgement Declined"}
          </Text>
          <Text style={styles.successSubtext}>
            {acknowledged
              ? "You have successfully acknowledged the partnership."
              : "Your decline has been recorded."}
          </Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout title="Partner Acknowledgement">
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Partnership Acknowledgement</Text>
          <Text style={styles.subtitle}>
            You have been invited to acknowledge a partnership
          </Text>
        </View>

        {/* Partnership Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partnership Details</Text>

          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Trade Name</Text>
              <Text style={styles.detailValue}>{partnership.tradeName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>GSTIN</Text>
              <Text style={styles.detailValue}>{partnership.gstin}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Principal Place</Text>
              <Text style={styles.detailValue}>
                {partnership.principalPlace.city},{" "}
                {partnership.principalPlace.state}
              </Text>
            </View>

            {partnership.panOfFirm && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>PAN of Firm</Text>
                <Text style={styles.detailValue}>{partnership.panOfFirm}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Partner Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Details</Text>

          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Your Name</Text>
              <Text style={styles.detailValue}>
                {acknowledgement.partnerName}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Operating Partner</Text>
              <Text style={styles.detailValue}>
                {acknowledgement.operatingPartnerName}
              </Text>
            </View>
          </View>
        </View>

        {/* Acknowledgement Statement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acknowledgement Statement</Text>

          <View style={styles.statementCard}>
            <Text style={styles.statementText}>
              I acknowledge that{" "}
              <Text style={styles.highlight}>
                {acknowledgement.operatingPartnerName}
              </Text>{" "}
              will serve as the Operating Partner for this partnership and will
              have the authority to operate this app on behalf of the
              partnership.
            </Text>
          </View>
        </View>

        {/* Decline Reason */}
        {acknowledged === false && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reason for Declining</Text>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              placeholder="Please provide a reason for declining..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.declineButton, submitting && styles.buttonDisabled]}
            onPress={() => setAcknowledged(false)}
            disabled={submitting}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptButton, submitting && styles.buttonDisabled]}
            onPress={() => handleAcknowledgement(true)}
            disabled={submitting}
          >
            <Text style={styles.acceptButtonText}>
              {submitting ? "Processing..." : "Accept & Acknowledge"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Submit Decline Button */}
        {acknowledged === false && (
          <View style={styles.submitContainer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!reason.trim() || submitting) && styles.buttonDisabled,
              ]}
              onPress={() => handleAcknowledgement(false)}
              disabled={!reason.trim() || submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? "Submitting..." : "Submit Decline"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
  },
  errorText: {
    color: "#ff4444",
    fontSize: 16,
    textAlign: "center",
  },
  successText: {
    color: "#4CAF50",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  successSubtext: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
  },
  header: {
    padding: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  detailCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  detailLabel: {
    fontSize: 14,
    color: "#999",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  statementCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  statementText: {
    fontSize: 16,
    color: "#fff",
    lineHeight: 24,
  },
  highlight: {
    color: "#007AFF",
    fontWeight: "bold",
  },
  reasonInput: {
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
    textAlignVertical: "top",
  },
  actionContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  declineButton: {
    flex: 1,
    backgroundColor: "#ff4444",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  declineButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  acceptButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  submitContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  submitButton: {
    backgroundColor: "#ff4444",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    backgroundColor: "#666",
  },
});
