import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
  Alert,
} from "react-native";
import {
  permissionsService,
  PermissionAuditLog,
} from "../src/services/PermissionsService";
import { appState } from "../src/state/AppState";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

export default function PermissionAuditScreen() {
  const [auditLogs, setAuditLogs] = useState<PermissionAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "denied" | "granted">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAuditLogs();
  }, [filter]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = appState.getUser();
      const organizationId = appState.getCurrentOrganizationId();

      if (!user || !organizationId) {
        setError("User not authenticated or no organization context");
        return;
      }

      // Check if user has permission to view audit logs
      const canViewAudit = await permissionsService.canPerformAction(
        "audit_logs",
        "read",
        "permission-audit",
      );

      if (!canViewAudit.allowed) {
        setError("You do not have permission to view audit logs");
        return;
      }

      let logs = permissionsService.getAuditLogsForOrganization(organizationId);

      // Apply filter
      if (filter === "denied") {
        logs = logs.filter((log) => !log.allowed);
      } else if (filter === "granted") {
        logs = logs.filter((log) => log.allowed);
      }

      // Sort by timestamp (newest first)
      logs.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      setAuditLogs(logs);

      // Track audit view
      analytics.track({
        event: "audit_logs_viewed",
        properties: {
          userId: user.id,
          organizationId,
          filter,
          logCount: logs.length,
        },
        timestamp: new Date(),
      });
    } catch (err: any) {
      console.error("Failed to load audit logs:", err);
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAuditLogs();
    setRefreshing(false);
  };

  const handleFilterChange = (newFilter: "all" | "denied" | "granted") => {
    setFilter(newFilter);

    analytics.track({
      event: "audit_filter_changed",
      properties: {
        filter: newFilter,
        userId: appState.getUser()?.id,
        organizationId: appState.getCurrentOrganizationId(),
      },
      timestamp: new Date(),
    });
  };

  const renderAuditLog = ({ item }: { item: PermissionAuditLog }) => (
    <View style={[styles.auditLogCard, !item.allowed && styles.deniedLogCard]}>
      <View style={styles.auditLogHeader}>
        <View style={styles.auditLogInfo}>
          <Text style={styles.auditLogResource}>
            {item.resource} • {item.action}
          </Text>
          <Text style={styles.auditLogScreen}>Screen: {item.screen}</Text>
        </View>
        <View
          style={[
            styles.auditLogStatus,
            item.allowed ? styles.grantedStatus : styles.deniedStatus,
          ]}
        >
          <Text
            style={[
              styles.auditLogStatusText,
              item.allowed ? styles.grantedStatusText : styles.deniedStatusText,
            ]}
          >
            {item.allowed ? "✓" : "✗"}
          </Text>
        </View>
      </View>

      {item.reason && <Text style={styles.auditLogReason}>{item.reason}</Text>}

      <View style={styles.auditLogFooter}>
        <Text style={styles.auditLogTimestamp}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
        <Text style={styles.auditLogUser}>
          User: {item.userId.substring(0, 8)}...
        </Text>
      </View>

      {item.metadata && Object.keys(item.metadata).length > 0 && (
        <View style={styles.auditLogMetadata}>
          <Text style={styles.auditLogMetadataTitle}>Metadata:</Text>
          {Object.entries(item.metadata).map(([key, value]) => (
            <Text key={key} style={styles.auditLogMetadataItem}>
              {key}: {String(value)}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  const renderFilterButton = (
    filterType: "all" | "denied" | "granted",
    label: string,
  ) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType && styles.activeFilterButton,
      ]}
      onPress={() => handleFilterChange(filterType)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === filterType && styles.activeFilterButtonText,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <AuthenticatedLayout title="Permission Audit">
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading audit logs...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  if (error) {
    return (
      <AuthenticatedLayout title="Permission Audit">
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAuditLogs}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout title="Permission Audit">
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          {renderFilterButton("all", "All")}
          {renderFilterButton("denied", "Denied")}
          {renderFilterButton("granted", "Granted")}
        </View>

        {/* Summary Stats */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{auditLogs.length}</Text>
            <Text style={styles.summaryLabel}>Total Events</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, { color: "#f44336" }]}>
              {auditLogs.filter((log) => !log.allowed).length}
            </Text>
            <Text style={styles.summaryLabel}>Denied</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, { color: "#4CAF50" }]}>
              {auditLogs.filter((log) => log.allowed).length}
            </Text>
            <Text style={styles.summaryLabel}>Granted</Text>
          </View>
        </View>

        {/* Audit Logs */}
        {auditLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No audit logs found</Text>
            <Text style={styles.emptyStateSubtitle}>
              {filter === "all"
                ? "No permission events have been recorded yet."
                : `No ${filter} permission events found.`}
            </Text>
          </View>
        ) : (
          <FlatList
            data={auditLogs}
            renderItem={renderAuditLog}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.auditLogsContainer}
          />
        )}
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
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
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  activeFilterButton: {
    backgroundColor: "#007AFF",
  },
  filterButtonText: {
    color: "#999",
    fontSize: 14,
    fontWeight: "500",
  },
  activeFilterButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#999",
  },
  auditLogsContainer: {
    padding: 16,
    gap: 12,
  },
  auditLogCard: {
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
  },
  deniedLogCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#f44336",
  },
  auditLogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  auditLogInfo: {
    flex: 1,
  },
  auditLogResource: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 2,
  },
  auditLogScreen: {
    fontSize: 12,
    color: "#999",
  },
  auditLogStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  grantedStatus: {
    backgroundColor: "#4CAF50",
  },
  deniedStatus: {
    backgroundColor: "#f44336",
  },
  auditLogStatusText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  grantedStatusText: {
    color: "#fff",
  },
  deniedStatusText: {
    color: "#fff",
  },
  auditLogReason: {
    fontSize: 14,
    color: "#f44336",
    marginBottom: 8,
    fontStyle: "italic",
  },
  auditLogFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  auditLogTimestamp: {
    fontSize: 12,
    color: "#666",
  },
  auditLogUser: {
    fontSize: 12,
    color: "#666",
  },
  auditLogMetadata: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  auditLogMetadataTitle: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
    fontWeight: "600",
  },
  auditLogMetadataItem: {
    fontSize: 11,
    color: "#666",
    marginBottom: 2,
  },
  emptyState: {
    padding: 24,
    alignItems: "center",
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});
