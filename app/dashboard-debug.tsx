import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { DebugApiClient } from "../src/api/debug";
import { getToken } from "../src/auth";

export default function DashboardDebug() {
  const [user, setUser] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get stored token
      const token = await getToken();
      if (!token) {
        throw new Error("No token found - please login again");
      }

      console.log(
        "🔍 Loading dashboard data with token:",
        token.substring(0, 20) + "...",
      );

      // Load user profile
      const profile = await DebugApiClient.getProfile(token);
      setUser(profile.user);

      // Load dashboard data
      const dashboard = await DebugApiClient.getDashboard(token);
      setDashboardData(dashboard);

      console.log("✅ Dashboard data loaded successfully");
    } catch (e: any) {
      console.error("❌ Dashboard load failed:", e);
      setError(e.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      await DebugApiClient.testConnection();
      Alert.alert("Success", "Connection test passed");
    } catch (e: any) {
      Alert.alert("Connection Test Failed", e.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading Dashboard...</Text>
        <Text style={styles.subtitle}>Please wait while we load your data</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Dashboard Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={loadDashboardData}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={testConnection}>
          <Text style={styles.buttonText}>Test Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Dashboard Debug</Text>

      {/* User Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Info</Text>
        <Text style={styles.infoText}>Phone: {user?.phone || "N/A"}</Text>
        <Text style={styles.infoText}>Role: {user?.role || "N/A"}</Text>
        <Text style={styles.infoText}>
          Onboarding: {user?.onboardingCompleted ? "Complete" : "Incomplete"}
        </Text>
        <Text style={styles.infoText}>VPI ID: {user?.vpiId || "N/A"}</Text>
      </View>

      {/* Dashboard Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dashboard Stats</Text>
        {dashboardData?.stats ? (
          <>
            <Text style={styles.infoText}>
              Total Work: {dashboardData.stats.totalWork}
            </Text>
            <Text style={styles.infoText}>
              Completed Tasks: {dashboardData.stats.completedTasks}
            </Text>
            <Text style={styles.infoText}>
              Pending Approvals: {dashboardData.stats.pendingApprovals}
            </Text>
            <Text style={styles.infoText}>
              Trust Score: {dashboardData.stats.trustScore}
            </Text>
          </>
        ) : (
          <Text style={styles.errorText}>No stats data available</Text>
        )}
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {dashboardData?.recentActivity?.length > 0 ? (
          dashboardData.recentActivity.map((activity: any, index: number) => (
            <Text key={index} style={styles.infoText}>
              • {JSON.stringify(activity)}
            </Text>
          ))
        ) : (
          <Text style={styles.infoText}>No recent activity</Text>
        )}
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        {dashboardData?.notifications?.length > 0 ? (
          dashboardData.notifications.map(
            (notification: any, index: number) => (
              <Text key={index} style={styles.infoText}>
                • {JSON.stringify(notification)}
              </Text>
            ),
          )
        ) : (
          <Text style={styles.infoText}>No notifications</Text>
        )}
      </View>

      {/* Debug Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Debug Actions</Text>
        <TouchableOpacity style={styles.button} onPress={loadDashboardData}>
          <Text style={styles.buttonText}>Reload Data</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={testConnection}>
          <Text style={styles.buttonText}>Test Connection</Text>
        </TouchableOpacity>
      </View>

      {/* Raw Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Raw Dashboard Data</Text>
        <Text style={styles.rawText}>
          {JSON.stringify(dashboardData, null, 2)}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#ccc",
    marginBottom: 20,
  },
  section: {
    backgroundColor: "#111",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: "#fff",
    marginBottom: 5,
  },
  errorText: {
    fontSize: 14,
    color: "#ff6b6b",
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  rawText: {
    fontSize: 10,
    color: "#9acdff",
    fontFamily: "monospace",
  },
});
