import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { request } from "../../src/net/http";

interface InviteDetails {
  id: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    type: string;
    industry?: string;
    logo?: string;
  };
  role: {
    id: string;
    name: string;
    description?: string;
    level: number;
  };
  invitedBy: {
    name: string;
    email: string;
  };
  expiresAt: string;
  status: string;
}

export default function InviteAcceptanceScreen() {
  const { token } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadInviteDetails(token as string);
    }
  }, [token]);

  const loadInviteDetails = async (inviteToken: string) => {
    try {
      setLoading(true);
      const response = await request(`/organizations/invites/${inviteToken}`);
      setInviteDetails(response);
    } catch (error: any) {
      console.error("Failed to load invite details:", error);
      setError(error.message || "Invalid or expired invite");
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async () => {
    if (!token) return;

    try {
      setAccepting(true);
      const response = await request("/organizations/invites/accept", {
        method: "POST",
        json: { token },
      });

      Alert.alert(
        "Welcome!",
        `You've successfully joined ${inviteDetails?.organization.name}. You can now access the organization dashboard.`,
        [
          {
            text: "Go to Dashboard",
            onPress: () => router.replace("/dashboard"),
          },
        ],
      );
    } catch (error: any) {
      console.error("Failed to accept invite:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to accept invite. Please try again.",
      );
    } finally {
      setAccepting(false);
    }
  };

  const declineInvite = () => {
    Alert.alert(
      "Decline Invite",
      "Are you sure you want to decline this invitation?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => router.replace("/organizations"),
        },
      ],
    );
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

  const isExpired =
    inviteDetails && new Date(inviteDetails.expiresAt) < new Date();
  const isAlreadyAccepted = inviteDetails?.status === "accepted";

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading invite details...</Text>
      </View>
    );
  }

  if (error || !inviteDetails) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>❌</Text>
        <Text style={styles.errorTitle}>Invalid Invite</Text>
        <Text style={styles.errorMessage}>
          {error || "This invite link is invalid or has expired."}
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace("/organizations")}
        >
          <Text style={styles.primaryButtonText}>Go to Organizations</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Organization Invitation</Text>
      </View>

      <View style={styles.content}>
        {/* Organization Card */}
        <View style={styles.orgCard}>
          <View style={styles.orgHeader}>
            <View style={styles.orgInfo}>
              <Text style={styles.orgIcon}>
                {getTypeIcon(inviteDetails.organization.type)}
              </Text>
              <View style={styles.orgDetails}>
                <Text style={styles.orgName}>
                  {inviteDetails.organization.name}
                </Text>
                <Text style={styles.orgSlug}>
                  @{inviteDetails.organization.slug}
                </Text>
                {inviteDetails.organization.industry && (
                  <Text style={styles.orgIndustry}>
                    {inviteDetails.organization.industry}
                  </Text>
                )}
              </View>
            </View>
            {inviteDetails.organization.logo && (
              <Image
                source={{ uri: inviteDetails.organization.logo }}
                style={styles.orgLogo}
              />
            )}
          </View>
        </View>

        {/* Role Information */}
        <View style={styles.roleCard}>
          <Text style={styles.sectionTitle}>Your Role</Text>
          <View style={styles.roleInfo}>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: getRoleColor(inviteDetails.role.name) },
              ]}
            >
              <Text style={styles.roleText}>{inviteDetails.role.name}</Text>
            </View>
            <Text style={styles.roleDescription}>
              {inviteDetails.role.description ||
                "You will have access to organization features based on your role."}
            </Text>
          </View>
        </View>

        {/* Invitation Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Invitation Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Invited by:</Text>
            <Text style={styles.detailValue}>
              {inviteDetails.invitedBy.name}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Expires:</Text>
            <Text style={[styles.detailValue, isExpired && styles.expiredText]}>
              {new Date(inviteDetails.expiresAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <Text
              style={[
                styles.detailValue,
                isAlreadyAccepted && styles.acceptedText,
              ]}
            >
              {isAlreadyAccepted ? "Already Accepted" : "Pending"}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {isExpired ? (
            <View style={styles.expiredContainer}>
              <Text style={styles.expiredIcon}>⏰</Text>
              <Text style={styles.expiredTitle}>Invite Expired</Text>
              <Text style={styles.expiredMessage}>
                This invitation has expired. Please contact the organization
                administrator for a new invite.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.replace("/organizations")}
              >
                <Text style={styles.primaryButtonText}>
                  Go to Organizations
                </Text>
              </TouchableOpacity>
            </View>
          ) : isAlreadyAccepted ? (
            <View style={styles.acceptedContainer}>
              <Text style={styles.acceptedIcon}>✅</Text>
              <Text style={styles.acceptedTitle}>Already Accepted</Text>
              <Text style={styles.acceptedMessage}>
                You've already accepted this invitation. You can access the
                organization from your organizations list.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.replace("/organizations")}
              >
                <Text style={styles.primaryButtonText}>
                  Go to Organizations
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  accepting && styles.buttonDisabled,
                ]}
                onPress={acceptInvite}
                disabled={accepting}
              >
                {accepting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Accept Invitation
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={declineInvite}
                disabled={accepting}
              >
                <Text style={styles.secondaryButtonText}>Decline</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </ScrollView>
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
    paddingHorizontal: 24,
  },
  loadingText: {
    color: "#fff",
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  orgCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  orgHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
    fontSize: 20,
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
  orgLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  roleCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 16,
  },
  roleInfo: {
    alignItems: "flex-start",
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  roleText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  roleDescription: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 20,
  },
  detailsCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#333",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: "#999",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  expiredText: {
    color: "#FF6B6B",
  },
  acceptedText: {
    color: "#4CAF50",
  },
  actions: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  secondaryButtonText: {
    color: "#999",
    fontSize: 16,
    fontWeight: "500",
  },
  buttonDisabled: {
    backgroundColor: "#333",
  },
  expiredContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  expiredIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  expiredTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF6B6B",
    marginBottom: 8,
  },
  expiredMessage: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  acceptedContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  acceptedIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  acceptedTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 8,
  },
  acceptedMessage: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF6B6B",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: "#ccc",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
});
