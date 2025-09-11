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
import { router } from "expo-router";
import {
  professionalService,
  ProfessionalClient,
} from "../src/services/ProfessionalService";
import { appState } from "../src/state/AppState";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

export default function ProfessionalDashboardScreen() {
  const [clients, setClients] = useState<ProfessionalClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] =
    useState<ProfessionalClient | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = appState.getUser();
      if (!user) {
        setError("User not found");
        return;
      }

      // Load professional clients
      const professionalClients = await professionalService.getClients(user.id);
      setClients(professionalClients);

      // Track professional dashboard view
      analytics.track({
        event: "professional_dashboard_viewed",
        properties: {
          professionalId: user.id,
          clientCount: professionalClients.length,
        },
        timestamp: new Date(),
      });
    } catch (err: any) {
      console.error("Failed to load clients:", err);
      setError(err.message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadClients();
    setRefreshing(false);
  };

  const handleClientSelect = (client: ProfessionalClient) => {
    setSelectedClient(client);

    // Track client selection
    analytics.track({
      event: "professional_client_selected",
      properties: {
        clientId: client.id,
        organizationId: client.organizationId,
        scopeCount: client.scopes.length,
      },
      timestamp: new Date(),
    });
  };

  const handleClientAccess = (client: ProfessionalClient) => {
    // Navigate to client workspace
    router.push(`/client-workspace?clientId=${client.id}`);
  };

  const renderClient = ({ item }: { item: ProfessionalClient }) => {
    const menus = professionalService.getClientMenus(item);

    return (
      <TouchableOpacity
        style={styles.clientCard}
        onPress={() => handleClientSelect(item)}
      >
        <View style={styles.clientHeader}>
          <Text style={styles.clientName}>{item.organizationName}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: professionalService.getStatusColor(
                  item.status,
                ),
              },
            ]}
          >
            <Text style={styles.statusText}>
              {professionalService.getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.clientDetails}>
          <Text style={styles.organizationType}>{item.organizationType}</Text>
          <Text style={styles.linkedAt}>
            Linked: {new Date(item.linkedAt).toLocaleString()}
          </Text>
          {item.lastAccessedAt && (
            <Text style={styles.lastAccessed}>
              Last accessed: {new Date(item.lastAccessedAt).toLocaleString()}
            </Text>
          )}
        </View>

        <View style={styles.scopesSection}>
          <Text style={styles.scopesLabel}>Available Features:</Text>
          <View style={styles.menusContainer}>
            {menus.map((menu, index) => (
              <View key={index} style={styles.menuChip}>
                <Text style={styles.menuText}>{menu}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.scopesList}>
          <Text style={styles.scopesLabel}>Access Scopes:</Text>
          <View style={styles.scopesContainer}>
            {item.scopes.map((scope) => (
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

        {item.status === "active" && (
          <TouchableOpacity
            style={styles.accessButton}
            onPress={() => handleClientAccess(item)}
          >
            <Text style={styles.accessButtonText}>Access Workspace</Text>
          </TouchableOpacity>
        )}

        {item.status === "revoked" && (
          <View style={styles.revokedSection}>
            <Text style={styles.revokedText}>Access has been revoked</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <AuthenticatedLayout title="Professional Dashboard">
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading clients...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout title="Professional Dashboard">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, Professional</Text>
        <Text style={styles.subtitleText}>
          Manage your client organizations and access their data
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{clients.length}</Text>
          <Text style={styles.statLabel}>Total Clients</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: "#4CAF50" }]}>
            {clients.filter((c) => c.status === "active").length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: "#f44336" }]}>
            {clients.filter((c) => c.status === "revoked").length}
          </Text>
          <Text style={styles.statLabel}>Revoked</Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadClients}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Clients List */}
      <FlatList
        data={clients}
        renderItem={renderClient}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No clients yet</Text>
            <Text style={styles.emptySubtext}>
              You will see client organizations here once they invite you
            </Text>
          </View>
        }
      />

      {/* Client Detail Modal */}
      {selectedClient && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedClient.organizationName}
            </Text>
            <Text style={styles.modalSubtitle}>
              {selectedClient.organizationType}
            </Text>

            <Text style={styles.modalSectionTitle}>Available Features:</Text>
            <View style={styles.modalMenusContainer}>
              {professionalService
                .getClientMenus(selectedClient)
                .map((menu, index) => (
                  <View key={index} style={styles.modalMenuChip}>
                    <Text style={styles.modalMenuText}>{menu}</Text>
                  </View>
                ))}
            </View>

            <Text style={styles.modalSectionTitle}>Access Scopes:</Text>
            <View style={styles.modalScopesContainer}>
              {selectedClient.scopes.map((scope) => (
                <View
                  key={scope.id}
                  style={[
                    styles.modalScopeChip,
                    {
                      backgroundColor:
                        professionalService.getCategoryColor(scope.category) +
                        "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalScopeText,
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

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setSelectedClient(null)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
              {selectedClient.status === "active" && (
                <TouchableOpacity
                  style={styles.modalAccessButton}
                  onPress={() => {
                    setSelectedClient(null);
                    handleClientAccess(selectedClient);
                  }}
                >
                  <Text style={styles.modalAccessButtonText}>
                    Access Workspace
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}
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
    padding: 16,
    backgroundColor: "#111",
    margin: 16,
    borderRadius: 12,
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
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#111",
    marginHorizontal: 16,
    marginBottom: 16,
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
  clientCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  clientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  clientName: {
    fontSize: 20,
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
  clientDetails: {
    marginBottom: 12,
  },
  organizationType: {
    fontSize: 14,
    color: "#007AFF",
    marginBottom: 4,
  },
  linkedAt: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  lastAccessed: {
    fontSize: 12,
    color: "#999",
  },
  scopesSection: {
    marginBottom: 12,
  },
  scopesLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  menusContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  menuChip: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  menuText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#fff",
  },
  scopesList: {
    marginBottom: 12,
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
  accessButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  accessButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  revokedSection: {
    backgroundColor: "#2d1b2d",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  revokedText: {
    fontSize: 14,
    color: "#9C27B0",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#007AFF",
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
    marginTop: 16,
  },
  modalMenusContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  modalMenuChip: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalMenuText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#fff",
  },
  modalScopesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  modalScopeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalScopeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalCloseButton: {
    flex: 1,
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  modalCloseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalAccessButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  modalAccessButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
