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
  machineIssueService,
  MachineIssue,
  IssueStats,
} from "../src/services/MachineIssueService";
import { appState } from "../src/state/AppState";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

const PROBLEM_TYPES = [
  { value: "mechanical", label: "Mechanical" },
  { value: "electrical", label: "Electrical" },
  { value: "safety", label: "Safety" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

const URGENCY_LEVELS = [
  { value: "low", label: "Low", color: "#4CAF50" },
  { value: "medium", label: "Medium", color: "#ff9800" },
  { value: "high", label: "High", color: "#ff4444" },
];

export default function MachineIssuesScreen() {
  const [issues, setIssues] = useState<MachineIssue[]>([]);
  const [stats, setStats] = useState<IssueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newIssue, setNewIssue] = useState({
    machineName: "",
    machineId: "",
    problemType: "mechanical" as
      | "mechanical"
      | "electrical"
      | "safety"
      | "maintenance"
      | "other",
    description: "",
    urgency: "medium" as "low" | "medium" | "high",
  });

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentOrgId = appState.getCurrentOrganizationId();
      if (!currentOrgId) {
        setError("No organization selected");
        return;
      }

      const user = appState.getUser();
      if (!user) {
        setError("User not found");
        return;
      }

      // Load user's own issues
      const userIssues = await machineIssueService.getMyIssues(
        user.id,
        currentOrgId,
      );
      setIssues(userIssues);

      // Load stats for the organization
      const issueStats = await machineIssueService.getIssueStats(currentOrgId);
      setStats(issueStats);

      // Track issues view
      analytics.track({
        event: "machine_issues_viewed",
        properties: {
          organizationId: currentOrgId,
          issueCount: userIssues.length,
        },
        timestamp: new Date(),
      });
    } catch (err: any) {
      console.error("Failed to load issues:", err);
      setError(err.message || "Failed to load issues");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIssues();
    setRefreshing(false);
  };

  const handleCreateIssue = async () => {
    try {
      if (!newIssue.machineName || !newIssue.description) {
        Alert.alert(
          "Required Fields",
          "Please fill in machine name and description",
        );
        return;
      }

      const currentOrgId = appState.getCurrentOrganizationId();
      const user = appState.getUser();
      if (!currentOrgId || !user) {
        Alert.alert("Error", "No organization or user found");
        return;
      }

      const issue = await machineIssueService.createIssue({
        organizationId: currentOrgId,
        createdBy: user.id,
        createdByName: user.phone, // Using phone as name for now
        machineName: newIssue.machineName,
        machineId: newIssue.machineId || newIssue.machineName,
        problemType: newIssue.problemType,
        description: newIssue.description,
        urgency: newIssue.urgency,
      });

      setIssues((prev) => [issue, ...prev]);
      setShowCreateModal(false);
      setNewIssue({
        machineName: "",
        machineId: "",
        problemType: "mechanical",
        description: "",
        urgency: "medium",
      });

      Alert.alert("Success", "Issue created successfully");
    } catch (error: any) {
      console.error("Error creating issue:", error);
      Alert.alert("Error", error.message || "Failed to create issue");
    }
  };

  const renderIssue = ({ item }: { item: MachineIssue }) => (
    <View style={styles.issueCard}>
      <View style={styles.issueHeader}>
        <Text style={styles.machineName}>{item.machineName}</Text>
        <View
          style={[
            styles.urgencyBadge,
            {
              backgroundColor: machineIssueService.getUrgencyColor(
                item.urgency,
              ),
            },
          ]}
        >
          <Text style={styles.urgencyText}>
            {machineIssueService.getUrgencyLabel(item.urgency)}
          </Text>
        </View>
      </View>

      <View style={styles.issueDetails}>
        <Text style={styles.problemType}>
          {machineIssueService.getProblemTypeLabel(item.problemType)}
        </Text>
        <Text style={styles.description}>{item.description}</Text>
        <Text style={styles.createdAt}>
          Created: {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>

      <View style={styles.issueFooter}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: machineIssueService.getStatusColor(item.status),
            },
          ]}
        >
          <Text style={styles.statusText}>
            {machineIssueService.getStatusLabel(item.status)}
          </Text>
        </View>

        {item.assignedToName && (
          <Text style={styles.assignedTo}>
            Assigned to: {item.assignedToName}
          </Text>
        )}
      </View>

      {item.notes.length > 0 && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesTitle}>Notes:</Text>
          {item.notes.slice(-2).map((note, index) => (
            <Text key={index} style={styles.noteText}>
              {note.note} - {note.addedByName}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <AuthenticatedLayout title="Machine Issues">
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading issues...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout title="Machine Issues">
      {/* Stats Header */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#ff4444" }]}>
              {stats.open}
            </Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#ff9800" }]}>
              {stats.in_progress}
            </Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#4CAF50" }]}>
              {stats.resolved}
            </Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </View>
      )}

      {/* Create Issue Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createButtonText}>+ Create Issue</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadIssues}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={issues}
        renderItem={renderIssue}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No issues yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first machine issue to get started
            </Text>
          </View>
        }
      />

      {/* Create Issue Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Machine Issue</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Machine Name *</Text>
              <TextInput
                style={styles.input}
                value={newIssue.machineName}
                onChangeText={(text) =>
                  setNewIssue((prev) => ({ ...prev, machineName: text }))
                }
                placeholder="Enter machine name"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Machine ID (Optional)</Text>
              <TextInput
                style={styles.input}
                value={newIssue.machineId}
                onChangeText={(text) =>
                  setNewIssue((prev) => ({ ...prev, machineId: text }))
                }
                placeholder="Enter machine ID"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Problem Type *</Text>
              <View style={styles.typeContainer}>
                {PROBLEM_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeOption,
                      newIssue.problemType === type.value &&
                        styles.typeOptionSelected,
                    ]}
                    onPress={() =>
                      setNewIssue((prev) => ({
                        ...prev,
                        problemType: type.value as any,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.typeText,
                        newIssue.problemType === type.value &&
                          styles.typeTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newIssue.description}
                onChangeText={(text) =>
                  setNewIssue((prev) => ({ ...prev, description: text }))
                }
                placeholder="Describe the problem in detail"
                placeholderTextColor="#666"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Urgency *</Text>
              <View style={styles.urgencyContainer}>
                {URGENCY_LEVELS.map((urgency) => (
                  <TouchableOpacity
                    key={urgency.value}
                    style={[
                      styles.urgencyOption,
                      { borderColor: urgency.color },
                      newIssue.urgency === urgency.value && {
                        backgroundColor: urgency.color + "20",
                      },
                    ]}
                    onPress={() =>
                      setNewIssue((prev) => ({
                        ...prev,
                        urgency: urgency.value as any,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.urgencyText,
                        { color: urgency.color },
                        newIssue.urgency === urgency.value &&
                          styles.urgencyTextSelected,
                      ]}
                    >
                      {urgency.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleCreateIssue}
            >
              <Text style={styles.saveButtonText}>Create Issue</Text>
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
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#111",
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  createButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  createButtonText: {
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
  issueCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  issueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  machineName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  issueDetails: {
    marginBottom: 12,
  },
  problemType: {
    fontSize: 14,
    color: "#007AFF",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 8,
    lineHeight: 20,
  },
  createdAt: {
    fontSize: 12,
    color: "#999",
  },
  issueFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  assignedTo: {
    fontSize: 12,
    color: "#999",
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  notesTitle: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  noteText: {
    fontSize: 12,
    color: "#ccc",
    marginBottom: 2,
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
    height: 100,
    textAlignVertical: "top",
  },
  typeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeOption: {
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#333",
    minWidth: 80,
    alignItems: "center",
  },
  typeOptionSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#001a33",
  },
  typeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  typeTextSelected: {
    color: "#007AFF",
  },
  urgencyContainer: {
    flexDirection: "row",
    gap: 8,
  },
  urgencyOption: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
  },
  urgencyText: {
    fontSize: 14,
    fontWeight: "500",
  },
  urgencyTextSelected: {
    color: "#fff",
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
