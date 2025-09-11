import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { request } from "../src/net/http";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";
import { getToken } from "../src/session";
import { appState } from "../src/state/AppState";
import { analytics } from "../src/analytics/AnalyticsService";

interface Organization {
  id: string;
  name: string;
  slug: string;
  type: "msme" | "enterprise" | "ngo";
  industry?: string;
  logo?: string;
  member: {
    role: {
      name: string;
      level: number;
    };
    status: string;
    joinedAt: string;
  };
}

export default function OrganizationsScreen() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const response = await request("/organizations/my");
      setOrganizations(response);
    } catch (error: any) {
      console.error("Failed to load organizations:", error);
      Alert.alert("Error", "Failed to load organizations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrganizations();
    setRefreshing(false);
  };

  const selectOrganization = async (orgId: string) => {
    try {
      setSelectedOrg(orgId);

      // Set current organization in app state
      await appState.setCurrentOrganization(orgId);

      // Find organization details for tracking
      const org = organizations.find((o) => o.id === orgId);

      // Track organization selection
      analytics.track({
        event: "organization_selected",
        properties: {
          organizationId: orgId,
          organizationName: org?.name || "Unknown",
          organizationType: org?.type || "Unknown",
        },
        timestamp: new Date(),
      });

      console.log("Selected organization:", orgId);
      router.replace("/dashboard");
    } catch (error) {
      console.error("Failed to select organization:", error);
      Alert.alert("Error", "Failed to select organization. Please try again.");
    }
  };

  const createOrganization = () => {
    router.push("/organizations/create");
  };

  const getRoleColor = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case "owner":
        return "#FF6B6B";
      case "manager":
        return "#4ECDC4";
      case "accountant":
        return "#45B7D1";
      case "operator":
        return "#96CEB4";
      default:
        return "#95A5A6";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "msme":
        return "🏭";
      case "enterprise":
        return "🏢";
      case "ngo":
        return "🤝";
      default:
        return "🏢";
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading organizations...</Text>
      </View>
    );
  }

  return (
    <AuthenticatedLayout
      title="Organizations"
      onRefresh={onRefresh}
      refreshing={refreshing}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={createOrganization}
        >
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>
      {organizations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏢</Text>
          <Text style={styles.emptyTitle}>No Organizations</Text>
          <Text style={styles.emptySubtitle}>
            You're not a member of any organizations yet.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={createOrganization}
          >
            <Text style={styles.emptyButtonText}>
              Create Your First Organization
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        organizations.map((org) => (
          <TouchableOpacity
            key={org.id}
            style={[
              styles.orgCard,
              selectedOrg === org.id && styles.selectedOrgCard,
            ]}
            onPress={() => selectOrganization(org.id)}
          >
            <View style={styles.orgHeader}>
              <View style={styles.orgInfo}>
                <Text style={styles.orgIcon}>{getTypeIcon(org.type)}</Text>
                <View style={styles.orgDetails}>
                  <Text style={styles.orgName}>{org.name}</Text>
                  <Text style={styles.orgSlug}>@{org.slug}</Text>
                  {org.industry && (
                    <Text style={styles.orgIndustry}>{org.industry}</Text>
                  )}
                </View>
              </View>
              <View style={styles.orgActions}>
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: getRoleColor(org.member.role.name) },
                  ]}
                >
                  <Text style={styles.roleText}>{org.member.role.name}</Text>
                </View>
              </View>
            </View>

            <View style={styles.orgFooter}>
              <Text style={styles.memberStatus}>
                {org.member.status === "active" ? "✅ Active" : "⏳ Pending"}
              </Text>
              <Text style={styles.joinedDate}>
                Joined {new Date(org.member.joinedAt).toLocaleDateString()}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    color: "#fff",
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  createButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  orgCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  selectedOrgCard: {
    borderColor: "#007AFF",
    backgroundColor: "#1a1a2e",
  },
  orgHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orgInfo: {
    flexDirection: "row",
    flex: 1,
  },
  orgIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  orgDetails: {
    flex: 1,
  },
  orgName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  orgSlug: {
    fontSize: 14,
    color: "#999",
    marginBottom: 4,
  },
  orgIndustry: {
    fontSize: 14,
    color: "#666",
  },
  orgActions: {
    alignItems: "flex-end",
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  orgFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  memberStatus: {
    fontSize: 14,
    color: "#4CAF50",
  },
  joinedDate: {
    fontSize: 12,
    color: "#666",
  },
});
