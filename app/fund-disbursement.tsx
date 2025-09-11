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
  FloatAllocation,
  DisbursementStats,
} from "../src/services/FundDisbursementService";
import { appState } from "../src/state/AppState";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

const BILL_PURPOSES = [
  { value: "electricity", label: "Electricity Bill" },
  { value: "water", label: "Water Bill" },
  { value: "rent", label: "Rent" },
  { value: "maintenance", label: "Maintenance" },
  { value: "consumables", label: "Consumables" },
  { value: "other", label: "Other" },
];

export default function FundDisbursementScreen() {
  const [allocations, setAllocations] = useState<FloatAllocation[]>([]);
  const [stats, setStats] = useState<DisbursementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newAllocation, setNewAllocation] = useState({
    supervisorId: "",
    supervisorName: "",
    amount: "",
    purpose: "Salary payout",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentOrgId = appState.getCurrentOrganizationId();
      if (!currentOrgId) {
        setError("No organization selected");
        return;
      }

      // Load allocations and stats
      const orgAllocations =
        await fundDisbursementService.getFloatAllocations(currentOrgId);
      setAllocations(orgAllocations);

      const disbursementStats =
        await fundDisbursementService.getDisbursementStats(currentOrgId);
      setStats(disbursementStats);

      // Track disbursement view
      analytics.track({
        event: "fund_disbursement_viewed",
        properties: {
          organizationId: currentOrgId,
          allocationCount: orgAllocations.length,
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

  const handleAllocateFloat = async () => {
    try {
      if (!newAllocation.supervisorName || !newAllocation.amount) {
        Alert.alert(
          "Required Fields",
          "Please fill in supervisor name and amount",
        );
        return;
      }

      const amount = parseFloat(newAllocation.amount);
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

      const allocation = await fundDisbursementService.allocateFloat({
        organizationId: currentOrgId,
        partnerId: user.id,
        partnerName: user.phone, // Using phone as name for now
        supervisorId:
          newAllocation.supervisorId || newAllocation.supervisorName,
        supervisorName: newAllocation.supervisorName,
        amount,
        purpose: newAllocation.purpose,
      });

      setAllocations((prev) => [allocation, ...prev]);
      setShowAllocateModal(false);
      setNewAllocation({
        supervisorId: "",
        supervisorName: "",
        amount: "",
        purpose: "Salary payout",
      });

      Alert.alert("Success", "Float allocated successfully");
    } catch (error: any) {
      console.error("Error allocating float:", error);
      Alert.alert("Error", error.message || "Failed to allocate float");
    }
  };

  const renderAllocation = ({ item }: { item: FloatAllocation }) => (
    <View style={styles.allocationCard}>
      <View style={styles.allocationHeader}>
        <Text style={styles.supervisorName}>{item.supervisorName}</Text>
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

      <View style={styles.allocationDetails}>
        <Text style={styles.purpose}>{item.purpose}</Text>
        <Text style={styles.allocatedAt}>
          Allocated: {new Date(item.allocatedAt).toLocaleString()}
        </Text>
      </View>

      <View style={styles.amountSection}>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Total Allocated:</Text>
          <Text style={styles.amountValue}>
            {fundDisbursementService.formatAmount(item.amount)}
          </Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Used:</Text>
          <Text style={styles.amountValue}>
            {fundDisbursementService.formatAmount(
              item.amount - item.remainingAmount,
            )}
          </Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Remaining:</Text>
          <Text
            style={[
              styles.amountValue,
              { color: item.remainingAmount > 0 ? "#4CAF50" : "#f44336" },
            ]}
          >
            {fundDisbursementService.formatAmount(item.remainingAmount)}
          </Text>
        </View>
      </View>

      {item.returnedAt && (
        <View style={styles.returnedSection}>
          <Text style={styles.returnedText}>
            Returned: {new Date(item.returnedAt).toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <AuthenticatedLayout title="Fund Disbursement">
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading disbursement data...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout title="Fund Disbursement">
      {/* Stats Header */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalAllocated}</Text>
            <Text style={styles.statLabel}>Total Allocated</Text>
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
            <Text style={styles.quickStatNumber}>
              {stats.activeAllocations}
            </Text>
            <Text style={styles.quickStatLabel}>Active Allocations</Text>
          </View>
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

      {/* Allocate Float Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.allocateButton}
          onPress={() => setShowAllocateModal(true)}
        >
          <Text style={styles.allocateButtonText}>+ Allocate Float</Text>
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

      <FlatList
        data={allocations}
        renderItem={renderAllocation}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No float allocations yet</Text>
            <Text style={styles.emptySubtext}>
              Allocate float to supervisors to get started
            </Text>
          </View>
        }
      />

      {/* Allocate Float Modal */}
      <Modal
        visible={showAllocateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Allocate Float</Text>
            <TouchableOpacity onPress={() => setShowAllocateModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Supervisor Name *</Text>
              <TextInput
                style={styles.input}
                value={newAllocation.supervisorName}
                onChangeText={(text) =>
                  setNewAllocation((prev) => ({
                    ...prev,
                    supervisorName: text,
                  }))
                }
                placeholder="Enter supervisor name"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Supervisor ID (Optional)</Text>
              <TextInput
                style={styles.input}
                value={newAllocation.supervisorId}
                onChangeText={(text) =>
                  setNewAllocation((prev) => ({ ...prev, supervisorId: text }))
                }
                placeholder="Enter supervisor ID"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                value={newAllocation.amount}
                onChangeText={(text) =>
                  setNewAllocation((prev) => ({ ...prev, amount: text }))
                }
                placeholder="Enter amount"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Purpose *</Text>
              <TextInput
                style={styles.input}
                value={newAllocation.purpose}
                onChangeText={(text) =>
                  setNewAllocation((prev) => ({ ...prev, purpose: text }))
                }
                placeholder="Enter purpose"
                placeholderTextColor="#666"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAllocateModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAllocateFloat}
            >
              <Text style={styles.saveButtonText}>Allocate Float</Text>
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
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  allocateButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  allocateButtonText: {
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
  allocationCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  allocationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  supervisorName: {
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
  allocationDetails: {
    marginBottom: 12,
  },
  purpose: {
    fontSize: 14,
    color: "#007AFF",
    marginBottom: 4,
  },
  allocatedAt: {
    fontSize: 12,
    color: "#999",
  },
  amountSection: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 14,
    color: "#999",
  },
  amountValue: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
  },
  returnedSection: {
    backgroundColor: "#2d1b2d",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  returnedText: {
    fontSize: 14,
    color: "#9C27B0",
    textAlign: "center",
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
