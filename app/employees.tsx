import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import {
  employeeService,
  Employee,
  BulkEmployeeData,
} from "../src/services/EmployeeService";
import { appState } from "../src/state/AppState";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

const CATEGORY_LABELS = {
  labour: "Labour",
  supervisor: "Supervisor",
  accountant: "Accountant",
};

const OT_POLICY_LABELS = {
  none: "None",
  "1.5x": "1.5x",
  "2x": "2x",
};

export default function EmployeesScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newEmployee, setNewEmployee] = useState({
    name: "",
    mobile: "",
    code: "",
    category: "labour" as "labour" | "supervisor" | "accountant",
    wageBase: "",
    otPolicy: "none" as "none" | "1.5x" | "2x",
    incentives: "",
    doj: new Date().toISOString().split("T")[0],
  });

  const [bulkData, setBulkData] = useState("");

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentOrgId = appState.getCurrentOrganizationId();
      if (!currentOrgId) {
        setError("No organization selected");
        return;
      }

      const empData = await employeeService.getEmployees(currentOrgId);
      setEmployees(empData);

      // Track employees view
      analytics.track({
        event: "employees_viewed",
        properties: {
          organizationId: currentOrgId,
          employeeCount: empData.length,
        },
        timestamp: new Date(),
      });
    } catch (err: any) {
      console.error("Failed to load employees:", err);
      setError(err.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEmployees();
    setRefreshing(false);
  };

  const handleAddEmployee = async () => {
    try {
      if (!newEmployee.name || !newEmployee.code) {
        Alert.alert("Required Fields", "Please fill in employee name and code");
        return;
      }

      const currentOrgId = appState.getCurrentOrganizationId();
      if (!currentOrgId) {
        Alert.alert("Error", "No organization selected");
        return;
      }

      const employee = await employeeService.addEmployee({
        organizationId: currentOrgId,
        name: newEmployee.name,
        mobile: newEmployee.mobile || undefined,
        code: newEmployee.code,
        category: newEmployee.category,
        wageBase: parseFloat(newEmployee.wageBase) || 0,
        otPolicy: newEmployee.otPolicy,
        incentives: newEmployee.incentives || undefined,
        doj: newEmployee.doj,
        createdBy: appState.getUser()?.id || "unknown",
      });

      setEmployees((prev) => [...prev, employee]);
      setShowAddModal(false);
      setNewEmployee({
        name: "",
        mobile: "",
        code: "",
        category: "labour",
        wageBase: "",
        otPolicy: "none",
        incentives: "",
        doj: new Date().toISOString().split("T")[0],
      });

      Alert.alert("Success", "Employee added successfully");
    } catch (error: any) {
      console.error("Error adding employee:", error);
      Alert.alert("Error", error.message || "Failed to add employee");
    }
  };

  const handleBulkAdd = async () => {
    try {
      if (!bulkData.trim()) {
        Alert.alert("Required", "Please enter CSV data");
        return;
      }

      const currentOrgId = appState.getCurrentOrganizationId();
      if (!currentOrgId) {
        Alert.alert("Error", "No organization selected");
        return;
      }

      const employeesData = employeeService.parseCSVData(bulkData);
      if (employeesData.length === 0) {
        Alert.alert("Error", "No valid employee data found");
        return;
      }

      const result = await employeeService.bulkAddEmployees(
        currentOrgId,
        employeesData,
        appState.getUser()?.id || "unknown",
      );

      setEmployees((prev) => [...prev, ...result.success]);
      setShowBulkModal(false);
      setBulkData("");

      Alert.alert(
        "Bulk Add Complete",
        `Successfully added ${result.success.length} employees. ${result.failed.length} failed.`,
      );
    } catch (error: any) {
      console.error("Error bulk adding employees:", error);
      Alert.alert("Error", error.message || "Failed to bulk add employees");
    }
  };

  const handleResendInvite = async (employeeId: string) => {
    try {
      const result = await employeeService.resendInvite(employeeId);
      if (result.success) {
        Alert.alert("Success", "Invite resent successfully");
      } else {
        Alert.alert("Error", result.error || "Failed to resend invite");
      }
    } catch (error: any) {
      console.error("Error resending invite:", error);
      Alert.alert("Error", "Failed to resend invite");
    }
  };

  const downloadTemplate = () => {
    const template = employeeService.generateCSVTemplate();
    Alert.alert(
      "CSV Template",
      "Copy this template and fill in your employee data:\n\n" + template,
      [{ text: "OK" }],
    );
  };

  const renderEmployee = ({ item }: { item: Employee }) => (
    <View style={styles.employeeCard}>
      <View style={styles.employeeHeader}>
        <Text style={styles.employeeName}>{item.name}</Text>
        <View
          style={[
            styles.statusBadge,
            item.status === "active"
              ? styles.statusActive
              : item.status === "pending"
                ? styles.statusPending
                : styles.statusInactive,
          ]}
        >
          <Text style={styles.statusText}>
            {item.status === "active"
              ? "Active"
              : item.status === "pending"
                ? "Pending"
                : "Inactive"}
          </Text>
        </View>
      </View>

      <View style={styles.employeeDetails}>
        <Text style={styles.employeeDetail}>Code: {item.code}</Text>
        <Text style={styles.employeeDetail}>
          Category: {CATEGORY_LABELS[item.category]}
        </Text>
        <Text style={styles.employeeDetail}>Wage: ₹{item.wageBase}/hr</Text>
        <Text style={styles.employeeDetail}>
          OT: {OT_POLICY_LABELS[item.otPolicy]}
        </Text>
        {item.mobile && (
          <Text style={styles.employeeDetail}>Mobile: {item.mobile}</Text>
        )}
        {item.incentives && (
          <Text style={styles.employeeDetail}>
            Incentives: {item.incentives}
          </Text>
        )}
      </View>

      {item.status === "pending" && (
        <View style={styles.pendingActions}>
          <Text style={styles.pendingText}>Awaiting acknowledgement</Text>
          <TouchableOpacity
            style={styles.resendButton}
            onPress={() => handleResendInvite(item.id)}
          >
            <Text style={styles.resendButtonText}>Resend Invite</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === "active" && (
        <View style={styles.activeActions}>
          <TouchableOpacity
            style={styles.punchCardButton}
            onPress={() => router.push(`/punch-card?employeeId=${item.id}`)}
          >
            <Text style={styles.punchCardButtonText}>Punch Card</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push(`/labour-profile?employeeId=${item.id}`)}
          >
            <Text style={styles.profileButtonText}>Profile</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <AuthenticatedLayout title="Employees">
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading employees...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout title="Employees">
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Employee</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bulkButton}
          onPress={() => setShowBulkModal(true)}
        >
          <Text style={styles.bulkButtonText}>Bulk Add</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadEmployees}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={employees}
        renderItem={renderEmployee}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No employees yet</Text>
            <Text style={styles.emptySubtext}>
              Add employees to get started with workforce management
            </Text>
          </View>
        }
      />

      {/* Add Employee Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Employee</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={newEmployee.name}
                onChangeText={(text) =>
                  setNewEmployee((prev) => ({ ...prev, name: text }))
                }
                placeholder="Enter employee name"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile (Optional)</Text>
              <TextInput
                style={styles.input}
                value={newEmployee.mobile}
                onChangeText={(text) =>
                  setNewEmployee((prev) => ({ ...prev, mobile: text }))
                }
                placeholder="+91 9876543210"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Employee Code *</Text>
              <TextInput
                style={styles.input}
                value={newEmployee.code}
                onChangeText={(text) =>
                  setNewEmployee((prev) => ({ ...prev, code: text }))
                }
                placeholder="EMP001"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category *</Text>
              <View style={styles.categoryContainer}>
                {(["labour", "supervisor", "accountant"] as const).map(
                  (category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryOption,
                        newEmployee.category === category &&
                          styles.categoryOptionSelected,
                      ]}
                      onPress={() =>
                        setNewEmployee((prev) => ({ ...prev, category }))
                      }
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          newEmployee.category === category &&
                            styles.categoryTextSelected,
                        ]}
                      >
                        {CATEGORY_LABELS[category]}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Wage Base (₹/hr) *</Text>
              <TextInput
                style={styles.input}
                value={newEmployee.wageBase}
                onChangeText={(text) =>
                  setNewEmployee((prev) => ({ ...prev, wageBase: text }))
                }
                placeholder="200"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>OT Policy *</Text>
              <View style={styles.otContainer}>
                {(["none", "1.5x", "2x"] as const).map((policy) => (
                  <TouchableOpacity
                    key={policy}
                    style={[
                      styles.otOption,
                      newEmployee.otPolicy === policy &&
                        styles.otOptionSelected,
                    ]}
                    onPress={() =>
                      setNewEmployee((prev) => ({ ...prev, otPolicy: policy }))
                    }
                  >
                    <Text
                      style={[
                        styles.otText,
                        newEmployee.otPolicy === policy &&
                          styles.otTextSelected,
                      ]}
                    >
                      {OT_POLICY_LABELS[policy]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Incentives (Optional)</Text>
              <TextInput
                style={styles.input}
                value={newEmployee.incentives}
                onChangeText={(text) =>
                  setNewEmployee((prev) => ({ ...prev, incentives: text }))
                }
                placeholder="Performance bonus, etc."
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Joining *</Text>
              <TextInput
                style={styles.input}
                value={newEmployee.doj}
                onChangeText={(text) =>
                  setNewEmployee((prev) => ({ ...prev, doj: text }))
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#666"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAddEmployee}
            >
              <Text style={styles.saveButtonText}>Add Employee</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bulk Add Modal */}
      <Modal
        visible={showBulkModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bulk Add Employees</Text>
            <TouchableOpacity onPress={() => setShowBulkModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.templateSection}>
              <Text style={styles.sectionTitle}>CSV Template</Text>
              <TouchableOpacity
                style={styles.templateButton}
                onPress={downloadTemplate}
              >
                <Text style={styles.templateButtonText}>Download Template</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>CSV Data *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bulkData}
                onChangeText={setBulkData}
                placeholder="Paste your CSV data here..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={10}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.noteContainer}>
              <Text style={styles.noteText}>
                Note: CA/Lawyer/Advocate/Professional employees cannot be added
                via this method. Use Services for external professionals.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowBulkModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleBulkAdd}>
              <Text style={styles.saveButtonText}>Bulk Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  addButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  bulkButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  bulkButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorCard: {
    backgroundColor: "#ff4444",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  errorText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  retryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
  },
  employeeCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  employeeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: "#4CAF50",
  },
  statusPending: {
    backgroundColor: "#FF9800",
  },
  statusInactive: {
    backgroundColor: "#666",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  employeeDetails: {
    marginBottom: 12,
  },
  employeeDetail: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 4,
  },
  pendingActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  pendingText: {
    fontSize: 12,
    color: "#FF9800",
    flex: 1,
  },
  resendButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resendButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  activeActions: {
    flexDirection: "row",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#333",
    gap: 8,
  },
  punchCardButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
  },
  punchCardButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  profileButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
  },
  profileButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    color: "#fff",
    fontSize: 18,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  categoryContainer: {
    flexDirection: "row",
    gap: 8,
  },
  categoryOption: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  categoryOptionSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#001a33",
  },
  categoryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  categoryTextSelected: {
    color: "#007AFF",
  },
  otContainer: {
    flexDirection: "row",
    gap: 8,
  },
  otOption: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  otOptionSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#001a33",
  },
  otText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  otTextSelected: {
    color: "#007AFF",
  },
  templateSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  templateButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  templateButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  noteContainer: {
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  noteText: {
    color: "#ccc",
    fontSize: 12,
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
