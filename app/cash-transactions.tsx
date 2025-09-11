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
  cashTransactionService,
  CashTransaction,
  CashTransactionStats,
} from "../src/services/CashTransactionService";
import { appState } from "../src/state/AppState";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

const PURPOSE_OPTIONS = [
  { value: "advance", label: "Advance", color: "#2196F3" },
  { value: "salary", label: "Salary", color: "#4CAF50" },
  { value: "expense", label: "Expense", color: "#FF9800" },
  { value: "other", label: "Other", color: "#9C27B0" },
];

export default function CashTransactionsScreen() {
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [stats, setStats] = useState<CashTransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newTransaction, setNewTransaction] = useState({
    recipientId: "",
    recipientName: "",
    recipientPhone: "",
    amount: "",
    purpose: "advance" as "advance" | "salary" | "expense" | "other",
    referenceNote: "",
  });

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentOrgId = appState.getCurrentOrganizationId();
      if (!currentOrgId) {
        setError("No organization selected");
        return;
      }

      // Load all transactions
      const orgTransactions =
        await cashTransactionService.getTransactions(currentOrgId);
      setTransactions(orgTransactions);

      // Load stats
      const transactionStats =
        await cashTransactionService.getTransactionStats(currentOrgId);
      setStats(transactionStats);

      // Track transactions view
      analytics.track({
        event: "cash_transactions_viewed",
        properties: {
          organizationId: currentOrgId,
          transactionCount: orgTransactions.length,
        },
        timestamp: new Date(),
      });
    } catch (err: any) {
      console.error("Failed to load transactions:", err);
      setError(err.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const handleCreateTransaction = async () => {
    try {
      if (
        !newTransaction.recipientName ||
        !newTransaction.amount ||
        !newTransaction.referenceNote
      ) {
        Alert.alert(
          "Required Fields",
          "Please fill in recipient name, amount, and reference note",
        );
        return;
      }

      const amount = parseFloat(newTransaction.amount);
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

      const transaction = await cashTransactionService.initiateTransaction({
        organizationId: currentOrgId,
        initiatorId: user.id,
        initiatorName: user.phone, // Using phone as name for now
        recipientId: newTransaction.recipientId || newTransaction.recipientName,
        recipientName: newTransaction.recipientName,
        recipientPhone: newTransaction.recipientPhone || undefined,
        amount,
        purpose: newTransaction.purpose,
        referenceNote: newTransaction.referenceNote,
      });

      setTransactions((prev) => [transaction, ...prev]);
      setShowCreateModal(false);
      setNewTransaction({
        recipientId: "",
        recipientName: "",
        recipientPhone: "",
        amount: "",
        purpose: "advance",
        referenceNote: "",
      });

      Alert.alert(
        "Success",
        "Cash transaction initiated. Recipient will receive OTP for confirmation.",
      );
    } catch (error: any) {
      console.error("Error creating transaction:", error);
      Alert.alert("Error", error.message || "Failed to create transaction");
    }
  };

  const handleDuplicateTransaction = async (transactionId: string) => {
    try {
      const duplicatedTransaction =
        await cashTransactionService.duplicateTransaction(transactionId);
      if (duplicatedTransaction) {
        setTransactions((prev) => [duplicatedTransaction, ...prev]);
        Alert.alert("Success", "Transaction duplicated successfully");
      } else {
        Alert.alert("Error", "Failed to duplicate transaction");
      }
    } catch (error: any) {
      console.error("Error duplicating transaction:", error);
      Alert.alert("Error", "Failed to duplicate transaction");
    }
  };

  const renderTransaction = ({ item }: { item: CashTransaction }) => {
    const timeRemaining = cashTransactionService.getOTPTimeRemaining(
      item.otpExpiresAt,
    );
    const isExpired = cashTransactionService.isOTPExpired(item.otpExpiresAt);

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <Text style={styles.recipientName}>{item.recipientName}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: cashTransactionService.getStatusColor(
                  item.status,
                ),
              },
            ]}
          >
            <Text style={styles.statusText}>
              {cashTransactionService.getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.transactionDetails}>
          <Text style={styles.amount}>
            {cashTransactionService.formatAmount(item.amount)}
          </Text>
          <Text style={styles.purpose}>
            {cashTransactionService.getPurposeLabel(item.purpose)}
          </Text>
          <Text style={styles.referenceNote}>{item.referenceNote}</Text>
          <Text style={styles.createdAt}>
            Created: {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>

        {item.status === "pending" && !isExpired && (
          <View style={styles.otpSection}>
            <Text style={styles.otpLabel}>
              OTP: {cashTransactionService.getOTPDisplay(item.otpCode)}
            </Text>
            <Text style={styles.otpTimer}>
              Expires in: {timeRemaining.minutes}:
              {timeRemaining.seconds.toString().padStart(2, "0")}
            </Text>
          </View>
        )}

        {item.status === "expired" && (
          <View style={styles.expiredSection}>
            <Text style={styles.expiredText}>OTP Expired</Text>
            <TouchableOpacity
              style={styles.duplicateButton}
              onPress={() => handleDuplicateTransaction(item.id)}
            >
              <Text style={styles.duplicateButtonText}>Duplicate</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === "completed" && (
          <View style={styles.completedSection}>
            <Text style={styles.completedText}>
              Confirmed by: {item.confirmedBy} at{" "}
              {new Date(item.confirmedAt!).toLocaleString()}
            </Text>
          </View>
        )}

        {item.status === "overridden" && (
          <View style={styles.overriddenSection}>
            <Text style={styles.overriddenText}>
              Overridden by: {item.overriddenBy} - {item.overrideReason}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <AuthenticatedLayout title="Cash Transactions">
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout title="Cash Transactions">
      {/* Stats Header */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalTransactions}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#ff9800" }]}>
              {stats.pendingCount}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#4CAF50" }]}>
              {stats.completedCount}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#f44336" }]}>
              {stats.expiredCount}
            </Text>
            <Text style={styles.statLabel}>Expired</Text>
          </View>
        </View>
      )}

      {/* Create Transaction Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createButtonText}>+ New Transaction</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadTransactions}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first cash transaction to get started
            </Text>
          </View>
        }
      />

      {/* Create Transaction Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Cash Transaction</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Recipient Name *</Text>
              <TextInput
                style={styles.input}
                value={newTransaction.recipientName}
                onChangeText={(text) =>
                  setNewTransaction((prev) => ({
                    ...prev,
                    recipientName: text,
                  }))
                }
                placeholder="Enter recipient name"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Recipient ID (Optional)</Text>
              <TextInput
                style={styles.input}
                value={newTransaction.recipientId}
                onChangeText={(text) =>
                  setNewTransaction((prev) => ({ ...prev, recipientId: text }))
                }
                placeholder="Enter recipient ID"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Recipient Phone (Optional)</Text>
              <TextInput
                style={styles.input}
                value={newTransaction.recipientPhone}
                onChangeText={(text) =>
                  setNewTransaction((prev) => ({
                    ...prev,
                    recipientPhone: text,
                  }))
                }
                placeholder="Enter recipient phone"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                value={newTransaction.amount}
                onChangeText={(text) =>
                  setNewTransaction((prev) => ({ ...prev, amount: text }))
                }
                placeholder="Enter amount"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Purpose *</Text>
              <View style={styles.purposeContainer}>
                {PURPOSE_OPTIONS.map((purpose) => (
                  <TouchableOpacity
                    key={purpose.value}
                    style={[
                      styles.purposeOption,
                      { borderColor: purpose.color },
                      newTransaction.purpose === purpose.value && {
                        backgroundColor: purpose.color + "20",
                      },
                    ]}
                    onPress={() =>
                      setNewTransaction((prev) => ({
                        ...prev,
                        purpose: purpose.value as any,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.purposeText,
                        { color: purpose.color },
                        newTransaction.purpose === purpose.value &&
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
                value={newTransaction.referenceNote}
                onChangeText={(text) =>
                  setNewTransaction((prev) => ({
                    ...prev,
                    referenceNote: text,
                  }))
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
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleCreateTransaction}
            >
              <Text style={styles.saveButtonText}>Create Transaction</Text>
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
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  createButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
  transactionCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  recipientName: {
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
  transactionDetails: {
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
  expiredSection: {
    backgroundColor: "#2d1b1b",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expiredText: {
    fontSize: 14,
    color: "#f44336",
    fontWeight: "500",
  },
  duplicateButton: {
    backgroundColor: "#f44336",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  duplicateButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  completedSection: {
    backgroundColor: "#1b2d1b",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  completedText: {
    fontSize: 14,
    color: "#4CAF50",
  },
  overriddenSection: {
    backgroundColor: "#2d1b2d",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  overriddenText: {
    fontSize: 14,
    color: "#9C27B0",
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
  purposeText: {
    fontSize: 14,
    fontWeight: "500",
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
