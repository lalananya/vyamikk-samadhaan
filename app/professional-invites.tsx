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
  professionalService,
  ProfessionalInvite,
  ProfessionalLink,
  ProfessionalScope,
  ProfessionalStats,
} from "../src/services/ProfessionalService";
import { appState } from "../src/state/AppState";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

const PROFESSIONAL_TYPES = [
  { value: "ca", label: "Chartered Accountant", color: "#4CAF50" },
  { value: "lawyer", label: "Lawyer", color: "#2196F3" },
  { value: "advocate", label: "Advocate", color: "#9C27B0" },
  { value: "other", label: "Other Professional", color: "#FF9800" },
];

export default function ProfessionalInvitesScreen() {
  const [invites, setInvites] = useState<ProfessionalInvite[]>([]);
  const [links, setLinks] = useState<ProfessionalLink[]>([]);
  const [stats, setStats] = useState<ProfessionalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"invites" | "links">("invites");

  const [newInvite, setNewInvite] = useState({
    professionalName: "",
    professionalPhone: "",
    professionalEmail: "",
    professionalType: "ca",
    selectedScopes: [] as string[],
  });

  const [availableScopes, setAvailableScopes] = useState<ProfessionalScope[]>(
    [],
  );

  useEffect(() => {
    loadData();
    setAvailableScopes(professionalService.getAllScopes());
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

      // Load invites and links
      const orgInvites = await professionalService.getInvites(currentOrgId);
      setInvites(orgInvites);

      const orgLinks = await professionalService.getLinks(currentOrgId);
      setLinks(orgLinks);

      const professionalStats =
        await professionalService.getStats(currentOrgId);
      setStats(professionalStats);

      // Track professional invites view
      analytics.track({
        event: "professional_invites_viewed",
        properties: {
          organizationId: currentOrgId,
          inviteCount: orgInvites.length,
          linkCount: orgLinks.length,
        },
        timestamp: new Date(),
      });
    } catch (err: any) {
      console.error("Failed to load professional data:", err);
      setError(err.message || "Failed to load professional data");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleInviteProfessional = async () => {
    try {
      if (!newInvite.professionalName || !newInvite.professionalPhone) {
        Alert.alert(
          "Required Fields",
          "Please fill in professional name and phone",
        );
        return;
      }

      if (newInvite.selectedScopes.length === 0) {
        Alert.alert("Required Fields", "Please select at least one scope");
        return;
      }

      const currentOrgId = appState.getCurrentOrganizationId();
      const user = appState.getUser();
      if (!currentOrgId || !user) {
        Alert.alert("Error", "No organization or user found");
        return;
      }

      const invite = await professionalService.inviteProfessional({
        organizationId: currentOrgId,
        organizationName: "Organization", // This should be dynamic
        professionalId: newInvite.professionalPhone, // Using phone as ID for now
        professionalName: newInvite.professionalName,
        professionalPhone: newInvite.professionalPhone,
        professionalEmail: newInvite.professionalEmail || undefined,
        scopes: newInvite.selectedScopes,
        invitedBy: user.id,
        invitedByName: user.phone, // Using phone as name for now
      });

      setInvites((prev) => [invite, ...prev]);
      setShowInviteModal(false);
      setNewInvite({
        professionalName: "",
        professionalPhone: "",
        professionalEmail: "",
        professionalType: "ca",
        selectedScopes: [],
      });

      Alert.alert("Success", "Professional invite sent successfully");
    } catch (error: any) {
      console.error("Error inviting professional:", error);
      Alert.alert("Error", error.message || "Failed to invite professional");
    }
  };

  const handleRevokeLink = async (linkId: string) => {
    try {
      const user = appState.getUser();
      if (!user) {
        Alert.alert("Error", "User not found");
        return;
      }

      Alert.alert(
        "Revoke Access",
        "Are you sure you want to revoke this professional's access?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Revoke",
            style: "destructive",
            onPress: async () => {
              const result = await professionalService.revokeLink(
                linkId,
                user.id,
                user.phone, // Using phone as name for now
                "Revoked by organization",
              );

              if (result.success) {
                await loadData(); // Refresh data
                Alert.alert(
                  "Success",
                  "Professional access revoked successfully",
                );
              } else {
                Alert.alert("Error", result.error || "Failed to revoke access");
              }
            },
          },
        ],
      );
    } catch (error: any) {
      console.error("Error revoking link:", error);
      Alert.alert("Error", "Failed to revoke access");
    }
  };

  const toggleScope = (scopeId: string) => {
    setNewInvite((prev) => ({
      ...prev,
      selectedScopes: prev.selectedScopes.includes(scopeId)
        ? prev.selectedScopes.filter((id) => id !== scopeId)
        : [...prev.selectedScopes, scopeId],
    }));
  };

  const renderInvite = ({ item }: { item: ProfessionalInvite }) => (
    <View style={styles.inviteCard}>
      <View style={styles.inviteHeader}>
        <Text style={styles.professionalName}>{item.professionalName}</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: professionalService.getStatusColor(item.status),
            },
          ]}
        >
          <Text style={styles.statusText}>
            {professionalService.getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.inviteDetails}>
        <Text style={styles.phone}>
          {professionalService.formatPhone(item.professionalPhone)}
        </Text>
        {item.professionalEmail && (
          <Text style={styles.email}>
            {professionalService.formatEmail(item.professionalEmail)}
          </Text>
        )}
        <Text style={styles.invitedAt}>
          Invited: {new Date(item.invitedAt).toLocaleString()}
        </Text>
      </View>

      <View style={styles.scopesSection}>
        <Text style={styles.scopesLabel}>Scopes:</Text>
        <View style={styles.scopesContainer}>
          {item.scopes.map((scope) => (
            <View
              key={scope.id}
              style={[
                styles.scopeChip,
                {
                  backgroundColor:
                    professionalService.getCategoryColor(scope.category) + "20",
                },
              ]}
            >
              <Text
                style={[
                  styles.scopeText,
                  {
                    color: professionalService.getCategoryColor(scope.category),
                  },
                ]}
              >
                {scope.name}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {item.status === "accepted" && (
        <View style={styles.acceptedSection}>
          <Text style={styles.acceptedText}>
            Accepted: {new Date(item.acceptedAt!).toLocaleString()}
          </Text>
        </View>
      )}

      {item.status === "declined" && (
        <View style={styles.declinedSection}>
          <Text style={styles.declinedText}>
            Declined: {new Date(item.declinedAt!).toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  );

  const renderLink = ({ item }: { item: ProfessionalLink }) => (
    <View style={styles.linkCard}>
      <View style={styles.linkHeader}>
        <Text style={styles.professionalName}>{item.professionalName}</Text>
        <View style={styles.linkActions}>
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
          {item.status === "active" && (
            <TouchableOpacity
              style={styles.revokeButton}
              onPress={() => handleRevokeLink(item.id)}
            >
              <Text style={styles.revokeButtonText}>Revoke</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.linkDetails}>
        <Text style={styles.phone}>
          {professionalService.formatPhone(item.professionalPhone)}
        </Text>
        {item.professionalEmail && (
          <Text style={styles.email}>
            {professionalService.formatEmail(item.professionalEmail)}
          </Text>
        )}
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
        <Text style={styles.scopesLabel}>Active Scopes:</Text>
        <View style={styles.scopesContainer}>
          {item.scopes.map((scope) => (
            <View
              key={scope.id}
              style={[
                styles.scopeChip,
                {
                  backgroundColor:
                    professionalService.getCategoryColor(scope.category) + "20",
                },
              ]}
            >
              <Text
                style={[
                  styles.scopeText,
                  {
                    color: professionalService.getCategoryColor(scope.category),
                  },
                ]}
              >
                {scope.name}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {item.status === "revoked" && (
        <View style={styles.revokedSection}>
          <Text style={styles.revokedText}>
            Revoked: {new Date(item.revokedAt!).toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <AuthenticatedLayout title="Professional Invites">
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading professional data...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout title="Professional Invites">
      {/* Stats Header */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalInvites}</Text>
            <Text style={styles.statLabel}>Total Invites</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#4CAF50" }]}>
              {stats.activeLinks}
            </Text>
            <Text style={styles.statLabel}>Active Links</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#ff9800" }]}>
              {stats.pendingInvites}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#f44336" }]}>
              {stats.revokedLinks}
            </Text>
            <Text style={styles.statLabel}>Revoked</Text>
          </View>
        </View>
      )}

      {/* Invite Professional Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => setShowInviteModal(true)}
        >
          <Text style={styles.inviteButtonText}>+ Invite Professional</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "invites" && styles.activeTab]}
          onPress={() => setActiveTab("invites")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "invites" && styles.activeTabText,
            ]}
          >
            Invites ({invites.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "links" && styles.activeTab]}
          onPress={() => setActiveTab("links")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "links" && styles.activeTabText,
            ]}
          >
            Active Links ({links.filter((l) => l.status === "active").length})
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
        data={
          activeTab === "invites"
            ? invites
            : links.filter((l) => l.status === "active")
        }
        renderItem={activeTab === "invites" ? renderInvite : renderLink}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No {activeTab} yet</Text>
            <Text style={styles.emptySubtext}>
              {activeTab === "invites"
                ? "Invite professionals to get started"
                : "No active professional links"}
            </Text>
          </View>
        }
      />

      {/* Invite Professional Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Invite Professional</Text>
            <TouchableOpacity onPress={() => setShowInviteModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Professional Name *</Text>
              <TextInput
                style={styles.input}
                value={newInvite.professionalName}
                onChangeText={(text) =>
                  setNewInvite((prev) => ({ ...prev, professionalName: text }))
                }
                placeholder="Enter professional name"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={newInvite.professionalPhone}
                onChangeText={(text) =>
                  setNewInvite((prev) => ({ ...prev, professionalPhone: text }))
                }
                placeholder="Enter phone number"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email (Optional)</Text>
              <TextInput
                style={styles.input}
                value={newInvite.professionalEmail}
                onChangeText={(text) =>
                  setNewInvite((prev) => ({ ...prev, professionalEmail: text }))
                }
                placeholder="Enter email address"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Professional Type</Text>
              <View style={styles.typeContainer}>
                {PROFESSIONAL_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeOption,
                      { borderColor: type.color },
                      newInvite.professionalType === type.value && {
                        backgroundColor: type.color + "20",
                      },
                    ]}
                    onPress={() =>
                      setNewInvite((prev) => ({
                        ...prev,
                        professionalType: type.value,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.typeText,
                        { color: type.color },
                        newInvite.professionalType === type.value &&
                          styles.typeTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Access Scopes *</Text>
              <Text style={styles.scopesNote}>
                Select what this professional can access
              </Text>
              <View style={styles.scopesGrid}>
                {availableScopes.map((scope) => (
                  <TouchableOpacity
                    key={scope.id}
                    style={[
                      styles.scopeOption,
                      {
                        borderColor: professionalService.getCategoryColor(
                          scope.category,
                        ),
                      },
                      newInvite.selectedScopes.includes(scope.id) && {
                        backgroundColor:
                          professionalService.getCategoryColor(scope.category) +
                          "20",
                      },
                    ]}
                    onPress={() => toggleScope(scope.id)}
                  >
                    <Text
                      style={[
                        styles.scopeOptionText,
                        {
                          color: professionalService.getCategoryColor(
                            scope.category,
                          ),
                        },
                        newInvite.selectedScopes.includes(scope.id) &&
                          styles.scopeOptionTextSelected,
                      ]}
                    >
                      {scope.name}
                    </Text>
                    <Text style={styles.scopeDescription}>
                      {scope.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowInviteModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleInviteProfessional}
            >
              <Text style={styles.saveButtonText}>Send Invite</Text>
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
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  inviteButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  inviteButtonText: {
    color: "#fff",
    fontSize: 16,
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
  inviteCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  inviteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  professionalName: {
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
  inviteDetails: {
    marginBottom: 12,
  },
  phone: {
    fontSize: 14,
    color: "#007AFF",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#999",
    marginBottom: 4,
  },
  invitedAt: {
    fontSize: 12,
    color: "#999",
  },
  scopesSection: {
    marginBottom: 8,
  },
  scopesLabel: {
    fontSize: 14,
    fontWeight: "600",
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
  acceptedSection: {
    backgroundColor: "#1b2d1b",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  acceptedText: {
    fontSize: 14,
    color: "#4CAF50",
    textAlign: "center",
  },
  declinedSection: {
    backgroundColor: "#2d1b1b",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  declinedText: {
    fontSize: 14,
    color: "#f44336",
    textAlign: "center",
  },
  linkCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  linkHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  linkActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  revokeButton: {
    backgroundColor: "#f44336",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  revokeButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  linkDetails: {
    marginBottom: 12,
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
  revokedSection: {
    backgroundColor: "#2d1b2d",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  revokedText: {
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
  typeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeOption: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    minWidth: 120,
  },
  typeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  typeTextSelected: {
    color: "#fff",
  },
  scopesNote: {
    fontSize: 14,
    color: "#999",
    marginBottom: 12,
  },
  scopesGrid: {
    gap: 12,
  },
  scopeOption: {
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
  },
  scopeOptionText: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  scopeOptionTextSelected: {
    color: "#fff",
  },
  scopeDescription: {
    fontSize: 12,
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
