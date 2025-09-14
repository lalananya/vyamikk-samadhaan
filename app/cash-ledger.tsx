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
  FlatList,
} from "react-native";
import { router } from "expo-router";
import {
  cashTransactionService,
  CashLedgerEntry,
} from "../src/services/CashTransactionService";
import { appState } from "../src/state/AppState";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

export default function CashLedgerScreen() {
  const [ledgerEntries, setLedgerEntries] = useState<CashLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    loadLedger();
  }, []);

  const loadLedger = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentOrgId = appState.getCurrentOrganizationId();
      if (!currentOrgId) {
        setError("No organization selected");
        return;
      }

      // Load cash ledger
      const dateRange =
        filters.startDate && filters.endDate
          ? {
              start: filters.startDate,
              end: filters.endDate,
            }
          : undefined;

      const entries = await cashTransactionService.getCashLedger(
        currentOrgId,
        dateRange,
      );
      setLedgerEntries(entries);

      // Track ledger view
      analytics.track({
        event: "cash_ledger_viewed",
        properties: {
          organizationId: currentOrgId,
          entryCount: entries.length,
          hasDateFilter: !!dateRange,
        },
        timestamp: new Date(),
      });
    } catch (err: any) {
      console.error("Failed to load ledger:", err);
      setError(err.message || "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLedger();
    setRefreshing(false);
  };

  const applyFilters = () => {
    setShowFilters(false);
    loadLedger();
  };

  const clearFilters = () => {
    setFilters({ startDate: "", endDate: "" });
    setShowFilters(false);
    loadLedger();
  };

  const renderLedgerEntry = ({ item }: { item: CashLedgerEntry }) => (
    <View style={styles.ledgerCard}>
      <View style={styles.ledgerHeader}>
        <Text style={styles.personName}>{item.personName}</Text>
        {item.personPhone && (
          <Text style={styles.personPhone}>{item.personPhone}</Text>
        )}
      </View>

      <View style={styles.ledgerDetails}>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Net Balance:</Text>
          <Text
            style={[
              styles.balanceValue,
              { color: item.netBalance >= 0 ? "#4CAF50" : "#f44336" },
            ]}
          >
            {cashTransactionService.formatAmount(Math.abs(item.netBalance))}
            {item.netBalance >= 0 ? " (Credit)" : " (Debit)"}
          </Text>
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Total Received:</Text>
          <Text style={styles.amountValue}>
            {cashTransactionService.formatAmount(item.totalReceived)}
          </Text>
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Total Paid:</Text>
          <Text style={styles.amountValue}>
            {cashTransactionService.formatAmount(item.totalPaid)}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Transactions:</Text>
          <Text style={styles.metaValue}>{item.transactionCount}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Last Transaction:</Text>
          <Text style={styles.metaValue}>
            {new Date(item.lastTransactionAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <AuthenticatedLayout title="Cash Ledger">
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading ledger...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout title="Cash Ledger">
      {/* Filters */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadLedger}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={ledgerEntries}
        renderItem={renderLedgerEntry}
        keyExtractor={(item) => item.personId}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No ledger entries found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your filters or create some transactions
            </Text>
          </View>
        }
      />

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Ledger</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Date Range (Optional)</Text>
              <Text style={styles.filterNote}>
                Leave empty to show all transactions
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Apply</Text>
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
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterButton: {
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  filterButtonText: {
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
  ledgerCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  ledgerHeader: {
    marginBottom: 12,
  },
  personName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  personPhone: {
    fontSize: 14,
    color: "#999",
  },
  ledgerDetails: {
    gap: 8,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 12,
    color: "#999",
  },
  metaValue: {
    fontSize: 12,
    color: "#ccc",
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
  filterGroup: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  filterNote: {
    fontSize: 14,
    color: "#999",
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
  clearButton: {
    flex: 1,
    backgroundColor: "#666",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  clearButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  applyButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
