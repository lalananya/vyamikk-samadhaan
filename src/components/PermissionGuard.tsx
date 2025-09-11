import React, { useState, useEffect, ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import {
  permissionsService,
  PermissionCheck,
} from "../services/PermissionsService";
import { analytics } from "../analytics/AnalyticsService";

interface PermissionGuardProps {
  children: ReactNode;
  resource: string;
  action: string;
  screen: string;
  fallback?: ReactNode;
  showDeniedMessage?: boolean;
  metadata?: Record<string, any>;
  onPermissionDenied?: (check: PermissionCheck) => void;
}

interface PermissionButtonProps extends PermissionGuardProps {
  onPress: () => void;
  style?: any;
  textStyle?: any;
  disabledStyle?: any;
  disabledTextStyle?: any;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  resource,
  action,
  screen,
  fallback = null,
  showDeniedMessage = false,
  metadata,
  onPermissionDenied,
}) => {
  const [permissionCheck, setPermissionCheck] =
    useState<PermissionCheck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPermission();
  }, [resource, action, screen]);

  const checkPermission = async () => {
    try {
      setLoading(true);
      const check = await permissionsService.checkPermission(
        resource,
        action,
        screen,
        metadata,
      );
      setPermissionCheck(check);

      if (!check.allowed && onPermissionDenied) {
        onPermissionDenied(check);
      }
    } catch (error) {
      console.error("Error checking permission:", error);
      setPermissionCheck({ allowed: false, reason: "Permission check failed" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.loadingContainer}>{children}</View>;
  }

  if (!permissionCheck?.allowed) {
    if (showDeniedMessage) {
      return (
        <View style={styles.deniedContainer}>
          <Text style={styles.deniedText}>
            {permissionCheck?.reason || "Access denied"}
          </Text>
        </View>
      );
    }

    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  children,
  resource,
  action,
  screen,
  onPress,
  style,
  textStyle,
  disabledStyle,
  disabledTextStyle,
  metadata,
  onPermissionDenied,
}) => {
  const [permissionCheck, setPermissionCheck] =
    useState<PermissionCheck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPermission();
  }, [resource, action, screen]);

  const checkPermission = async () => {
    try {
      setLoading(true);
      const check = await permissionsService.checkPermission(
        resource,
        action,
        screen,
        metadata,
      );
      setPermissionCheck(check);

      if (!check.allowed && onPermissionDenied) {
        onPermissionDenied(check);
      }
    } catch (error) {
      console.error("Error checking permission:", error);
      setPermissionCheck({ allowed: false, reason: "Permission check failed" });
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    if (!permissionCheck?.allowed) {
      // Show permission denied alert
      Alert.alert(
        "Access Denied",
        permissionCheck?.reason ||
          "You do not have permission to perform this action.",
        [
          {
            text: "OK",
            style: "default",
          },
        ],
      );

      // Track permission denied attempt
      analytics.track({
        event: "permission_denied_ui",
        properties: {
          resource,
          action,
          screen,
          reason: permissionCheck?.reason,
          metadata,
        },
        timestamp: new Date(),
      });

      return;
    }

    onPress();
  };

  const isDisabled = loading || !permissionCheck?.allowed;

  return (
    <TouchableOpacity
      style={[style, isDisabled && (disabledStyle || styles.disabledButton)]}
      onPress={handlePress}
      disabled={isDisabled}
    >
      <Text
        style={[
          textStyle,
          isDisabled && (disabledTextStyle || styles.disabledText),
        ]}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
};

export const PermissionScreen: React.FC<{
  children: ReactNode;
  screen: string;
  fallback?: ReactNode;
  metadata?: Record<string, any>;
}> = ({ children, screen, fallback, metadata }) => {
  const [permissionCheck, setPermissionCheck] =
    useState<PermissionCheck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkScreenAccess();
  }, [screen]);

  const checkScreenAccess = async () => {
    try {
      setLoading(true);
      const check = await permissionsService.canAccessScreen(screen, metadata);
      setPermissionCheck(check);
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
        {fallback}
      </View>
    );
  }

  return <>{children}</>;
};

export const FeatureGuard: React.FC<{
  children: ReactNode;
  feature: string;
  screen: string;
  fallback?: ReactNode;
  metadata?: Record<string, any>;
}> = ({ children, feature, screen, fallback, metadata }) => {
  const [permissionCheck, setPermissionCheck] =
    useState<PermissionCheck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkFeatureAccess();
  }, [feature, screen]);

  const checkFeatureAccess = async () => {
    try {
      setLoading(true);
      const check = await permissionsService.canAccessFeature(
        feature,
        screen,
        metadata,
      );
      setPermissionCheck(check);
    } catch (error) {
      console.error("Error checking feature access:", error);
      setPermissionCheck({
        allowed: false,
        reason: "Feature access check failed",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.loadingContainer}>{children}</View>;
  }

  if (!permissionCheck?.allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
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
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: "#333",
  },
  disabledText: {
    color: "#666",
  },
});
