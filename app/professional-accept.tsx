import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  professionalService,
  ProfessionalInvite,
  ProfessionalScope,
} from "../src/services/ProfessionalService";
import { appState } from "../src/state/AppState";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

export default function ProfessionalAcceptScreen() {
  const { token } = useLocalSearchParams();
  const router = useRouter();
  const [invite, setInvite] = useState<ProfessionalInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadInvite();
    }
  }, [token]);

  const loadInvite = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!token || typeof token !== "string") {
        setError("Invalid invite token");
        return;
      }

      const inviteData = await professionalService.getInviteByToken(token);
      if (!inviteData) {
        setError("Invite not found or expired");
        return;
      }

      if (inviteData.status !== "pending") {
        setError("Invite is no longer pending");
        return;
      }

      setInvite(inviteData);

      // Track professional accept view
      analytics.track({
        event: "professional_accept_viewed",
        properties: {
          inviteId: inviteData.id,
          organizationId: inviteData.organizationId,
          professionalPhone: inviteData.professionalPhone,
          scopeCount: inviteData.scopes.length,
        },
        timestamp: new Date(),
      });
    } catch (err: any) {
      console.error("Failed to load invite:", err);
      setError(err.message || "Failed to load invite");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    try {
      if (!invite) {
        Alert.alert("Error", "Invite not found");
        return;
      }

      const user = appState.getUser();
      if (!user) {
        Alert.alert("Error", "User not found");
        return;
      }

      setAccepting(true);

      const result = await professionalService.acceptInvite(
        invite.inviteToken,
        user.id,
        user.phone, // Using phone as name for now
        user.phone,
        user.phone, // Using phone as email for now
      );

      if (result.success) {
        Alert.alert("Success", "Professional access granted successfully!", [
          {
            text: "OK",
            onPress: () => router.replace("/professional-dashboard"),
          },
        ]);
      } else {
        Alert.alert("Error", result.error || "Failed to accept invite");
      }
    } catch (error: any) {
      console.error("Error accepting invite:", error);
      Alert.alert("Error", "Failed to accept invite");
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineInvite = async () => {
    try {
      if (!invite) {
        Alert.alert("Error", "Invite not found");
        return;
      }

      Alert.prompt("Decline Invite", "Enter reason for declining (optional):", [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Decline",
          style: "destructive",
          onPress: async (reason) => {
            setDeclining(true);

            const result = await professionalService.declineInvite(
              invite.inviteToken,
              reason,
            );

            if (result.success) {
              Alert.alert("Success", "Invite declined successfully", [
                {
                  text: "OK",
                  onPress: () => router.replace("/dashboard"),
                },
              ]);
            } else {
              Alert.alert("Error", result.error || "Failed to decline invite");
            }

            setDeclining(false);
          },
        },
      ]);
    } catch (error: any) {
      console.error("Error declining invite:", error);
      Alert.alert("Error", "Failed to decline invite");
      setDeclining(false);
    }
  };

  const renderScope = (scope: ProfessionalScope) => (
    <View
      key={scope.id}
      style={[
        styles.scopeCard,
        { borderColor: professionalService.getCategoryColor(scope.category) },
      ]}
    >
      <Text
        style={[
          styles.scopeName,
          { color: professionalService.getCategoryColor(scope.category) },
        ]}
      >
        {scope.name}
      </Text>
      <Text style={styles.scopeDescription}>{scope.description}</Text>
      <View style={styles.scopeCategory}>
        <Text style={styles.scopeCategoryText}>
          {professionalService.getCategoryLabel(scope.category)}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <AuthenticatedLayout title="Professional Invite">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading invite...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  if (error) {
    return (
      <AuthenticatedLayout title="Professional Invite">
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadInvite}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </AuthenticatedLayout>
    );
  }

  if (!invite) {
    return (
      <AuthenticatedLayout title="Professional Invite">
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Invite not found</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout title="Professional Invite">
      <ScrollView style={styles.container}>
        {/* Organization Details */}
        <View style={styles.organizationCard}>
          <Text style={styles.organizationTitle}>Organization Invitation</Text>
          <Text style={styles.organizationName}>{invite.organizationName}</Text>
          <Text style={styles.invitedBy}>
            Invited by: {invite.invitedByName}
          </Text>
          <Text style={styles.invitedAt}>
            Invited: {new Date(invite.invitedAt).toLocaleString()}
          </Text>
        </View>

        {/* Professional Details */}
        <View style={styles.professionalCard}>
          <Text style={styles.professionalTitle}>Your Details</Text>
          <Text style={styles.professionalName}>{invite.professionalName}</Text>
          <Text style={styles.professionalPhone}>
            {professionalService.formatPhone(invite.professionalPhone)}
          </Text>
          {invite.professionalEmail && (
            <Text style={styles.professionalEmail}>
              {professionalService.formatEmail(invite.professionalEmail)}
            </Text>
          )}
        </View>

        {/* Access Scopes */}
        <View style={styles.scopesCard}>
          <Text style={styles.scopesTitle}>Access Permissions</Text>
          <Text style={styles.scopesSubtitle}>
            You will have access to the following features:
          </Text>

          <View style={styles.scopesContainer}>
            {invite.scopes.map(renderScope)}
          </View>
        </View>

        {/* Terms and Conditions */}
        <View style={styles.termsCard}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          <Text style={styles.termsText}>
            • You will have limited access to organization data based on the
            scopes above
          </Text>
          <Text style={styles.termsText}>
            • You must maintain confidentiality of all organization data
          </Text>
          <Text style={styles.termsText}>
            • Access can be revoked by the organization at any time
          </Text>
          <Text style={styles.termsText}>
            • You are responsible for maintaining the security of your account
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.declineButton, declining && styles.buttonDisabled]}
            onPress={handleDeclineInvite}
            disabled={declining}
          >
            {declining ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.declineButtonText}>Decline</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptButton, accepting && styles.buttonDisabled]}
            onPress={handleAcceptInvite}
            disabled={accepting}
          >
            {accepting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.acceptButtonText}>Accept Invite</Text>
            )}
          </TouchableOpacity>
        </View>
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
    marginTop: 16,
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
    padding: 16,
  },
  organizationCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  organizationTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  organizationName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 8,
  },
  invitedBy: {
    fontSize: 14,
    color: "#999",
    marginBottom: 4,
  },
  invitedAt: {
    fontSize: 14,
    color: "#999",
  },
  professionalCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  professionalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 4,
  },
  professionalPhone: {
    fontSize: 14,
    color: "#007AFF",
    marginBottom: 4,
  },
  professionalEmail: {
    fontSize: 14,
    color: "#999",
  },
  scopesCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  scopesTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  scopesSubtitle: {
    fontSize: 14,
    color: "#999",
    marginBottom: 16,
  },
  scopesContainer: {
    gap: 12,
  },
  scopeCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  scopeName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  scopeDescription: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 8,
  },
  scopeCategory: {
    alignSelf: "flex-start",
  },
  scopeCategoryText: {
    fontSize: 12,
    color: "#999",
    backgroundColor: "#333",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  termsCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  termsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  termsText: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 8,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  declineButton: {
    flex: 1,
    backgroundColor: "#f44336",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  declineButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  acceptButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
