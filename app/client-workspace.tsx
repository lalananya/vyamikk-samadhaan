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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  professionalService,
  ProfessionalClient,
} from "../src/services/ProfessionalService";
import { appState } from "../src/state/AppState";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

const WORKSPACE_TABS = [
  { id: "invoices", title: "Invoices", icon: "📄", color: "#2196F3" },
  { id: "documents", title: "Documents", icon: "📁", color: "#9C27B0" },
  { id: "gst", title: "GST Returns", icon: "📊", color: "#FF9800" },
  { id: "compliance", title: "Compliance", icon: "✅", color: "#4CAF50" },
  { id: "financial", title: "Financial", icon: "💰", color: "#4CAF50" },
  { id: "employees", title: "Employees", icon: "👥", color: "#2196F3" },
  { id: "attendance", title: "Attendance", icon: "⏰", color: "#FF9800" },
  { id: "cash", title: "Cash Transactions", icon: "💵", color: "#9C27B0" },
  {
    id: "disbursements",
    title: "Fund Disbursements",
    icon: "💸",
    color: "#f44336",
  },
];

export default function ClientWorkspaceScreen() {
  const { clientId, tab } = useLocalSearchParams();
  const router = useRouter();
  const [client, setClient] = useState<ProfessionalClient | null>(null);
  const [activeTab, setActiveTab] = useState<string>(
    (tab as string) || "invoices",
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clientId) {
      loadClientData();
    }
  }, [clientId]);

  const loadClientData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!clientId || typeof clientId !== "string") {
        setError("Invalid client ID");
        return;
      }

      const clientData = await professionalService.getClient(clientId);
      if (!clientData) {
        setError("Client not found");
        return;
      }

      setClient(clientData);

      // Track client workspace view
      analytics.track({
        event: "client_workspace_viewed",
        properties: {
          clientId: clientData.id,
          organizationId: clientData.organizationId,
          tab: activeTab,
        },
        timestamp: new Date(),
      });
    } catch (err: any) {
      console.error("Failed to load client data:", err);
      setError(err.message || "Failed to load client data");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadClientData();
    setRefreshing(false);
  };

  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);

    // Track tab switch
    analytics.track({
      event: "client_workspace_tab_switched",
      properties: {
        clientId: client?.id,
        organizationId: client?.organizationId,
        tab: tabId,
      },
      timestamp: new Date(),
    });
  };

  const hasAccess = (tabId: string): boolean => {
    if (!client) return false;

    switch (tabId) {
      case "invoices":
      case "financial":
        return (
          professionalService.hasScope(client, "view_invoices") ||
          professionalService.hasScope(client, "view_financial_reports")
        );
      case "documents":
        return professionalService.hasScope(client, "upload_legal_docs");
      case "gst":
        return professionalService.hasScope(client, "file_gst_returns");
      case "compliance":
        return professionalService.hasScope(client, "upload_compliance_docs");
      case "employees":
        return professionalService.hasScope(client, "view_employee_data");
      case "attendance":
        return professionalService.hasScope(client, "view_attendance");
      case "cash":
        return professionalService.hasScope(client, "view_cash_transactions");
      case "disbursements":
        return professionalService.hasScope(client, "view_fund_disbursements");
      default:
        return false;
    }
  };

  const renderTab = ({ item }: { item: (typeof WORKSPACE_TABS)[0] }) => {
    const hasAccessToTab = hasAccess(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.tabButton,
          { borderColor: item.color },
          activeTab === item.id && { backgroundColor: item.color + "20" },
          !hasAccessToTab && styles.disabledTab,
        ]}
        onPress={() => hasAccessToTab && handleTabPress(item.id)}
        disabled={!hasAccessToTab}
      >
        <Text style={styles.tabIcon}>{item.icon}</Text>
        <Text
          style={[
            styles.tabText,
            { color: hasAccessToTab ? item.color : "#666" },
            activeTab === item.id && styles.activeTabText,
          ]}
        >
          {item.title}
        </Text>
        {!hasAccessToTab && <Text style={styles.lockIcon}>🔒</Text>}
      </TouchableOpacity>
    );
  };

  const renderTabContent = () => {
    if (!client) return null;

    switch (activeTab) {
      case "invoices":
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Invoices</Text>
            <Text style={styles.tabSubtitle}>
              View and manage client invoices
            </Text>
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderIcon}>📄</Text>
              <Text style={styles.placeholderTitle}>Invoice Management</Text>
              <Text style={styles.placeholderText}>
                View, download, and manage client invoices
              </Text>
            </View>
          </View>
        );

      case "documents":
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Legal Documents</Text>
            <Text style={styles.tabSubtitle}>
              Upload and manage legal documents
            </Text>
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderIcon}>📁</Text>
              <Text style={styles.placeholderTitle}>Document Management</Text>
              <Text style={styles.placeholderText}>
                Upload, organize, and manage legal documents
              </Text>
            </View>
          </View>
        );

      case "gst":
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>GST Returns</Text>
            <Text style={styles.tabSubtitle}>File and manage GST returns</Text>
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderIcon}>📊</Text>
              <Text style={styles.placeholderTitle}>GST Management</Text>
              <Text style={styles.placeholderText}>
                File GST returns and manage compliance
              </Text>
            </View>
          </View>
        );

      case "compliance":
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Compliance</Text>
            <Text style={styles.tabSubtitle}>Manage compliance documents</Text>
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderIcon}>✅</Text>
              <Text style={styles.placeholderTitle}>Compliance Management</Text>
              <Text style={styles.placeholderText}>
                Upload and manage compliance documents
              </Text>
            </View>
          </View>
        );

      case "financial":
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Financial Reports</Text>
            <Text style={styles.tabSubtitle}>
              View financial reports and statements
            </Text>
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderIcon}>💰</Text>
              <Text style={styles.placeholderTitle}>Financial Dashboard</Text>
              <Text style={styles.placeholderText}>
                View financial reports and analytics
              </Text>
            </View>
          </View>
        );

      case "employees":
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Employee Data</Text>
            <Text style={styles.tabSubtitle}>
              View employee information and records
            </Text>
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderIcon}>👥</Text>
              <Text style={styles.placeholderTitle}>Employee Management</Text>
              <Text style={styles.placeholderText}>
                View employee data and records
              </Text>
            </View>
          </View>
        );

      case "attendance":
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Attendance Records</Text>
            <Text style={styles.tabSubtitle}>
              View attendance and punch records
            </Text>
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderIcon}>⏰</Text>
              <Text style={styles.placeholderTitle}>Attendance Dashboard</Text>
              <Text style={styles.placeholderText}>
                View attendance records and analytics
              </Text>
            </View>
          </View>
        );

      case "cash":
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Cash Transactions</Text>
            <Text style={styles.tabSubtitle}>
              View cash transaction history
            </Text>
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderIcon}>💵</Text>
              <Text style={styles.placeholderTitle}>Cash Ledger</Text>
              <Text style={styles.placeholderText}>
                View cash transaction history and balances
              </Text>
            </View>
          </View>
        );

      case "disbursements":
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Fund Disbursements</Text>
            <Text style={styles.tabSubtitle}>
              View fund disbursement records
            </Text>
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderIcon}>💸</Text>
              <Text style={styles.placeholderTitle}>
                Disbursement Dashboard
              </Text>
              <Text style={styles.placeholderText}>
                View fund disbursement records and analytics
              </Text>
            </View>
          </View>
        );

      default:
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Access Denied</Text>
            <Text style={styles.tabSubtitle}>
              You don't have access to this section
            </Text>
          </View>
        );
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout title="Client Workspace">
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading client workspace...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  if (error) {
    return (
      <AuthenticatedLayout title="Client Workspace">
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadClientData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </AuthenticatedLayout>
    );
  }

  if (!client) {
    return (
      <AuthenticatedLayout title="Client Workspace">
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Client not found</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout title="Client Workspace">
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Client Header */}
        <View style={styles.clientHeader}>
          <Text style={styles.clientName}>{client.organizationName}</Text>
          <Text style={styles.clientType}>{client.organizationType}</Text>
          <Text style={styles.lastAccessed}>
            Last accessed:{" "}
            {client.lastAccessedAt
              ? new Date(client.lastAccessedAt).toLocaleString()
              : "Never"}
          </Text>
        </View>

        {/* Available Scopes */}
        <View style={styles.scopesSection}>
          <Text style={styles.scopesTitle}>Your Access</Text>
          <View style={styles.scopesContainer}>
            {client.scopes.map((scope) => (
              <View
                key={scope.id}
                style={[
                  styles.scopeChip,
                  {
                    backgroundColor:
                      professionalService.getCategoryColor(scope.category) +
                      "20",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.scopeText,
                    {
                      color: professionalService.getCategoryColor(
                        scope.category,
                      ),
                    },
                  ]}
                >
                  {scope.name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsSection}>
          <Text style={styles.tabsTitle}>Workspace</Text>
          <FlatList
            data={WORKSPACE_TABS}
            renderItem={renderTab}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.tabsContainer}
          />
        </View>

        {/* Tab Content */}
        {renderTabContent()}
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
  clientHeader: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    margin: 16,
  },
  clientName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  clientType: {
    fontSize: 16,
    color: "#007AFF",
    marginBottom: 8,
  },
  lastAccessed: {
    fontSize: 12,
    color: "#999",
  },
  scopesSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  scopesTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  scopesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  scopeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scopeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  tabsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  tabsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  tabsContainer: {
    gap: 8,
  },
  tabButton: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginHorizontal: 4,
    marginBottom: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  disabledTab: {
    opacity: 0.5,
  },
  tabIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  activeTabText: {
    fontWeight: "bold",
  },
  lockIcon: {
    fontSize: 12,
    marginLeft: 4,
  },
  tabContent: {
    padding: 16,
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  tabSubtitle: {
    fontSize: 14,
    color: "#999",
    marginBottom: 16,
  },
  placeholderCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});
