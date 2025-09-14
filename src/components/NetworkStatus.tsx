import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

interface NetworkStatusProps {
  showWhenOnline?: boolean;
  onRetry?: () => void;
}

export function NetworkStatus({
  showWhenOnline = false,
  onRetry,
}: NetworkStatusProps) {
  const { isOnline, isConnected, apiReachable, forceCheck } =
    useNetworkStatus();

  // Don't show if online and showWhenOnline is false
  if (isOnline && !showWhenOnline) {
    return null;
  }

  const getStatusText = () => {
    if (isOnline) return "Connected";
    if (!isConnected) return "No Internet Connection";
    if (!apiReachable) return "API Unreachable";
    return "Connection Issues";
  };

  const getStatusColor = () => {
    if (isOnline) return "#4CAF50";
    if (!isConnected) return "#F44336";
    if (!apiReachable) return "#FF9800";
    return "#F44336";
  };

  return (
    <View style={[styles.container, { backgroundColor: getStatusColor() }]}>
      <Text style={styles.text}>{getStatusText()}</Text>
      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={async () => {
            await forceCheck();
            onRetry();
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  retryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  retryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
