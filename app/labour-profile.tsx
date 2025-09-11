import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { employeeService, Employee } from "../src/services/EmployeeService";
import {
  punchService,
  SalaryInfo,
  ShiftInfo,
} from "../src/services/PunchService";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

export default function LabourProfileScreen() {
  const { employeeId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [salaryInfo, setSalaryInfo] = useState<SalaryInfo | null>(null);
  const [shiftInfo, setShiftInfo] = useState<ShiftInfo | null>(null);

  useEffect(() => {
    loadEmployeeProfile();
  }, [employeeId]);

  const loadEmployeeProfile = async () => {
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

      // Load salary and shift info
      const salaryData = await punchService.getSalaryInfo(employeeId as string);
      const shiftData = await punchService.getShiftInfo(employeeId as string);

      setSalaryInfo(salaryData);
      setShiftInfo(shiftData);

      // Track profile view
      analytics.track({
        event: "labour_profile_viewed",
        properties: {
          employeeId: employeeId as string,
          employeeName: empData.name,
          category: empData.category,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error loading employee profile:", error);
      Alert.alert("Error", "Failed to load employee profile");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEmployeeProfile();
    setRefreshing(false);
  };

  const formatTime = (timeString: string): string => {
    return new Date(timeString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes: number): string => {
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = minutes % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <AuthenticatedLayout title="Labour Profile">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  if (!employee) {
    return (
      <AuthenticatedLayout title="Labour Profile">
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Employee not found</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout title="Labour Profile">
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Employee Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerInfo}>
            <Text style={styles.employeeName}>{employee.name}</Text>
            <Text style={styles.employeeCode}>Code: {employee.code}</Text>
            <Text style={styles.employeeCategory}>
              {employee.category.charAt(0).toUpperCase() +
                employee.category.slice(1)}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              employee.status === "active"
                ? styles.activeBadge
                : employee.status === "pending"
                  ? styles.pendingBadge
                  : styles.inactiveBadge,
            ]}
          >
            <Text style={styles.statusText}>
              {employee.status === "active"
                ? "Active"
                : employee.status === "pending"
                  ? "Pending"
                  : "Inactive"}
            </Text>
          </View>
        </View>

        {/* Salary Information */}
        {salaryInfo && (
          <View style={styles.salaryCard}>
            <Text style={styles.cardTitle}>Salary Information</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Wage Rate:</Text>
              <Text style={styles.infoValue}>₹{employee.wageBase}/hour</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Salary Start:</Text>
              <Text style={styles.infoValue}>
                {formatTime(salaryInfo.salaryStartAt)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Time Since Start:</Text>
              <Text style={styles.infoValue}>
                {formatDuration(salaryInfo.timeSinceStart)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>OT Policy:</Text>
              <Text style={styles.infoValue}>
                {employee.otPolicy === "none"
                  ? "None"
                  : employee.otPolicy === "1.5x"
                    ? "1.5x after regular hours"
                    : "2x after regular hours"}
              </Text>
            </View>

            {employee.incentives && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Incentives:</Text>
                <Text style={styles.infoValue}>{employee.incentives}</Text>
              </View>
            )}
          </View>
        )}

        {/* Current Pay Cycle */}
        {salaryInfo && (
          <View style={styles.payCycleCard}>
            <Text style={styles.cardTitle}>Current Pay Cycle</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Period:</Text>
              <Text style={styles.infoValue}>
                {new Date(
                  salaryInfo.currentPayCycle.startDate,
                ).toLocaleDateString()}{" "}
                -{" "}
                {new Date(
                  salaryInfo.currentPayCycle.endDate,
                ).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Hours:</Text>
              <Text style={styles.infoValue}>
                {salaryInfo.currentPayCycle.totalHours.toFixed(2)}h
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Earnings:</Text>
              <Text style={[styles.infoValue, styles.earningsValue]}>
                {formatCurrency(salaryInfo.currentPayCycle.totalEarnings)}
              </Text>
            </View>
          </View>
        )}

        {/* Current Shift */}
        {shiftInfo?.currentShift && (
          <View style={styles.shiftCard}>
            <Text style={styles.cardTitle}>Current Shift</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Punch In:</Text>
              <Text style={styles.infoValue}>
                {new Date(
                  shiftInfo.currentShift.punchInTime,
                ).toLocaleTimeString()}
              </Text>
            </View>

            {shiftInfo.currentShift.punchOutTime && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Punch Out:</Text>
                <Text style={styles.infoValue}>
                  {new Date(
                    shiftInfo.currentShift.punchOutTime,
                  ).toLocaleTimeString()}
                </Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Duration:</Text>
              <Text style={styles.infoValue}>
                {shiftInfo.currentShift.duration
                  ? formatDuration(shiftInfo.currentShift.duration)
                  : "In Progress"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text
                style={[
                  styles.infoValue,
                  shiftInfo.currentShift.isActive
                    ? styles.activeStatus
                    : styles.inactiveStatus,
                ]}
              >
                {shiftInfo.currentShift.isActive ? "Active" : "Completed"}
              </Text>
            </View>
          </View>
        )}

        {/* Time Summary */}
        {shiftInfo && (
          <View style={styles.timeCard}>
            <Text style={styles.cardTitle}>Time Summary</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Today:</Text>
              <Text style={styles.infoValue}>
                {shiftInfo.totalHoursToday.toFixed(2)}h
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>This Week:</Text>
              <Text style={styles.infoValue}>
                {shiftInfo.totalHoursThisWeek.toFixed(2)}h
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>This Month:</Text>
              <Text style={styles.infoValue}>
                {shiftInfo.totalHoursThisMonth.toFixed(2)}h
              </Text>
            </View>
          </View>
        )}

        {/* Employee Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Employee Details</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date of Joining:</Text>
            <Text style={styles.infoValue}>
              {new Date(employee.doj).toLocaleDateString()}
            </Text>
          </View>

          {employee.mobile && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mobile:</Text>
              <Text style={styles.infoValue}>{employee.mobile}</Text>
            </View>
          )}

          {employee.acknowledgedAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Acknowledged:</Text>
              <Text style={styles.infoValue}>
                {formatTime(employee.acknowledgedAt)}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/punch-card?employeeId=${employee.id}`)}
          >
            <Text style={styles.actionButtonText}>View Punch Card</Text>
          </TouchableOpacity>
        </View>
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
  headerCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
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
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeBadge: {
    backgroundColor: "#4CAF50",
  },
  pendingBadge: {
    backgroundColor: "#FF9800",
  },
  inactiveBadge: {
    backgroundColor: "#666",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  salaryCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  payCycleCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  shiftCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  timeCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  detailsCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  infoLabel: {
    fontSize: 14,
    color: "#999",
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  earningsValue: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
  activeStatus: {
    color: "#4CAF50",
  },
  inactiveStatus: {
    color: "#999",
  },
  actionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
