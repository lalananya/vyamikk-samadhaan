import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  punchService,
  PunchRecord,
  ShiftInfo,
} from "../src/services/PunchService";
import { employeeService, Employee } from "../src/services/EmployeeService";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

export default function PunchCardScreen() {
  const { employeeId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [shiftInfo, setShiftInfo] = useState<ShiftInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEmployeeData();
    // Start sync interval for offline punches
    punchService.startSyncInterval();
  }, [employeeId]);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);

      if (!employeeId) {
        Alert.alert("Error", "Employee ID not provided");
        router.replace("/employees");
        return;
      }

      const empData = await employeeService.getEmployee(employeeId as string);
      if (!empData) {
        Alert.alert("Error", "Employee not found");
        router.replace("/employees");
        return;
      }

      setEmployee(empData);

      // Check if employee is acknowledged
      if (empData.status !== "active") {
        Alert.alert(
          "Not Available",
          "Employee must be acknowledged before using punch card",
          [{ text: "OK", onPress: () => router.replace("/employees") }],
        );
        return;
      }

      const shiftData = await punchService.getShiftInfo(employeeId as string);
      setShiftInfo(shiftData);

      // Track punch card view
      analytics.track({
        event: "punch_card_viewed",
        properties: {
          employeeId: employeeId as string,
          employeeName: empData.name,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error loading employee data:", error);
      Alert.alert("Error", "Failed to load employee data");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEmployeeData();
    setRefreshing(false);
  };

  const handlePunchIn = async () => {
    if (!employee) return;

    try {
      setPunching(true);

      const result = await punchService.punchIn(employee.id);

      if (result.success) {
        Alert.alert("Success", "Punched in successfully");
        await loadEmployeeData(); // Refresh data
      } else {
        Alert.alert("Error", result.error || "Failed to punch in");
      }
    } catch (error) {
      console.error("Error punching in:", error);
      Alert.alert("Error", "Failed to punch in");
    } finally {
      setPunching(false);
    }
  };

  const handlePunchOut = async () => {
    if (!employee) return;

    try {
      setPunching(true);

      const result = await punchService.punchOut(employee.id);

      if (result.success) {
        Alert.alert("Success", "Punched out successfully");
        await loadEmployeeData(); // Refresh data
      } else {
        Alert.alert("Error", result.error || "Failed to punch out");
      }
    } catch (error) {
      console.error("Error punching out:", error);
      Alert.alert("Error", "Failed to punch out");
    } finally {
      setPunching(false);
    }
  };

  const formatTime = (timeString: string): string => {
    return new Date(timeString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <AuthenticatedLayout title="Punch Card">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading punch card...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  if (!employee || !shiftInfo) {
    return (
      <AuthenticatedLayout title="Punch Card">
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Unable to load punch card</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout title="Punch Card">
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Employee Info */}
        <View style={styles.employeeCard}>
          <Text style={styles.employeeName}>{employee.name}</Text>
          <Text style={styles.employeeCode}>Code: {employee.code}</Text>
          <Text style={styles.employeeCategory}>
            {employee.category.charAt(0).toUpperCase() +
              employee.category.slice(1)}
          </Text>
          <Text style={styles.wageRate}>₹{employee.wageBase}/hour</Text>
        </View>

        {/* Current Shift */}
        {shiftInfo.currentShift && (
          <View style={styles.shiftCard}>
            <Text style={styles.shiftTitle}>Current Shift</Text>
            <View style={styles.shiftDetails}>
              <View style={styles.shiftRow}>
                <Text style={styles.shiftLabel}>Punch In:</Text>
                <Text style={styles.shiftValue}>
                  {formatTime(shiftInfo.currentShift.punchInTime)}
                </Text>
              </View>
              {shiftInfo.currentShift.punchOutTime && (
                <View style={styles.shiftRow}>
                  <Text style={styles.shiftLabel}>Punch Out:</Text>
                  <Text style={styles.shiftValue}>
                    {formatTime(shiftInfo.currentShift.punchOutTime)}
                  </Text>
                </View>
              )}
              <View style={styles.shiftRow}>
                <Text style={styles.shiftLabel}>Duration:</Text>
                <Text style={styles.shiftValue}>
                  {shiftInfo.currentShift.duration
                    ? formatDuration(shiftInfo.currentShift.duration)
                    : "In Progress"}
                </Text>
              </View>
              <View style={styles.shiftRow}>
                <Text style={styles.shiftLabel}>Status:</Text>
                <Text
                  style={[
                    styles.shiftValue,
                    shiftInfo.currentShift.isActive
                      ? styles.activeStatus
                      : styles.inactiveStatus,
                  ]}
                >
                  {shiftInfo.currentShift.isActive ? "Active" : "Completed"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Punch Buttons */}
        <View style={styles.punchContainer}>
          {shiftInfo.currentShift?.isActive ? (
            <TouchableOpacity
              style={[styles.punchButton, styles.punchOutButton]}
              onPress={handlePunchOut}
              disabled={punching}
            >
              {punching ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.punchButtonText}>Punch Out</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.punchButton, styles.punchInButton]}
              onPress={handlePunchIn}
              disabled={punching}
            >
              {punching ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.punchButtonText}>Punch In</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Today's Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Today's Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Hours:</Text>
            <Text style={styles.summaryValue}>
              {shiftInfo.totalHoursToday.toFixed(2)}h
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Punches:</Text>
            <Text style={styles.summaryValue}>
              {shiftInfo.todayPunches.length}
            </Text>
          </View>
        </View>

        {/* Weekly Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>This Week</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Hours:</Text>
            <Text style={styles.summaryValue}>
              {shiftInfo.totalHoursThisWeek.toFixed(2)}h
            </Text>
          </View>
        </View>

        {/* Monthly Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>This Month</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Hours:</Text>
            <Text style={styles.summaryValue}>
              {shiftInfo.totalHoursThisMonth.toFixed(2)}h
            </Text>
          </View>
        </View>

        {/* Today's Punches */}
        {shiftInfo.todayPunches.length > 0 && (
          <View style={styles.punchesCard}>
            <Text style={styles.punchesTitle}>Today's Punches</Text>
            {shiftInfo.todayPunches.map((punch, index) => (
              <View key={punch.id} style={styles.punchRow}>
                <View style={styles.punchInfo}>
                  <Text style={styles.punchType}>
                    {punch.type === "in" ? "Punch In" : "Punch Out"}
                  </Text>
                  <Text style={styles.punchTime}>
                    {formatTime(punch.clientTime)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.punchStatus,
                    punch.status === "synced"
                      ? styles.syncedStatus
                      : styles.pendingStatus,
                  ]}
                >
                  <Text style={styles.punchStatusText}>
                    {punch.status === "synced" ? "Synced" : "Pending"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </AuthenticatedLayout>
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
    paddingHorizontal: 24,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 12,
  },
  errorText: {
    color: "#ff4444",
    fontSize: 16,
    textAlign: "center",
  },
  employeeCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    alignItems: "center",
  },
  employeeName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  employeeCode: {
    fontSize: 14,
    color: "#999",
    marginBottom: 2,
  },
  employeeCategory: {
    fontSize: 14,
    color: "#007AFF",
    marginBottom: 8,
  },
  wageRate: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4CAF50",
  },
  shiftCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  shiftTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  shiftDetails: {
    gap: 8,
  },
  shiftRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  shiftLabel: {
    fontSize: 14,
    color: "#999",
  },
  shiftValue: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
  },
  activeStatus: {
    color: "#4CAF50",
  },
  inactiveStatus: {
    color: "#999",
  },
  punchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  punchButton: {
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
  },
  punchInButton: {
    backgroundColor: "#4CAF50",
  },
  punchOutButton: {
    backgroundColor: "#ff4444",
  },
  punchButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  summaryCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#999",
  },
  summaryValue: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
  },
  punchesCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  punchesTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  punchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  punchInfo: {
    flex: 1,
  },
  punchType: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
  },
  punchTime: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  punchStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncedStatus: {
    backgroundColor: "#4CAF50",
  },
  pendingStatus: {
    backgroundColor: "#FF9800",
  },
  punchStatusText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
});
