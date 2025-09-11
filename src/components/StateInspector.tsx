import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
} from "react-native";
import { appState } from "../state/AppState";
import { featureFlags } from "../features/FeatureFlags";
import { bootSequence } from "../boot/BootSequence";
import { routeLogger } from "../debug/RouteLogger";

interface StateInspectorProps {
  visible: boolean;
  onClose: () => void;
}

const StateInspector: React.FC<StateInspectorProps> = ({
  visible,
  onClose,
}) => {
  const [state, setState] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshState = () => {
    const user = appState.getUser();
    const currentState = {
      isAuthenticated: appState.isAuthenticated(),
      tokenPresent: !!appState.getStoredToken(),
      onboarding_complete: user?.onboardingCompleted || false,
      category: user?.category || "none",
      registered_at: user?.registeredAt || "none",
      currentOrgId: user?.currentOrganizationId || "none",
      memberships_length: user?.organizations?.length || 0,
      featureFlags: featureFlags.getAllFlags(),
      user_id: user?.id || "none",
      phone: user?.phone || "none",
      role: user?.role || "none",
      currentRoute: routeLogger.getCurrentRoute(),
      routeHistory: routeLogger.getRouteHistory(),
    };
    setState(currentState);
  };

  useEffect(() => {
    if (visible) {
      refreshState();
    }
  }, [visible, refreshKey]);

  const handleClearStorage = () => {
    Alert.alert(
      "Clear Storage",
      "This will clear all app data and log you out. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await appState.clearAllData();
            setRefreshKey((prev) => prev + 1);
            Alert.alert("Storage Cleared", "All data has been cleared.");
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "This will log you out and clear your session. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await appState.logout();
            setRefreshKey((prev) => prev + 1);
            Alert.alert("Logged Out", "You have been logged out.");
          },
        },
      ],
    );
  };

  const handleReRunBootSequence = () => {
    Alert.alert(
      "Re-run Boot Sequence",
      "This will re-run the boot sequence and potentially change your current screen. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Re-run",
          onPress: async () => {
            try {
              await bootSequence.reset();
              const result = await bootSequence.executeBootSequence();
              console.log("🔄 Boot sequence re-run result:", result);
              setRefreshKey((prev) => prev + 1);
              Alert.alert(
                "Boot Sequence Re-run",
                `Result: ${result.step} -> ${result.target}`,
              );
            } catch (error) {
              console.error("💥 Boot sequence re-run error:", error);
              Alert.alert("Error", "Failed to re-run boot sequence");
            }
          },
        },
      ],
    );
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>State Inspector</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {state && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Authentication</Text>
                  <View style={styles.row}>
                    <Text style={styles.label}>isAuthenticated:</Text>
                    <Text
                      style={[
                        styles.value,
                        {
                          color: state.isAuthenticated ? "#4CAF50" : "#F44336",
                        },
                      ]}
                    >
                      {formatValue(state.isAuthenticated)}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>tokenPresent:</Text>
                    <Text
                      style={[
                        styles.value,
                        { color: state.tokenPresent ? "#4CAF50" : "#F44336" },
                      ]}
                    >
                      {formatValue(state.tokenPresent)}
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>User State</Text>
                  <View style={styles.row}>
                    <Text style={styles.label}>user_id:</Text>
                    <Text style={styles.value}>
                      {formatValue(state.user_id)}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>phone:</Text>
                    <Text style={styles.value}>{formatValue(state.phone)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>role:</Text>
                    <Text style={styles.value}>{formatValue(state.role)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>onboarding_complete:</Text>
                    <Text
                      style={[
                        styles.value,
                        {
                          color: state.onboarding_complete
                            ? "#4CAF50"
                            : "#FF9800",
                        },
                      ]}
                    >
                      {formatValue(state.onboarding_complete)}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>category:</Text>
                    <Text style={styles.value}>
                      {formatValue(state.category)}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>registered_at:</Text>
                    <Text style={styles.value}>
                      {formatValue(state.registered_at)}
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Organization</Text>
                  <View style={styles.row}>
                    <Text style={styles.label}>currentOrgId:</Text>
                    <Text style={styles.value}>
                      {formatValue(state.currentOrgId)}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>memberships.length:</Text>
                    <Text style={styles.value}>
                      {formatValue(state.memberships_length)}
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Feature Flags</Text>
                  {Object.entries(state.featureFlags).map(([key, value]) => (
                    <View key={key} style={styles.row}>
                      <Text style={styles.label}>{key}:</Text>
                      <Text
                        style={[
                          styles.value,
                          { color: value ? "#4CAF50" : "#F44336" },
                        ]}
                      >
                        {formatValue(value)}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Navigation</Text>
                  <View style={styles.row}>
                    <Text style={styles.label}>currentRoute:</Text>
                    <Text style={styles.value}>
                      {formatValue(state.currentRoute)}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>routeHistory.length:</Text>
                    <Text style={styles.value}>
                      {formatValue(state.routeHistory?.length || 0)}
                    </Text>
                  </View>
                </View>
              </>
            )}

            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>Dev Actions</Text>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleClearStorage}
              >
                <Text style={styles.actionButtonText}>🗑️ Clear Storage</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleLogout}
              >
                <Text style={styles.actionButtonText}>🚪 Logout</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleReRunBootSequence}
              >
                <Text style={styles.actionButtonText}>
                  🔄 Re-run Boot Sequence
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.refreshButton]}
                onPress={() => setRefreshKey((prev) => prev + 1)}
              >
                <Text style={styles.actionButtonText}>🔄 Refresh State</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => routeLogger.printRouteHistory()}
              >
                <Text style={styles.actionButtonText}>
                  📋 Print Route History
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => routeLogger.clearHistory()}
              >
                <Text style={styles.actionButtonText}>
                  🧹 Clear Route History
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: width * 0.9,
    maxHeight: height * 0.8,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#2a2a2a",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#444",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    paddingVertical: 4,
  },
  label: {
    fontSize: 14,
    color: "#ccc",
    flex: 1,
    marginRight: 8,
  },
  value: {
    fontSize: 14,
    color: "#fff",
    flex: 1,
    textAlign: "right",
    fontFamily: "monospace",
  },
  actionsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  actionButton: {
    backgroundColor: "#333",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  refreshButton: {
    backgroundColor: "#2196F3",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default StateInspector;
