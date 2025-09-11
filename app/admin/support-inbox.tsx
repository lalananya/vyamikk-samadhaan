import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { apiAdmin } from "../../src/api";
import { getToken } from "../../src/auth";
import Strings from "../../src/strings";

interface RoleChangeRequest {
  id: string;
  user_id: string;
  from_role: string;
  to_role: string;
  reason: string;
  status: string;
  created_at: number;
  decided_at?: number;
  phone?: string;
  current_role?: string;
}

export default function SupportInbox() {
  const [adminToken, setAdminToken] = useState("");
  const [requests, setRequests] = useState<RoleChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Check if user is allowed to access admin features
  const isAdminAllowed = () => {
    if (__DEV__) return true;

    const adminPhones = (Constants.expoConfig?.extra as any)?.adminPhones || [];
    // In a real app, you'd get the current user's phone from auth context
    // For now, we'll assume they're allowed if they have a token
    return adminPhones.length > 0;
  };

  useEffect(() => {
    if (!isAdminAllowed()) {
      Alert.alert(
        "Access Denied",
        "You are not authorized to access this feature",
      );
      return;
    }

    // Try to load saved admin token
    loadAdminToken();
  }, []);

  const loadAdminToken = async () => {
    try {
      const savedToken = await SecureStore.getItemAsync("admin_token_session");
      if (savedToken) {
        setAdminToken(savedToken);
        loadRequests();
      }
    } catch (error) {
      console.error("Failed to load admin token:", error);
    }
  };

  const saveAdminToken = async (token: string) => {
    try {
      await SecureStore.setItemAsync("admin_token_session", token);
    } catch (error) {
      console.error("Failed to save admin token:", error);
    }
  };

  const loadRequests = async (reset = false) => {
    if (!adminToken) return;

    setLoading(true);
    try {
      const currentOffset = reset ? 0 : offset;
      const response = await apiAdmin("/admin/role-change", {
        method: "GET",
        adminToken,
        // Add query params
      });

      if (response.ok) {
        const newRequests = response.items || [];
        if (reset) {
          setRequests(newRequests);
          setOffset(newRequests.length);
        } else {
          setRequests((prev) => [...prev, ...newRequests]);
          setOffset((prev) => prev + newRequests.length);
        }
        setHasMore(newRequests.length === 50); // Assuming 50 is the limit
      } else {
        Alert.alert("Error", response.error || "Failed to load requests");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Network error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setOffset(0);
    setHasMore(true);
    loadRequests(true);
  };

  const handleApprove = async (requestId: string) => {
    try {
      const response = await apiAdmin(
        `/admin/role-change/${requestId}/approve`,
        {
          method: "POST",
          adminToken,
        },
      );

      if (response.ok) {
        Alert.alert("Success", "Request approved successfully");
        handleRefresh();
      } else {
        Alert.alert("Error", response.error || "Failed to approve request");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Network error");
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const response = await apiAdmin(
        `/admin/role-change/${requestId}/reject`,
        {
          method: "POST",
          adminToken,
        },
      );

      if (response.ok) {
        Alert.alert("Success", "Request rejected");
        handleRefresh();
      } else {
        Alert.alert("Error", response.error || "Failed to reject request");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Network error");
    }
  };

  const handleSetToken = async () => {
    if (!adminToken.trim()) {
      Alert.alert("Error", "Please enter a valid admin token");
      return;
    }

    await saveAdminToken(adminToken);
    loadRequests(true);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getRoleLabel = (role: string) => {
    return role === "organisation"
      ? Strings.ROLES.ORGANISATION_LABEL
      : Strings.ROLES.PROFESSIONAL_LABEL;
  };

  const renderRequest = ({ item }: { item: RoleChangeRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <Text style={styles.requestId}>#{item.id.slice(-8)}</Text>
        <Text style={styles.requestDate}>{formatDate(item.created_at)}</Text>
      </View>

      <View style={styles.requestInfo}>
        <Text style={styles.phoneText}>
          {item.phone || `User: ${item.user_id.slice(-8)}`}
        </Text>
        <Text style={styles.roleChangeText}>
          {getRoleLabel(item.from_role)} → {getRoleLabel(item.to_role)}
        </Text>
        <Text style={styles.reasonText} numberOfLines={3}>
          {item.reason}
        </Text>
      </View>

      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleReject(item.id)}
        >
          <Ionicons name="close" size={16} color="white" />
          <Text style={styles.actionButtonText}>
            {Strings.ROLE_CHANGE.REJECT}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleApprove(item.id)}
        >
          <Ionicons name="checkmark" size={16} color="white" />
          <Text style={styles.actionButtonText}>
            {Strings.ROLE_CHANGE.APPROVE}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isAdminAllowed()) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={48} color="#666" />
          <Text style={styles.accessDeniedText}>Access Denied</Text>
          <Text style={styles.accessDeniedSubtext}>
            You are not authorized to access this feature
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!adminToken) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.tokenContainer}>
          <Text style={styles.title}>
            {Strings.ROLE_CHANGE.ADMIN_INBOX_TITLE}
          </Text>
          <Text style={styles.subtitle}>Enter admin token to continue</Text>

          <TextInput
            style={styles.tokenInput}
            placeholder={Strings.ROLE_CHANGE.ADMIN_TOKEN_PLACEHOLDER}
            value={adminToken}
            onChangeText={setAdminToken}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={styles.setTokenButton}
            onPress={handleSetToken}
          >
            <Text style={styles.setTokenButtonText}>
              {Strings.ROLE_CHANGE.SET_TOKEN}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {Strings.ROLE_CHANGE.ADMIN_INBOX_TITLE}
        </Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Ionicons name="refresh" size={20} color="#007bff" />
        </TouchableOpacity>
      </View>

      {loading && requests.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>{Strings.ROLE_CHANGE.LOADING}</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReached={() => {
            if (hasMore && !loading) {
              loadRequests();
            }
          }}
          onEndReachedThreshold={0.1}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {Strings.ROLE_CHANGE.NO_REQUESTS}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  accessDenied: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
  },
  accessDeniedSubtext: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
  tokenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
  },
  tokenInput: {
    width: "100%",
    height: 44,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  setTokenButton: {
    backgroundColor: "#007bff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  setTokenButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  listContainer: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  requestId: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#007bff",
  },
  requestDate: {
    fontSize: 12,
    color: "#666",
  },
  requestInfo: {
    marginBottom: 12,
  },
  phoneText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  roleChangeText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  requestActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  rejectButton: {
    backgroundColor: "#dc3545",
  },
  approveButton: {
    backgroundColor: "#28a745",
  },
  actionButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },
});
