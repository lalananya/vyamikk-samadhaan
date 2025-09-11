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
  Share,
} from "react-native";
import {
  auditService,
  AuditLog,
  AuditQuery,
  AuditStats,
} from "../src/services/AuditService";
import {
  analyticsService,
  AnalyticsEvent,
  AnalyticsQuery,
  AnalyticsStats,
} from "../src/services/AnalyticsService";
import { appState } from "../src/state/AppState";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

type TabType = "audit" | "analytics" | "compliance";

export default function ComplianceDashboardScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("audit");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([]);
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [analyticsStats, setAnalyticsStats] = useState<AnalyticsStats | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "success" | "failure">("all");

  useEffect(() => {
    loadData();
  }, [activeTab, filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = appState.getUser();
      const organizationId = appState.getCurrentOrganizationId();

      if (!user || !organizationId) {
        setError("User not authenticated or no organization context");
        return;
      }

      if (activeTab === "audit") {
        const query: AuditQuery = {
          organizationId,
          success: filter === "all" ? undefined : filter === "success",
        };

        const logs = await auditService.queryAuditLogs(query);
        setAuditLogs(logs);

        const stats = await auditService.getAuditStats(organizationId);
        setAuditStats(stats);
      } else if (activeTab === "analytics") {
        const query: AnalyticsQuery = {
          organizationId,
          // Add success filter for analytics if needed
        };

        const events = await analyticsService.queryEvents(query);
        setAnalyticsEvents(events);

        const stats = await analyticsService.getAnalyticsStats(organizationId);
        setAnalyticsStats(stats);
      }

      // Track compliance dashboard view
      analytics.track({
        event: "compliance_dashboard_viewed",
        properties: {
          userId: user.id,
          organizationId,
          tab: activeTab,
          filter,
        },
        timestamp: new Date(),
      });
    } catch (err: any) {
      console.error("Failed to load compliance data:", err);
      setError(err.message || "Failed to load compliance data");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);

    analytics.track({
      event: "compliance_tab_changed",
      properties: {
        userId: appState.getUser()?.id,
        organizationId: appState.getCurrentOrganizationId(),
        tab,
      },
      timestamp: new Date(),
    });
  };

  const handleFilterChange = (newFilter: "all" | "success" | "failure") => {
    setFilter(newFilter);

    analytics.track({
      event: "compliance_filter_changed",
      properties: {
        userId: appState.getUser()?.id,
        organizationId: appState.getCurrentOrganizationId(),
        filter: newFilter,
        tab: activeTab,
      },
      timestamp: new Date(),
    });
  };

  const handleExport = async () => {
    try {
      const user = appState.getUser();
      const organizationId = appState.getCurrentOrganizationId();

      if (!user || !organizationId) {
        Alert.alert(
          "Error",
          "User not authenticated or no organization context",
        );
        return;
      }

      let csvContent = "";
      let filename = "";

      if (activeTab === "audit") {
        const query: AuditQuery = {
          organizationId,
          success: filter === "all" ? undefined : filter === "success",
        };
        csvContent = await auditService.exportAuditLogs(query);
        filename = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
      } else if (activeTab === "analytics") {
        const query: AnalyticsQuery = {
          organizationId,
        };
        csvContent = await analyticsService.exportEvents(query);
        filename = `analytics_events_${new Date().toISOString().split("T")[0]}.csv`;
      }

      if (csvContent) {
        await Share.share({
          message: csvContent,
          title: filename,
        });

        analytics.track({
          event: "compliance_data_exported",
          properties: {
            userId: user.id,
            organizationId,
            tab: activeTab,
            filter,
            filename,
          },
          timestamp: new Date(),
        });
      } else {
        Alert.alert("Error", "No data to export");
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      Alert.alert("Error", "Failed to export data");
    }
  };

  const renderAuditLog = ({ item }: { item: AuditLog }) => (
    <View style={[styles.logCard, !item.success && styles.failureLogCard]}>
      <View style={styles.logHeader}>
        <View style={styles.logInfo}>
          <Text style={styles.logAction}>{item.action}</Text>
          <Text style={styles.logResource}>{item.resource}</Text>
        </View>
        <View
          style={[
            styles.logStatus,
            item.success ? styles.successStatus : styles.failureStatus,
          ]}
        >
          <Text
            style={[
              styles.logStatusText,
              item.success
                ? styles.successStatusText
                : styles.failureStatusText,
            ]}
          >
            {item.success ? "✓" : "✗"}
          </Text>
        </View>
      </View>

      <View style={styles.logDetails}>
        <Text style={styles.logActor}>
          {item.actorRole} ({item.actorCategory})
        </Text>
        <Text style={styles.logTimestamp}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>

      {item.failureReason && (
        <Text style={styles.logFailureReason}>{item.failureReason}</Text>
      )}

      <View style={styles.logFooter}>
        <Text style={styles.logRetentionTag}>
          {item.dataRetentionTag.category} (
          {item.dataRetentionTag.retentionPeriod}d)
        </Text>
        {item.resourceId && (
          <Text style={styles.logResourceId}>ID: {item.resourceId}</Text>
        )}
      </View>
    </View>
  );

  const renderAnalyticsEvent = ({ item }: { item: AnalyticsEvent }) => (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <View style={styles.logInfo}>
          <Text style={styles.logAction}>{item.event}</Text>
          <Text style={styles.logResource}>Analytics Event</Text>
        </View>
        <View
          style={[
            styles.logStatus,
            item.properties.success
              ? styles.successStatus
              : styles.failureStatus,
          ]}
        >
          <Text
            style={[
              styles.logStatusText,
              item.properties.success
                ? styles.successStatusText
                : styles.failureStatusText,
            ]}
          >
            {item.properties.success ? "✓" : "✗"}
          </Text>
        </View>
      </View>

      <View style={styles.logDetails}>
        <Text style={styles.logActor}>
          User: {item.userId?.substring(0, 8)}...
        </Text>
        <Text style={styles.logTimestamp}>
          {item.timestamp.toLocaleString()}
        </Text>
      </View>

      <View style={styles.logFooter}>
        <Text style={styles.logRetentionTag}>
          Session: {item.sessionId?.substring(0, 8)}...
        </Text>
      </View>
    </View>
  );

  const renderStats = () => {
    if (activeTab === "audit" && auditStats) {
      return (
        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <Text style={styles.statsNumber}>{auditStats.totalEvents}</Text>
            <Text style={styles.statsLabel}>Total Events</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={[styles.statsNumber, { color: "#4CAF50" }]}>
              {auditStats.successRate.toFixed(1)}%
            </Text>
            <Text style={styles.statsLabel}>Success Rate</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={[styles.statsNumber, { color: "#f44336" }]}>
              {auditStats.failureRate.toFixed(1)}%
            </Text>
            <Text style={styles.statsLabel}>Failure Rate</Text>
          </View>
        </View>
      );
    } else if (activeTab === "analytics" && analyticsStats) {
      return (
        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <Text style={styles.statsNumber}>{analyticsStats.totalEvents}</Text>
            <Text style={styles.statsLabel}>Total Events</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={[styles.statsNumber, { color: "#2196F3" }]}>
              {analyticsStats.uniqueUsers}
            </Text>
            <Text style={styles.statsLabel}>Unique Users</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={[styles.statsNumber, { color: "#4CAF50" }]}>
              {analyticsStats.successRate.toFixed(1)}%
            </Text>
            <Text style={styles.statsLabel}>Success Rate</Text>
          </View>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <AuthenticatedLayout title="Compliance Dashboard">
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading compliance data...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout title="Compliance Dashboard">
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "audit" && styles.activeTab]}
            onPress={() => handleTabChange("audit")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "audit" && styles.activeTabText,
              ]}
            >
              Audit Logs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "analytics" && styles.activeTab]}
            onPress={() => handleTabChange("analytics")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "analytics" && styles.activeTabText,
              ]}
            >
              Analytics
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "compliance" && styles.activeTab]}
            onPress={() => handleTabChange("compliance")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "compliance" && styles.activeTabText,
              ]}
            >
              Compliance
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === "all" && styles.activeFilterButton,
            ]}
            onPress={() => handleFilterChange("all")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === "all" && styles.activeFilterButtonText,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === "success" && styles.activeFilterButton,
            ]}
            onPress={() => handleFilterChange("success")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === "success" && styles.activeFilterButtonText,
              ]}
            >
              Success
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === "failure" && styles.activeFilterButton,
            ]}
            onPress={() => handleFilterChange("failure")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === "failure" && styles.activeFilterButtonText,
              ]}
            >
              Failure
            </Text>
          </TouchableOpacity>
        </View>

        {/* Export Button */}
        <View style={styles.exportContainer}>
          <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
            <Text style={styles.exportButtonText}>Export Data</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {renderStats()}

        {/* Error State */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Data List */}
        {activeTab === "audit" && (
          <View style={styles.dataContainer}>
            <Text style={styles.dataTitle}>Audit Logs</Text>
            {auditLogs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No audit logs found</Text>
                <Text style={styles.emptyStateSubtitle}>
                  {filter === "all"
                    ? "No audit events have been recorded yet."
                    : `No ${filter} audit events found.`}
                </Text>
              </View>
            ) : (
              <FlatList
                data={auditLogs}
                renderItem={renderAuditLog}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.logsContainer}
              />
            )}
          </View>
        )}

        {activeTab === "analytics" && (
          <View style={styles.dataContainer}>
            <Text style={styles.dataTitle}>Analytics Events</Text>
            {analyticsEvents.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>
                  No analytics events found
                </Text>
                <Text style={styles.emptyStateSubtitle}>
                  No analytics events have been recorded yet.
                </Text>
              </View>
            ) : (
              <FlatList
                data={analyticsEvents}
                renderItem={renderAnalyticsEvent}
                keyExtractor={(item, index) => `${item.event}_${index}`}
                scrollEnabled={false}
                contentContainerStyle={styles.logsContainer}
              />
            )}
          </View>
        )}

        {activeTab === "compliance" && (
          <View style={styles.dataContainer}>
            <Text style={styles.dataTitle}>Compliance Overview</Text>
            <View style={styles.complianceCard}>
              <Text style={styles.complianceTitle}>Data Retention Policy</Text>
              <Text style={styles.complianceText}>
                • Operational: 1 year retention
              </Text>
              <Text style={styles.complianceText}>
                • Financial: 7 years retention (legal hold)
              </Text>
              <Text style={styles.complianceText}>
                • Personal: 3 months retention
              </Text>
              <Text style={styles.complianceText}>
                • Compliance: 5 years retention (legal hold)
              </Text>
              <Text style={styles.complianceText}>
                • Security: 3 years retention (legal hold)
              </Text>
            </View>
          </View>
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
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
    fontWeight: "600",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  activeFilterButton: {
    backgroundColor: "#007AFF",
  },
  filterButtonText: {
    color: "#999",
    fontSize: 12,
    fontWeight: "500",
  },
  activeFilterButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  exportContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  exportButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  exportButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  statsNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 12,
    color: "#999",
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
  dataContainer: {
    padding: 16,
  },
  dataTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  logsContainer: {
    gap: 12,
  },
  logCard: {
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
  },
  failureLogCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#f44336",
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  logInfo: {
    flex: 1,
  },
  logAction: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 2,
  },
  logResource: {
    fontSize: 12,
    color: "#999",
  },
  logStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  successStatus: {
    backgroundColor: "#4CAF50",
  },
  failureStatus: {
    backgroundColor: "#f44336",
  },
  logStatusText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  successStatusText: {
    color: "#fff",
  },
  failureStatusText: {
    color: "#fff",
  },
  logDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  logActor: {
    fontSize: 12,
    color: "#999",
  },
  logTimestamp: {
    fontSize: 12,
    color: "#666",
  },
  logFailureReason: {
    fontSize: 12,
    color: "#f44336",
    marginBottom: 8,
    fontStyle: "italic",
  },
  logFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logRetentionTag: {
    fontSize: 10,
    color: "#666",
  },
  logResourceId: {
    fontSize: 10,
    color: "#666",
  },
  emptyState: {
    padding: 24,
    alignItems: "center",
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  complianceCard: {
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 16,
  },
  complianceTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  complianceText: {
    fontSize: 14,
    color: "#999",
    marginBottom: 8,
  },
});
