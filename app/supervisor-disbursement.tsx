import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import {
  fundDisbursementService,
  PayoutRequest,
  BillSubmission,
  DisbursementStats,
} from "../src/services/FundDisbursementService";
import { appState } from "../src/state/AppState";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

const PAYOUT_PURPOSES = [
  { value: "salary_advance", label: "Salary Advance", color: "#2196F3" },
  { value: "full_salary", label: "Full Salary", color: "#4CAF50" },
  { value: "bonus", label: "Bonus", color: "#FF9800" },
  { value: "other", label: "Other", color: "#9C27B0" },
];

const BILL_PURPOSES = [
  { value: "electricity", label: "Electricity Bill" },
  { value: "water", label: "Water Bill" },
  { value: "rent", label: "Rent" },
  { value: "maintenance", label: "Maintenance" },
  { value: "consumables", label: "Consumables" },
  { value: "other", label: "Other" },
];

export default function SupervisorDisbursementScreen() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [bills, setBills] = useState<BillSubmission[]>([]);
  const [stats, setStats] = useState<DisbursementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"payouts" | "bills" | "returns">(
    "payouts",
  );

  const [newPayout, setNewPayout] = useState({
    labourId: "",
    labourName: "",
    labourPhone: "",
    amount: "",
    purpose: "salary_advance" as
      | "salary_advance"
      | "full_salary"
      | "bonus"
      | "other",
    referenceNote: "",
  });

  const [newBill, setNewBill] = useState({
    amount: "",
    purpose: "electricity",
    description: "",
  });

  const [newReturn, setNewReturn] = useState({
    amount: "",
    reason: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentOrgId = appState.getCurrentOrganizationId();
      const user = appState.getUser();
      if (!currentOrgId || !user) {
        setError("No organization or user found");
        return;
      }

      // Load payouts, bills, and stats
      const orgPayouts = await fundDisbursementService.getPayoutRequests(
        currentOrgId,
        user.id,
      );
      setPayouts(orgPayouts);

      const orgBills = await fundDisbursementService.getBillSubmissions(
        currentOrgId,
        user.id,
      );
      setBills(orgBills);

      const disbursementStats =
        await fundDisbursementService.getDisbursementStats(
          currentOrgId,
          user.id,
        );
      setStats(disbursementStats);

      // Track supervisor disbursement view
      analytics.track({
        event: "supervisor_disbursement_viewed",
        properties: {
          organizationId: currentOrgId,
          supervisorId: user.id,
          payoutCount: orgPayouts.length,
          billCount: orgBills.length,
        },
        timestamp: new Date(),
      });
    } catch (err: any) {
      console.error("Failed to load disbursement data:", err);
      setError(err.message || "Failed to load disbursement data");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreatePayout = async () => {
    try {
      if (
        !newPayout.labourName ||
        !newPayout.amount ||
        !newPayout.referenceNote
      ) {
        Alert.alert(
          "Required Fields",
          "Please fill in labour name, amount, and reference note",
        );
        return;
      }

      const amount = parseFloat(newPayout.amount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert("Invalid Amount", "Please enter a valid amount");
        return;
      }

      const currentOrgId = appState.getCurrentOrganizationId();
      const user = appState.getUser();
      if (!currentOrgId || !user) {
        Alert.alert("Error", "No organization or user found");
        return;
      }

      const result = await fundDisbursementService.createPayoutRequest({
        organizationId: currentOrgId,
        supervisorId: user.id,
        supervisorName: user.phone, // Using phone as name for now
        labourId: newPayout.labourId || newPayout.labourName,
        labourName: newPayout.labourName,
        labourPhone: newPayout.labourPhone || undefined,
        amount,
        purpose: newPayout.purpose,
        referenceNote: newPayout.referenceNote,
      });

      if (result.success && result.payout) {
        setPayouts((prev) => [result.payout!, ...prev]);
        setShowPayoutModal(false);
        setNewPayout({
          labourId: "",
          labourName: "",
          labourPhone: "",
          amount: "",
          purpose: "salary_advance",
          referenceNote: "",
        });

        Alert.alert(
          "Success",
          "Payout request created. Labour will receive OTP for confirmation.",
        );
      } else {
        Alert.alert("Error", result.error || "Failed to create payout request");
      }
    } catch (error: any) {
      console.error("Error creating payout:", error);
      Alert.alert("Error", error.message || "Failed to create payout request");
    }
  };

  const handleSubmitBill = async () => {
    try {
      if (!newBill.amount || !newBill.description) {
        Alert.alert("Required Fields", "Please fill in amount and description");
        return;
      }

      const amount = parseFloat(newBill.amount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert("Invalid Amount", "Please enter a valid amount");
        return;
      }

      const currentOrgId = appState.getCurrentOrganizationId();
      const user = appState.getUser();
      if (!currentOrgId || !user) {
        Alert.alert("Error", "No organization or user found");
        return;
      }

      const bill = await fundDisbursementService.submitBill({
        organizationId: currentOrgId,
        supervisorId: user.id,
        supervisorName: user.phone, // Using phone as name for now
        amount,
        purpose: newBill.purpose,
        description: newBill.description,
      });

      setBills((prev) => [bill, ...prev]);
      setShowBillModal(false);
      setNewBill({
        amount: "",
        purpose: "electricity",
        description: "",
      });

      Alert.alert("Success", "Bill submitted for partner approval");
    } catch (error: any) {
      console.error("Error submitting bill:", error);
      Alert.alert("Error", error.message || "Failed to submit bill");
    }
  };

  const handleReturnFloat = async () => {
    try {
      if (!newReturn.amount || !newReturn.reason) {
        Alert.alert("Required Fields", "Please fill in amount and reason");
        return;
      }

      const amount = parseFloat(newReturn.amount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert("Invalid Amount", "Please enter a valid amount");
        return;
      }

      const currentOrgId = appState.getCurrentOrganizationId();
      const user = appState.getUser();
      if (!currentOrgId || !user) {
        Alert.alert("Error", "No organization or user found");
        return;
      }

      const floatReturn = await fundDisbursementService.returnFloat({
        organizationId: currentOrgId,
        supervisorId: user.id,
        supervisorName: user.phone, // Using phone as name for now
        partnerId: "partner_1", // This should be dynamic
        partnerName: "Partner", // This should be dynamic
        amount,
        reason: newReturn.reason,
      });

      setShowReturnModal(false);
      setNewReturn({
        amount: "",
        reason: "",
      });

      Alert.alert(
        "Success",
        "Float return initiated. Partner will receive OTP for confirmation.",
      );
    } catch (error: any) {
      console.error("Error returning float:", error);
      Alert.alert("Error", error.message || "Failed to return float");
    }
  };

  const renderPayout = ({ item }: { item: PayoutRequest }) => {
    const timeRemaining = fundDisbursementService.getOTPTimeRemaining(
      item.otpExpiresAt,
    );
    const isExpired = fundDisbursementService.isOTPExpired(item.otpExpiresAt);

    return (
      <View style={styles.payoutCard}>
        <View style={styles.payoutHeader}>
          <Text style={styles.labourName}>{item.labourName}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: fundDisbursementService.getStatusColor(
                  item.status,
                ),
              },
            ]}
          >
            <Text style={styles.statusText}>
              {fundDisbursementService.getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.payoutDetails}>
          <Text style={styles.amount}>
            {fundDisbursementService.formatAmount(item.amount)}
          </Text>
          <Text style={styles.purpose}>
            {fundDisbursementService.getPurposeLabel(item.purpose)}
          </Text>
          <Text style={styles.referenceNote}>{item.referenceNote}</Text>
          <Text style={styles.createdAt}>
            Created: {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>

        {item.status === "pending" && !isExpired && (
          <View style={styles.otpSection}>
            <Text style={styles.otpLabel}>
              OTP: {fundDisbursementService.getOTPDisplay(item.otpCode)}
            </Text>
            <Text style={styles.otpTimer}>
              Expires in: {timeRemaining.minutes}:
              {timeRemaining.seconds.toString().padStart(2, "0")}
            </Text>
          </View>
        )}

        {item.status === "confirmed" && (
          <View style={styles.confirmedSection}>
            <Text style={styles.confirmedText}>
              Confirmed by: {item.confirmedBy} at{" "}
              {new Date(item.confirmedAt!).toLocaleString()}
            </Text>
          </View>
        )}

        {item.status === "expired" && (
          <View style={styles.expiredSection}>
            <Text style={styles.expiredText}>OTP Expired</Text>
          </View>
        )}
      </View>
    );
  };

  const renderBill = ({ item }: { item: BillSubmission }) => (
    <View style={styles.billCard}>
      <View style={styles.billHeader}>
        <Text style={styles.billAmount}>
          {fundDisbursementService.formatAmount(item.amount)}
        </Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: fundDisbursementService.getStatusColor(
                item.status,
              ),
            },
          ]}
        >
          <Text style={styles.statusText}>
            {fundDisbursementService.getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.billDetails}>
        <Text style={styles.purpose}>{item.purpose}</Text>
        <Text style={styles.description}>{item.description}</Text>
        <Text style={styles.submittedAt}>
          Submitted: {new Date(item.submittedAt).toLocaleString()}
        </Text>
      </View>

      {item.status === "approved" && (
        <View style={styles.approvedSection}>
          <Text style={styles.approvedText}>
            Approved by: {item.approvedBy} at{" "}
            {new Date(item.approvedAt!).toLocaleString()}
          </Text>
        </View>
      )}

      {item.status === "paid" && (
        <View style={styles.paidSection}>
          <Text style={styles.paidText}>
            Paid by: {item.paidBy} at {new Date(item.paidAt!).toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <AuthenticatedLayout title="Supervisor Disbursement">
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading disbursement data...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout title="Supervisor Disbursement">
      {/* Stats Header */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalAllocated}</Text>
            <Text style={styles.statLabel}>Allocated</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#ff9800" }]}>
              {stats.totalUsed}
            </Text>
            <Text style={styles.statLabel}>Used</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#4CAF50" }]}>
              {stats.totalRemaining}
            </Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#9C27B0" }]}>
              {stats.totalReturned}
            </Text>
            <Text style={styles.statLabel}>Returned</Text>
          </View>
        </View>
      )}

      {/* Quick Stats */}
      {stats && (
        <View style={styles.quickStatsContainer}>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatNumber}>{stats.pendingPayouts}</Text>
            <Text style={styles.quickStatLabel}>Pending Payouts</Text>
          </View>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatNumber}>{stats.pendingBills}</Text>
            <Text style={styles.quickStatLabel}>Pending Bills</Text>
          </View>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatNumber}>{stats.pendingReturns}</Text>
            <Text style={styles.quickStatLabel}>Pending Returns</Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowPayoutModal(true)}
        >
          <Text style={styles.actionButtonText}>+ Payout</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowBillModal(true)}
        >
          <Text style={styles.actionButtonText}>+ Bill</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowReturnModal(true)}
        >
          <Text style={styles.actionButtonText}>Return Float</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "payouts" && styles.activeTab]}
          onPress={() => setActiveTab("payouts")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "payouts" && styles.activeTabText,
            ]}
          >
            Payouts ({payouts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "bills" && styles.activeTab]}
          onPress={() => setActiveTab("bills")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "bills" && styles.activeTabText,
            ]}
          >
            Bills ({bills.length})
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <FlatList
        data={activeTab === "payouts" ? payouts : bills}
        renderItem={activeTab === "payouts" ? renderPayout : renderBill}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No {activeTab} yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first {activeTab === "payouts" ? "payout" : "bill"} to
              get started
            </Text>
          </View>
        }
      />

      {/* Payout Modal */}
      <Modal
        visible={showPayoutModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Payout</Text>
            <TouchableOpacity onPress={() => setShowPayoutModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Labour Name *</Text>
              <TextInput
                style={styles.input}
                value={newPayout.labourName}
                onChangeText={(text) =>
                  setNewPayout((prev) => ({ ...prev, labourName: text }))
                }
                placeholder="Enter labour name"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Labour ID (Optional)</Text>
              <TextInput
                style={styles.input}
                value={newPayout.labourId}
                onChangeText={(text) =>
                  setNewPayout((prev) => ({ ...prev, labourId: text }))
                }
                placeholder="Enter labour ID"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Labour Phone (Optional)</Text>
              <TextInput
                style={styles.input}
                value={newPayout.labourPhone}
                onChangeText={(text) =>
                  setNewPayout((prev) => ({ ...prev, labourPhone: text }))
                }
                placeholder="Enter labour phone"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                value={newPayout.amount}
                onChangeText={(text) =>
                  setNewPayout((prev) => ({ ...prev, amount: text }))
                }
                placeholder="Enter amount"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Purpose *</Text>
              <View style={styles.purposeContainer}>
                {PAYOUT_PURPOSES.map((purpose) => (
                  <TouchableOpacity
                    key={purpose.value}
                    style={[
                      styles.purposeOption,
                      { borderColor: purpose.color },
                      newPayout.purpose === purpose.value && {
                        backgroundColor: purpose.color + "20",
                      },
                    ]}
                    onPress={() =>
                      setNewPayout((prev) => ({
                        ...prev,
                        purpose: purpose.value as any,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.purposeText,
                        { color: purpose.color },
                        newPayout.purpose === purpose.value &&
                          styles.purposeTextSelected,
                      ]}
                    >
                      {purpose.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reference Note *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newPayout.referenceNote}
                onChangeText={(text) =>
                  setNewPayout((prev) => ({ ...prev, referenceNote: text }))
                }
                placeholder="Enter reference note"
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowPayoutModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleCreatePayout}
            >
              <Text style={styles.saveButtonText}>Create Payout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bill Modal */}
      <Modal
        visible={showBillModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Submit Bill</Text>
            <TouchableOpacity onPress={() => setShowBillModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                value={newBill.amount}
                onChangeText={(text) =>
                  setNewBill((prev) => ({ ...prev, amount: text }))
                }
                placeholder="Enter amount"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Purpose *</Text>
              <View style={styles.purposeContainer}>
                {BILL_PURPOSES.map((purpose) => (
                  <TouchableOpacity
                    key={purpose.value}
                    style={[
                      styles.purposeOption,
                      newBill.purpose === purpose.value &&
                        styles.purposeOptionSelected,
                    ]}
                    onPress={() =>
                      setNewBill((prev) => ({
                        ...prev,
                        purpose: purpose.value,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.purposeText,
                        newBill.purpose === purpose.value &&
                          styles.purposeTextSelected,
                      ]}
                    >
                      {purpose.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newBill.description}
                onChangeText={(text) =>
                  setNewBill((prev) => ({ ...prev, description: text }))
                }
                placeholder="Enter bill description"
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowBillModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSubmitBill}
            >
              <Text style={styles.saveButtonText}>Submit Bill</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Return Float Modal */}
      <Modal
        visible={showReturnModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Return Float</Text>
            <TouchableOpacity onPress={() => setShowReturnModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                value={newReturn.amount}
                onChangeText={(text) =>
                  setNewReturn((prev) => ({ ...prev, amount: text }))
                }
                placeholder="Enter amount to return"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reason *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newReturn.reason}
                onChangeText={(text) =>
                  setNewReturn((prev) => ({ ...prev, reason: text }))
                }
                placeholder="Enter reason for return"
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowReturnModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleReturnFloat}
            >
              <Text style={styles.saveButtonText}>Return Float</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#111",
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  quickStatsContainer: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  quickStatItem: {
    flex: 1,
    alignItems: "center",
  },
  quickStatNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  quickStatLabel: {
    fontSize: 10,
    color: "#999",
    marginTop: 2,
    textAlign: "center",
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#111",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#007AFF",
  },
  tabText: {
    color: "#999",
    fontSize: 14,
    fontWeight: "500",
  },
  activeTabText: {
    color: "#fff",
  },
  errorCard: {
    backgroundColor: "#ff4444",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  errorText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  retryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
  },
  payoutCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  payoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  labourName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  payoutDetails: {
    marginBottom: 12,
  },
  amount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 4,
  },
  purpose: {
    fontSize: 14,
    color: "#007AFF",
    marginBottom: 4,
  },
  referenceNote: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 8,
    lineHeight: 20,
  },
  createdAt: {
    fontSize: 12,
    color: "#999",
  },
  otpSection: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  otpLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  otpTimer: {
    fontSize: 14,
    color: "#ff9800",
  },
  confirmedSection: {
    backgroundColor: "#1b2d1b",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  confirmedText: {
    fontSize: 14,
    color: "#4CAF50",
  },
  expiredSection: {
    backgroundColor: "#2d1b1b",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  expiredText: {
    fontSize: 14,
    color: "#f44336",
    textAlign: "center",
  },
  billCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  billHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  billAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  billDetails: {
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 8,
    lineHeight: 20,
  },
  submittedAt: {
    fontSize: 12,
    color: "#999",
  },
  approvedSection: {
    backgroundColor: "#1b2d1b",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  approvedText: {
    fontSize: 14,
    color: "#4CAF50",
  },
  paidSection: {
    backgroundColor: "#1b2d2d",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  paidText: {
    fontSize: 14,
    color: "#2196F3",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    color: "#fff",
    fontSize: 18,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  purposeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  purposeOption: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    minWidth: 80,
  },
  purposeOptionSelected: {
    backgroundColor: "#007AFF",
  },
  purposeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },
  purposeTextSelected: {
    color: "#fff",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
