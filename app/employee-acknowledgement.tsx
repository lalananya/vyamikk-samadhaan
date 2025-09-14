import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { employeeService } from "../src/services/EmployeeService";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

const CATEGORY_LABELS = {
  labour: "Labour",
  supervisor: "Supervisor",
  accountant: "Accountant",
};

const OT_POLICY_LABELS = {
  none: "None",
  "1.5x": "1.5x",
  "2x": "2x",
};

export default function EmployeeAcknowledgementScreen() {
  const { token } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [acknowledged, setAcknowledged] = useState<boolean | null>(null);

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

      // Get invite details
      const inviteData = await employeeService.getInviteByToken(
        token as string,
      );
      if (!inviteData) {
        Alert.alert(
          "Invalid Link",
          "This acknowledgement link is invalid or expired",
        );
        router.replace("/login");
        return;
      }

      // Get employee details
      const empData = await employeeService.getEmployee(inviteData.employeeId);
      if (!empData) {
        Alert.alert("Error", "Employee not found");
        router.replace("/login");
        return;
      }

      setInvite(inviteData);
      setEmployee(empData);

      // Track acknowledgement opened
      analytics.track({
        event: "employee_ack_opened",
        properties: {
          employeeId: empData.id,
          organizationId: empData.organizationId,
          employeeName: empData.name,
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
    if (!invite || !employee) return;

    try {
      setSubmitting(true);

      const result = await employeeService.acknowledgeEmployee(
        token as string,
        employee.id,
        accepted,
      );

      if (result.success) {
        setAcknowledged(accepted);

        Alert.alert(
          accepted ? "Acknowledgement Accepted" : "Acknowledgement Declined",
          accepted
            ? "You have successfully acknowledged your employment terms."
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
      <AuthenticatedLayout title="Employee Acknowledgement">
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading acknowledgement...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  if (!invite || !employee) {
    return (
      <AuthenticatedLayout title="Employee Acknowledgement">
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Invalid acknowledgement link</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  if (acknowledged !== null) {
    return (
      <AuthenticatedLayout title="Employee Acknowledgement">
        <View style={styles.centerContainer}>
          <Text style={styles.successText}>
            {acknowledged
              ? "Acknowledgement Accepted"
              : "Acknowledgement Declined"}
          </Text>
          <Text style={styles.successSubtext}>
            {acknowledged
              ? "You have successfully acknowledged your employment terms."
              : "Your decline has been recorded."}
          </Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout title="Employee Acknowledgement">
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Employment Acknowledgement</Text>
          <Text style={styles.subtitle}>
            Please review and acknowledge your employment terms
          </Text>
        </View>

        {/* Employee Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Details</Text>

          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailValue}>{employee.name}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Employee Code</Text>
              <Text style={styles.detailValue}>{employee.code}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>
                {CATEGORY_LABELS[employee.category]}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date of Joining</Text>
              <Text style={styles.detailValue}>
                {new Date(employee.doj).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Employment Terms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employment Terms</Text>

          <View style={styles.termsCard}>
            <View style={styles.termItem}>
              <Text style={styles.termLabel}>Wage Base</Text>
              <Text style={styles.termValue}>₹{employee.wageBase}/hour</Text>
            </View>

            <View style={styles.termItem}>
              <Text style={styles.termLabel}>Overtime Policy</Text>
              <Text style={styles.termValue}>
                {OT_POLICY_LABELS[employee.otPolicy]}
                {employee.otPolicy !== "none" && " after regular hours"}
              </Text>
            </View>

            {employee.incentives && (
              <View style={styles.termItem}>
                <Text style={styles.termLabel}>Incentives</Text>
                <Text style={styles.termValue}>{employee.incentives}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Acknowledgement Statement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acknowledgement Statement</Text>

          <View style={styles.statementCard}>
            <Text style={styles.statementText}>
              I acknowledge that I have received and understood the employment
              terms outlined above, including my wage rate of ₹
              {employee.wageBase}/hour, overtime policy of{" "}
              {OT_POLICY_LABELS[employee.otPolicy]}, and any applicable
              incentives. I agree to these terms and conditions of employment.
            </Text>
          </View>
        </View>

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
  termsCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
  },
  termItem: {
    marginBottom: 16,
  },
  termLabel: {
    fontSize: 14,
    color: "#999",
    marginBottom: 4,
  },
  termValue: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
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
  buttonDisabled: {
    backgroundColor: "#666",
  },
});
