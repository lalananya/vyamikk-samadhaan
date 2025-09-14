import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { appState } from "../src/state/AppState";
import {
  dashboardService,
  DashboardData,
  DashboardWidget,
  QuickAction,
} from "../src/services/DashboardService";
import { analytics } from "../src/analytics/AnalyticsService";
import {
  PermissionGuard,
  PermissionButton,
  FeatureGuard,
} from "../src/components/PermissionGuard";
import { PermissionNavigationGuard } from "../src/components/PermissionNavigationGuard";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

export default function Dashboard() {
  const [user, setUser] = useState(appState.getUser());
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = appState.getUser();
      setUser(currentUser);

      const data = await dashboardService.getDashboardData();
      setDashboardData(data);
    } catch (err: any) {
      console.error("Failed to load dashboard data:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleWidgetPress = (widget: DashboardWidget) => {
    // Track widget tap
    dashboardService.trackWidgetTap(widget.id, widget.action);

    // Navigate to widget route
    if (widget.params) {
      router.push({
        pathname: widget.route,
        params: widget.params,
      });
    } else {
      router.push(widget.route);
    }
  };

  const handleQuickActionPress = (action: QuickAction) => {
    // Track quick action tap
    analytics.track({
      event: "quick_action_tap",
      properties: {
        actionId: action.id,
        actionTitle: action.title,
        userId: user?.id,
        organizationId: appState.getCurrentOrganizationId(),
      },
      timestamp: new Date(),
    });

    // Navigate to action route
    if (action.params) {
      router.push({
        pathname: action.route,
        params: action.params,
      });
    } else {
      router.push(action.route);
    }
  };

  const renderWidget = ({ item }: { item: DashboardWidget }) => {
    const isEmpty = item.value === 0 || item.value === "0" || item.value === "";

    // Get permission resource and action based on widget
    const getWidgetPermission = (widget: DashboardWidget) => {
      switch (widget.id) {
        case "attendance_today":
          return { resource: "attendance", action: "read" };
        case "cash_summary":
          return { resource: "cash_ledger", action: "read" };
        case "open_issues":
          return { resource: "machine_issues", action: "read" };
        case "pending_partner_acks":
          return { resource: "partnerships", action: "read" };
        case "disbursement_status":
          return { resource: "fund_disbursement", action: "read" };
        case "float_remaining":
          return { resource: "fund_disbursement", action: "read" };
        case "pending_payouts":
          return { resource: "fund_disbursement", action: "read" };
        case "team_attendance":
          return { resource: "attendance", action: "read" };
        case "open_machine_issues":
          return { resource: "machine_issues", action: "read" };
        case "today_shift":
          return { resource: "punch_system", action: "read" };
        case "last_punch":
          return { resource: "punch_system", action: "read" };
        case "cash_confirmations":
          return { resource: "cash_transactions", action: "read" };
        case "my_issues":
          return { resource: "machine_issues", action: "read" };
        case "client_list":
          return { resource: "professional_invites", action: "read" };
        case "invoices_access":
          return { resource: "invoices", action: "read" };
        case "documents_access":
          return { resource: "documents", action: "read" };
        case "gst_access":
          return { resource: "gst_returns", action: "read" };
        default:
          return { resource: "dashboard", action: "read" };
      }
    };

    const permission = getWidgetPermission(item);

    return (
      <PermissionGuard
        resource={permission.resource}
        action={permission.action}
        screen="dashboard"
        metadata={{ widgetId: item.id }}
        fallback={
          <View style={[styles.widgetCard, styles.disabledWidgetCard]}>
            <View style={styles.widgetHeader}>
              <Text style={styles.widgetIcon}>🔒</Text>
              <View style={styles.widgetContent}>
                <Text style={styles.widgetTitle}>{item.title}</Text>
                <Text style={styles.widgetSubtitle}>Access restricted</Text>
              </View>
            </View>
            <View style={styles.widgetValue}>
              <Text style={[styles.widgetValueText, { color: "#666" }]}>—</Text>
            </View>
            <View style={styles.widgetAction}>
              <Text style={[styles.widgetActionText, { color: "#666" }]}>
                No Access
              </Text>
            </View>
          </View>
        }
      >
        <TouchableOpacity
          style={[styles.widgetCard, isEmpty && styles.emptyWidgetCard]}
          onPress={() => handleWidgetPress(item)}
        >
          <View style={styles.widgetHeader}>
            <Text style={styles.widgetIcon}>{item.icon}</Text>
            <View style={styles.widgetContent}>
              <Text style={styles.widgetTitle}>{item.title}</Text>
              {item.subtitle && (
                <Text style={styles.widgetSubtitle}>{item.subtitle}</Text>
              )}
            </View>
          </View>

          <View style={styles.widgetValue}>
            <Text style={[styles.widgetValueText, { color: item.color }]}>
              {item.value}
            </Text>
          </View>

          <View style={styles.widgetAction}>
            <Text style={[styles.widgetActionText, { color: item.color }]}>
              {item.action}
            </Text>
          </View>

          {isEmpty && item.emptyState && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>
                {item.emptyState.title}
              </Text>
              <Text style={styles.emptyStateSubtitle}>
                {item.emptyState.subtitle}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </PermissionGuard>
    );
  };

  const renderQuickAction = ({ item }: { item: QuickAction }) => {
    // Get permission resource and action based on quick action
    const getQuickActionPermission = (action: QuickAction) => {
      switch (action.id) {
        case "add_employee":
          return { resource: "employees", action: "create" };
        case "allocate_float":
          return { resource: "fund_disbursement", action: "allocate" };
        case "create_cash_tx":
          return { resource: "cash_transactions", action: "create" };
        case "invite_professional":
          return { resource: "professional_invites", action: "create" };
        case "create_payout":
          return { resource: "fund_disbursement", action: "create_payout" };
        case "submit_bill":
          return { resource: "fund_disbursement", action: "submit_bill" };
        case "view_team":
          return { resource: "employees", action: "read" };
        case "manage_issues":
          return { resource: "machine_issues", action: "read" };
        case "punch_card":
          return { resource: "punch_system", action: "punch_in" };
        case "report_issue":
          return { resource: "machine_issues", action: "create" };
        case "view_attendance":
          return { resource: "attendance", action: "read" };
        case "cash_confirmations":
          return { resource: "cash_transactions", action: "read" };
        case "view_clients":
          return { resource: "professional_invites", action: "read" };
        case "client_workspace":
          return { resource: "professional_invites", action: "read" };
        case "view_invites":
          return { resource: "professional_invites", action: "read" };
        case "complete_profile":
          return { resource: "profile", action: "update" };
        default:
          return { resource: "dashboard", action: "read" };
      }
    };

    const permission = getQuickActionPermission(item);

    return (
      <PermissionGuard
        resource={permission.resource}
        action={permission.action}
        screen="dashboard"
        metadata={{ actionId: item.id }}
        fallback={
          <View
            style={[styles.quickActionButton, styles.disabledQuickActionButton]}
          >
            <Text style={styles.quickActionIcon}>🔒</Text>
            <Text style={[styles.quickActionText, { color: "#666" }]}>
              {item.title}
            </Text>
          </View>
        }
      >
        <TouchableOpacity
          style={[
            styles.quickActionButton,
            { backgroundColor: item.color + "20" },
          ]}
          onPress={() => handleQuickActionPress(item)}
        >
          <Text style={styles.quickActionIcon}>{item.icon}</Text>
          <Text style={[styles.quickActionText, { color: item.color }]}>
            {item.title}
          </Text>
        </TouchableOpacity>
      </PermissionGuard>
    );
  };

  // Show loading state while checking authentication and permissions
  if (loading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {!user ? "Authenticating..." : "Loading dashboard..."}
        </Text>
      </View>
    );
  }

  return (
    <PermissionNavigationGuard screen="dashboard">
      <AuthenticatedLayout title="Dashboard">
        <ScrollView
          style={styles.container}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Welcome Section */}
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeText}>
              Welcome, {user?.category || "User"}
            </Text>
            <Text style={styles.subtitleText}>
              {user?.category
                ? `Manage your ${user.category} activities`
                : "Complete your profile to get started"}
            </Text>
          </View>

          {/* Error State */}
          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadDashboardData}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Widgets Section */}
          {dashboardData && dashboardData.widgets.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <FlatList
                data={dashboardData.widgets}
                renderItem={renderWidget}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.widgetsContainer}
              />
            </View>
          )}

          {/* Quick Actions Section */}
          {dashboardData && dashboardData.quickActions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <FlatList
                data={dashboardData.quickActions}
                renderItem={renderQuickAction}
                keyExtractor={(item) => item.id}
                numColumns={2}
                scrollEnabled={false}
                contentContainerStyle={styles.quickActionsContainer}
              />
            </View>
          )}

          {/* Empty State */}
          {dashboardData && dashboardData.widgets.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No data available</Text>
              <Text style={styles.emptyStateSubtitle}>
                Complete your profile and organization setup to see your
                dashboard
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => router.push("/profile")}
              >
                <Text style={styles.emptyStateButtonText}>
                  Complete Profile
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </AuthenticatedLayout>
    </PermissionNavigationGuard>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 20,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 16,
  },
  container: {
    flex: 1,
  },
  welcomeCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 16,
    marginVertical: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  widgetsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  widgetCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  emptyWidgetCard: {
    opacity: 0.7,
  },
  widgetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  widgetIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  widgetContent: {
    flex: 1,
  },
  widgetTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  widgetSubtitle: {
    fontSize: 14,
    color: "#999",
  },
  widgetValue: {
    alignItems: "flex-end",
    marginBottom: 8,
  },
  widgetValueText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  widgetAction: {
    alignItems: "flex-end",
  },
  widgetActionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 16,
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginHorizontal: 6,
    marginBottom: 12,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyStateButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  emptyStateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledWidgetCard: {
    opacity: 0.5,
    backgroundColor: "#0a0a0a",
  },
  disabledQuickActionButton: {
    opacity: 0.5,
    backgroundColor: "#0a0a0a",
  },
});
