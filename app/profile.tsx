import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { request } from "../src/net/http";
import { appState } from "../src/state/AppState";
import {
  categoryChangeService,
  CategoryChangeAudit,
} from "../src/services/CategoryChangeService";
import CategoryChangeBanner from "../src/components/CategoryChangeBanner";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

interface UserProfile {
  id: string;
  phone: string;
  role: string;
  category: string;
  legalEntity?: string;
  displayName: string;
  registeredAt: string;
  specializations?: string[];
  serviceAreas?: string[];
}

const CATEGORY_LABELS: { [key: string]: string } = {
  micro_unit: "Micro Unit",
  small_unit: "Small Unit",
  professional: "Professional",
  ca: "CA",
  advocate: "Advocate",
  lawyer: "Lawyer",
  labour: "Labour",
  supervisor: "Supervisor",
  accountant: "Accountant",
  owner_partner: "Owner/Partner",
  director: "Director",
};

const LEGAL_ENTITY_LABELS: { [key: string]: string } = {
  proprietorship: "Proprietorship",
  partnership: "Partnership",
  llp: "LLP",
  pvt_ltd: "Pvt. Ltd.",
  other: "Other",
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [auditHistory, setAuditHistory] = useState<CategoryChangeAudit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      // Load user profile from API
      const userData = await request("/me");

      // Create profile from server data
      const profile: UserProfile = {
        id: userData.id,
        phone: userData.phone,
        role: userData.role,
        category: userData.category || "micro_unit",
        displayName: userData.displayName || "User", // This should come from the API
        registeredAt: userData.registered_at || new Date().toISOString(),
        legalEntity: userData.legalEntity || "proprietorship", // This should come from the API
        specializations: userData.specializations || [], // This should come from the API
        serviceAreas: userData.serviceAreas || [], // This should come from the API
      };

      setProfile(profile);

      // Load audit history
      const history = await categoryChangeService.getAuditHistory(userData.id);
      setAuditHistory(history);
    } catch (error) {
      console.error("Failed to load profile:", error);
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = async (newCategory: string) => {
    if (!profile) return;

    try {
      const result = await categoryChangeService.changeCategory(
        profile.id,
        profile.category,
        newCategory,
        profile.registeredAt,
        "User changed category from profile",
      );

      if (result.success) {
        setProfile((prev) =>
          prev ? { ...prev, category: newCategory } : null,
        );
        // Reload audit history
        const history = await categoryChangeService.getAuditHistory(profile.id);
        setAuditHistory(history);
      } else {
        Alert.alert("Error", result.error || "Failed to change category");
      }
    } catch (error) {
      console.error("Error changing category:", error);
      Alert.alert("Error", "Failed to change category");
    }
  };

  const handleLogout = async () => {
    try {
      await appState.logout();
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout title="Profile">
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  if (!profile) {
    return (
      <AuthenticatedLayout title="Profile">
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Failed to load profile</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout title="Profile">
      <ScrollView style={styles.container}>
        {/* Category Change Banner */}
        <CategoryChangeBanner
          userId={profile.id}
          registeredAt={profile.registeredAt}
          currentCategory={profile.category}
          onCategoryChange={handleCategoryChange}
        />

        {/* Profile Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Display Name</Text>
              <Text style={styles.infoValue}>{profile.displayName}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{profile.phone}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Category</Text>
              <Text style={styles.infoValue}>
                {CATEGORY_LABELS[profile.category] || profile.category}
              </Text>
            </View>

            {profile.legalEntity && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Legal Entity</Text>
                <Text style={styles.infoValue}>
                  {LEGAL_ENTITY_LABELS[profile.legalEntity] ||
                    profile.legalEntity}
                </Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Registered</Text>
              <Text style={styles.infoValue}>
                {new Date(profile.registeredAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Specializations */}
        {profile.specializations && profile.specializations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specializations</Text>
            <View style={styles.tagsContainer}>
              {profile.specializations.map((spec, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{spec}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Service Areas */}
        {profile.serviceAreas && profile.serviceAreas.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Areas</Text>
            <View style={styles.tagsContainer}>
              {profile.serviceAreas.map((area, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Audit History */}
        {auditHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category Change History</Text>
            <View style={styles.auditContainer}>
              {auditHistory.map((audit) => (
                <View key={audit.id} style={styles.auditItem}>
                  <View style={styles.auditHeader}>
                    <Text style={styles.auditDate}>
                      {new Date(audit.timestamp).toLocaleString()}
                    </Text>
                    <Text
                      style={[
                        styles.auditStatus,
                        audit.blocked
                          ? styles.auditStatusBlocked
                          : styles.auditStatusSuccess,
                      ]}
                    >
                      {audit.blocked ? "Blocked" : "Success"}
                    </Text>
                  </View>
                  <Text style={styles.auditChange}>
                    {CATEGORY_LABELS[audit.oldCategory] || audit.oldCategory} →{" "}
                    {CATEGORY_LABELS[audit.newCategory] || audit.newCategory}
                  </Text>
                  {audit.reason && (
                    <Text style={styles.auditReason}>
                      Reason: {audit.reason}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    color: "#ff4444",
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  infoLabel: {
    color: "#ccc",
    fontSize: 14,
  },
  infoValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: "#007AFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  auditContainer: {
    gap: 12,
  },
  auditItem: {
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
  },
  auditHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  auditDate: {
    color: "#999",
    fontSize: 12,
  },
  auditStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
  auditStatusSuccess: {
    color: "#4CAF50",
  },
  auditStatusBlocked: {
    color: "#ff4444",
  },
  auditChange: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  auditReason: {
    color: "#ccc",
    fontSize: 12,
  },
  logoutButton: {
    backgroundColor: "#ff4444",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
