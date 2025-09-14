import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import {
  permissionsService,
  PermissionCheck,
} from "../services/PermissionsService";
import { analytics } from "../analytics/AnalyticsService";

interface PermissionNavigationGuardProps {
  children: React.ReactNode;
  screen: string;
  metadata?: Record<string, any>;
  fallbackScreen?: string;
}

export const PermissionNavigationGuard: React.FC<
  PermissionNavigationGuardProps
> = ({ children, screen, metadata, fallbackScreen = "/dashboard" }) => {
  const [permissionCheck, setPermissionCheck] =
    useState<PermissionCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkScreenAccess();
  }, [screen]);

  const checkScreenAccess = async () => {
    try {
      setLoading(true);
      const check = await permissionsService.canAccessScreen(screen, metadata);
      setPermissionCheck(check);

      if (!check.allowed) {
        // Track navigation denial
        analytics.track({
          event: "navigation_denied",
          properties: {
            screen,
            reason: check.reason,
            fallbackScreen,
            metadata,
          },
          timestamp: new Date(),
        });

        // Show alert and redirect
        Alert.alert(
          "Access Denied",
          check.reason || "You do not have permission to access this screen.",
          [
            {
              text: "Go to Dashboard",
              onPress: () => router.replace(fallbackScreen),
            },
          ],
        );
      }
    } catch (error) {
      console.error("Error checking screen access:", error);
      setPermissionCheck({
        allowed: false,
        reason: "Screen access check failed",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Checking access...</Text>
      </View>
    );
  }

  if (!permissionCheck?.allowed) {
    return (
      <View style={styles.deniedContainer}>
        <Text style={styles.deniedTitle}>Access Denied</Text>
        <Text style={styles.deniedText}>
          {permissionCheck?.reason ||
            "You do not have permission to access this screen."}
        </Text>
        <TouchableOpacity
          style={styles.redirectButton}
          onPress={() => router.replace(fallbackScreen)}
        >
          <Text style={styles.redirectButtonText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
};

// Hook for checking permissions before navigation
export const usePermissionNavigation = () => {
  const router = useRouter();

  const navigateWithPermission = async (
    screen: string,
    metadata?: Record<string, any>,
    fallbackScreen: string = "/dashboard",
  ) => {
    try {
      const check = await permissionsService.canAccessScreen(screen, metadata);

      if (!check.allowed) {
        // Track navigation attempt
        analytics.track({
          event: "navigation_attempt_denied",
          properties: {
            screen,
            reason: check.reason,
            fallbackScreen,
            metadata,
          },
          timestamp: new Date(),
        });

        Alert.alert(
          "Access Denied",
          check.reason || "You do not have permission to access this screen.",
          [
            {
              text: "OK",
              style: "default",
            },
          ],
        );

        return false;
      }

      // Navigate to screen
      router.push(screen);
      return true;
    } catch (error) {
      console.error("Error checking navigation permission:", error);
      Alert.alert("Error", "Failed to check permissions. Please try again.");
      return false;
    }
  };

  const navigateWithFeaturePermission = async (
    feature: string,
    screen: string,
    metadata?: Record<string, any>,
    fallbackScreen: string = "/dashboard",
  ) => {
    try {
      const check = await permissionsService.canAccessFeature(
        feature,
        screen,
        metadata,
      );

      if (!check.allowed) {
        // Track feature access attempt
        analytics.track({
          event: "feature_access_attempt_denied",
          properties: {
            feature,
            screen,
            reason: check.reason,
            fallbackScreen,
            metadata,
          },
          timestamp: new Date(),
        });

        Alert.alert(
          "Access Denied",
          check.reason || "You do not have permission to access this feature.",
          [
            {
              text: "OK",
              style: "default",
            },
          ],
        );

        return false;
      }

      // Navigate to screen
      router.push(screen);
      return true;
    } catch (error) {
      console.error("Error checking feature permission:", error);
      Alert.alert("Error", "Failed to check permissions. Please try again.");
      return false;
    }
  };

  return {
    navigateWithPermission,
    navigateWithFeaturePermission,
  };
};

// Component for permission-aware navigation buttons
export const PermissionNavigationButton: React.FC<{
  title: string;
  screen: string;
  metadata?: Record<string, any>;
  fallbackScreen?: string;
  style?: any;
  textStyle?: any;
  onPress?: () => void;
}> = ({
  title,
  screen,
  metadata,
  fallbackScreen = "/dashboard",
  style,
  textStyle,
  onPress,
}) => {
  const { navigateWithPermission } = usePermissionNavigation();

  const handlePress = async () => {
    if (onPress) {
      onPress();
    }

    await navigateWithPermission(screen, metadata, fallbackScreen);
  };

  return (
    <TouchableOpacity
      style={[styles.navigationButton, style]}
      onPress={handlePress}
    >
      <Text style={[styles.navigationButtonText, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  loadingText: {
    color: "#999",
    fontSize: 14,
  },
  deniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#1a1a1a",
  },
  deniedTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f44336",
    marginBottom: 12,
    textAlign: "center",
  },
  deniedText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  redirectButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  redirectButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  navigationButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  navigationButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
