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
  IssueFilters,
} from "../src/services/MachineIssueService";
import { appState } from "../src/state/AppState";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

const STATUS_FILTERS = [
  { value: "open", label: "Open", color: "#ff4444" },
  { value: "in_progress", label: "In Progress", color: "#ff9800" },
  { value: "resolved", label: "Resolved", color: "#4CAF50" },
  { value: "closed", label: "Closed", color: "#666" },
];

const URGENCY_FILTERS = [
  { value: "high", label: "High", color: "#ff4444" },
  { value: "medium", label: "Medium", color: "#ff9800" },
  { value: "low", label: "Low", color: "#4CAF50" },
];

export default function IssueManagementScreen() {
  const [issues, setIssues] = useState<MachineIssue[]>([]);
  const [stats, setStats] = useState<IssueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<MachineIssue | null>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<IssueFilters>({});
  const [newNote, setNewNote] = useState("");

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

      // Load all organization issues
      const orgIssues = await machineIssueService.getIssues(
        currentOrgId,
        filters,
      );
      setIssues(orgIssues);

      // Load stats
      const issueStats = await machineIssueService.getIssueStats(currentOrgId);
      setStats(issueStats);

      // Track management view
      analytics.track({
        event: "issue_management_viewed",
        properties: {
          organizationId: currentOrgId,
          issueCount: orgIssues.length,
          filters: filters,
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

  const handleAcknowledgeIssue = async (issueId: string) => {
    try {
      const user = appState.getUser();
      if (!user) {
        Alert.alert("Error", "User not found");
        return;
      }

      const result = await machineIssueService.acknowledgeIssue(
        issueId,
        user.id,
        user.phone, // Using phone as name for now
      );

      if (result.success) {
        Alert.alert("Success", "Issue acknowledged successfully");
        await loadIssues();
      } else {
        Alert.alert("Error", result.error || "Failed to acknowledge issue");
      }
    } catch (error: any) {
      console.error("Error acknowledging issue:", error);
      Alert.alert("Error", "Failed to acknowledge issue");
    }
  };

  const handleUpdateStatus = async (
    issueId: string,
    status: "open" | "in_progress" | "resolved" | "closed",
  ) => {
    try {
      const user = appState.getUser();
      if (!user) {
        Alert.alert("Error", "User not found");
        return;
      }

      const result = await machineIssueService.updateIssueStatus(
        issueId,
        status,
        user.id,
        user.phone, // Using phone as name for now
        newNote || undefined,
      );

      if (result.success) {
        Alert.alert("Success", "Issue status updated successfully");
        setNewNote("");
        await loadIssues();
        setShowIssueModal(false);
        setSelectedIssue(null);
      } else {
        Alert.alert("Error", result.error || "Failed to update issue status");
      }
    } catch (error: any) {
      console.error("Error updating issue status:", error);
      Alert.alert("Error", "Failed to update issue status");
    }
  };

  const handleAddNote = async (issueId: string) => {
    try {
      if (!newNote.trim()) {
        Alert.alert("Required", "Please enter a note");
        return;
      }

      const user = appState.getUser();
      if (!user) {
        Alert.alert("Error", "User not found");
        return;
      }

      const result = await machineIssueService.addIssueNote(
        issueId,
        newNote,
        user.id,
        user.phone, // Using phone as name for now
      );

      if (result.success) {
        Alert.alert("Success", "Note added successfully");
        setNewNote("");
        await loadIssues();
        setShowIssueModal(false);
        setSelectedIssue(null);
      } else {
        Alert.alert("Error", result.error || "Failed to add note");
      }
    } catch (error: any) {
      console.error("Error adding note:", error);
      Alert.alert("Error", "Failed to add note");
    }
  };

  const applyFilters = (newFilters: IssueFilters) => {
    setFilters(newFilters);
    setShowFilters(false);
  };

  const renderIssue = ({ item }: { item: MachineIssue }) => (
    <TouchableOpacity
      style={styles.issueCard}
      onPress={() => {
        setSelectedIssue(item);
        setShowIssueModal(true);
      }}
    >
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
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.createdBy}>Created by: {item.createdByName}</Text>
        <Text style={styles.createdAt}>
          {new Date(item.createdAt).toLocaleString()}
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
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <AuthenticatedLayout title="Issue Management">
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading issues...</Text>
        </View>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout title="Issue Management">
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

      {/* Filters */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Text style={styles.filterButtonText}>Filters</Text>
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
            <Text style={styles.emptyText}>No issues found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your filters or create a new issue
            </Text>
          </View>
        }
      />

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Issues</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterOptions}>
                {STATUS_FILTERS.map((status) => (
                  <TouchableOpacity
                    key={status.value}
                    style={[
                      styles.filterOption,
                      { borderColor: status.color },
                      filters.status?.includes(status.value) && {
                        backgroundColor: status.color + "20",
                      },
                    ]}
                    onPress={() => {
                      const newStatus = filters.status || [];
                      if (newStatus.includes(status.value)) {
                        setFilters((prev) => ({
                          ...prev,
                          status: newStatus.filter((s) => s !== status.value),
                        }));
                      } else {
                        setFilters((prev) => ({
                          ...prev,
                          status: [...newStatus, status.value],
                        }));
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        { color: status.color },
                        filters.status?.includes(status.value) &&
                          styles.filterOptionTextSelected,
                      ]}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Urgency</Text>
              <View style={styles.filterOptions}>
                {URGENCY_FILTERS.map((urgency) => (
                  <TouchableOpacity
                    key={urgency.value}
                    style={[
                      styles.filterOption,
                      { borderColor: urgency.color },
                      filters.urgency?.includes(urgency.value) && {
                        backgroundColor: urgency.color + "20",
                      },
                    ]}
                    onPress={() => {
                      const newUrgency = filters.urgency || [];
                      if (newUrgency.includes(urgency.value)) {
                        setFilters((prev) => ({
                          ...prev,
                          urgency: newUrgency.filter(
                            (u) => u !== urgency.value,
                          ),
                        }));
                      } else {
                        setFilters((prev) => ({
                          ...prev,
                          urgency: [...newUrgency, urgency.value],
                        }));
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        { color: urgency.color },
                        filters.urgency?.includes(urgency.value) &&
                          styles.filterOptionTextSelected,
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
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => applyFilters(filters)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Issue Detail Modal */}
      <Modal
        visible={showIssueModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Issue Details</Text>
            <TouchableOpacity onPress={() => setShowIssueModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedIssue && (
              <>
                <View style={styles.issueDetailCard}>
                  <Text style={styles.issueTitle}>
                    {selectedIssue.machineName}
                  </Text>
                  <Text style={styles.issueSubtitle}>
                    {machineIssueService.getProblemTypeLabel(
                      selectedIssue.problemType,
                    )}
                  </Text>
                  <Text style={styles.issueDescription}>
                    {selectedIssue.description}
                  </Text>

                  <View style={styles.issueMeta}>
                    <Text style={styles.metaText}>
                      Created by: {selectedIssue.createdByName}
                    </Text>
                    <Text style={styles.metaText}>
                      Urgency:{" "}
                      {machineIssueService.getUrgencyLabel(
                        selectedIssue.urgency,
                      )}
                    </Text>
                    <Text style={styles.metaText}>
                      Status:{" "}
                      {machineIssueService.getStatusLabel(selectedIssue.status)}
                    </Text>
                    {selectedIssue.assignedToName && (
                      <Text style={styles.metaText}>
                        Assigned to: {selectedIssue.assignedToName}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Notes */}
                {selectedIssue.notes.length > 0 && (
                  <View style={styles.notesSection}>
                    <Text style={styles.sectionTitle}>Notes</Text>
                    {selectedIssue.notes.map((note, index) => (
                      <View key={index} style={styles.noteCard}>
                        <Text style={styles.noteText}>{note.note}</Text>
                        <Text style={styles.noteAuthor}>
                          {note.addedByName} -{" "}
                          {new Date(note.createdAt).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Add Note */}
                <View style={styles.addNoteSection}>
                  <Text style={styles.sectionTitle}>Add Note</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={newNote}
                    onChangeText={setNewNote}
                    placeholder="Enter your note here"
                    placeholderTextColor="#666"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={styles.addNoteButton}
                    onPress={() => handleAddNote(selectedIssue.id)}
                  >
                    <Text style={styles.addNoteButtonText}>Add Note</Text>
                  </TouchableOpacity>
                </View>

                {/* Actions */}
                <View style={styles.actionsSection}>
                  <Text style={styles.sectionTitle}>Actions</Text>

                  {selectedIssue.status === "open" && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleAcknowledgeIssue(selectedIssue.id)}
                    >
                      <Text style={styles.actionButtonText}>Acknowledge</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionButton, styles.statusButton]}
                    onPress={() =>
                      handleUpdateStatus(selectedIssue.id, "in_progress")
                    }
                  >
                    <Text style={styles.actionButtonText}>
                      Mark In Progress
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.resolveButton]}
                    onPress={() =>
                      handleUpdateStatus(selectedIssue.id, "resolved")
                    }
                  >
                    <Text style={styles.actionButtonText}>Mark Resolved</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.closeButton]}
                    onPress={() =>
                      handleUpdateStatus(selectedIssue.id, "closed")
                    }
                  >
                    <Text style={styles.actionButtonText}>Close Issue</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
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
  filterButton: {
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  filterButtonText: {
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
  createdBy: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
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
  filterGroup: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  filterOptionTextSelected: {
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
  applyButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  issueDetailCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  issueTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  issueSubtitle: {
    fontSize: 14,
    color: "#007AFF",
    marginBottom: 12,
  },
  issueDescription: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 20,
    marginBottom: 16,
  },
  issueMeta: {
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#999",
  },
  notesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  noteCard: {
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 4,
  },
  noteAuthor: {
    fontSize: 12,
    color: "#999",
  },
  addNoteSection: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  addNoteButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  addNoteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  actionsSection: {
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  statusButton: {
    backgroundColor: "#ff9800",
  },
  resolveButton: {
    backgroundColor: "#4CAF50",
  },
  closeButton: {
    backgroundColor: "#666",
  },
});
