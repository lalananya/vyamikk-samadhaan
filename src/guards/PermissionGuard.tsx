import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { getToken } from "../session";
import { request } from "../net/http";

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermissions: string[];
  organizationId?: string;
  fallback?: React.ReactNode;
  onUnauthorized?: () => void;
}

interface UserPermissions {
  permissions: string[];
  organizationId: string;
  role: {
    name: string;
    level: number;
  };
}

export default function PermissionGuard({
  children,
  requiredPermissions,
  organizationId,
  fallback,
  onUnauthorized,
}: PermissionGuardProps) {
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [userPermissions, setUserPermissions] =
    useState<UserPermissions | null>(null);

  useEffect(() => {
    checkPermissions();
  }, [requiredPermissions, organizationId]);

  const checkPermissions = async () => {
    try {
      setLoading(true);

      // Get current user's permissions
      const token = await getToken();
      if (!token) {
        setHasPermission(false);
        onUnauthorized?.();
        return;
      }

      // If organizationId is provided, get user's permissions for that organization
      if (organizationId) {
        const response = await request(
          `/organizations/${organizationId}/permissions`,
        );
        setUserPermissions(response);

        // Check if user has required permissions
        const hasRequiredPermissions = requiredPermissions.every((permission) =>
          hasUserPermission(response.permissions, permission),
        );

        setHasPermission(hasRequiredPermissions);

        if (!hasRequiredPermissions) {
          onUnauthorized?.();
        }
      } else {
        // For general permissions, check if user is authenticated
        setHasPermission(true);
      }
    } catch (error) {
      console.error("Permission check failed:", error);
      setHasPermission(false);
      onUnauthorized?.();
    } finally {
      setLoading(false);
    }
  };

  const hasUserPermission = (
    userPermissions: string[],
    requiredPermission: string,
  ): boolean => {
    // Wildcard permission grants everything
    if (userPermissions.includes("*")) {
      return true;
    }

    // Check for exact match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check for wildcard matches (e.g., 'employees:*' matches 'employees:create')
    const [resource, action] = requiredPermission.split(":");
    if (userPermissions.includes(`${resource}:*`)) {
      return true;
    }

    // Check for manage permission (e.g., 'employees:manage' grants all employee permissions)
    if (userPermissions.includes(`${resource}:manage`)) {
      return true;
    }

    return false;
  };

  const handleUnauthorized = () => {
    Alert.alert(
      "Access Denied",
      "You do not have permission to access this feature.",
      [{ text: "OK", onPress: () => router.back() }],
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>🔒</Text>
        <Text style={styles.errorTitle}>Access Denied</Text>
        <Text style={styles.errorMessage}>
          You don't have permission to access this feature.
        </Text>
        {userPermissions && (
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionLabel}>
              Your Role: {userPermissions.role.name}
            </Text>
            <Text style={styles.permissionLabel}>
              Required: {requiredPermissions.join(", ")}
            </Text>
          </View>
        )}
        <TouchableOpacity style={styles.button} onPress={handleUnauthorized}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    paddingHorizontal: 24,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
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
  permissionInfo: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: "100%",
  },
  permissionLabel: {
    fontSize: 14,
    color: "#999",
    marginBottom: 4,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
