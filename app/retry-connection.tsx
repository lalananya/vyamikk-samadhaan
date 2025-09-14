import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { appState } from "../src/state/AppState";
import { bootSequence } from "../src/boot/BootSequence";

export default function RetryConnection() {
  const [retrying, setRetrying] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const router = useRouter();

  const handleRetry = async () => {
    setRetrying(true);
    try {
      console.log("🔄 Retrying connection...");

      // Reset boot sequence to re-attempt validation
      bootSequence.reset();

      // The RootRouterGuard will pick up the reset and re-run the boot sequence
      // This will either succeed (go to appropriate screen) or fail again (come back here)
    } catch (error) {
      console.error("💥 Retry failed:", error);
      Alert.alert(
        "Retry Failed",
        "Unable to reconnect. Please check your internet connection and try again.",
      );
    } finally {
      setRetrying(false);
    }
  };

  const handleOfflineMode = () => {
    Alert.alert(
      "Use Offline Mode",
      "You can continue using the app with limited functionality. Some features may not work without an internet connection.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Continue Offline",
          onPress: () => {
            setOfflineMode(true);
            // TODO: Implement offline mode logic
            // For now, just show a message
            Alert.alert(
              "Offline Mode",
              "Offline mode is not yet implemented. Please try reconnecting.",
            );
          },
        },
      ],
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "This will clear your session and return you to the login screen. You will need to log in again when you have internet access.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await appState.logout();
              bootSequence.reset();
            } catch (error) {
              console.error("💥 Logout failed:", error);
              Alert.alert(
                "Logout Failed",
                "Unable to logout properly. Please restart the app.",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Connection Problem</Text>
        <Text style={styles.subtitle}>
          We're having trouble connecting to our servers. This might be due to:
        </Text>

        <View style={styles.reasonsContainer}>
          <Text style={styles.reason}>• Poor internet connection</Text>
          <Text style={styles.reason}>• Server maintenance</Text>
          <Text style={styles.reason}>• Network configuration issues</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              retrying && styles.buttonDisabled,
            ]}
            onPress={handleRetry}
            disabled={retrying}
          >
            {retrying ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.buttonText}>Retrying...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Try Again</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleOfflineMode}
          >
            <Text style={styles.secondaryButtonText}>Use Offline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleLogout}
          >
            <Text style={styles.dangerButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpContainer}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            • Check your internet connection{"\n"}• Try switching between WiFi
            and mobile data{"\n"}• Restart the app if the problem persists
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  reasonsContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 8,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: "#ff9500",
  },
  reason: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    lineHeight: 20,
  },
  buttonContainer: {
    marginBottom: 30,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#007AFF",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  dangerButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ff3b30",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  dangerButtonText: {
    color: "#ff3b30",
    fontSize: 16,
    fontWeight: "600",
  },
  helpContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  helpText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
});
