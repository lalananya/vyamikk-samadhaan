// app/job-posts.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { apiFetch } from "../src/api";
import { getToken } from "../src/auth";

interface JobPost {
  id: string;
  title: string;
  description: string;
  location: string;
  wage: string;
  workType: string;
  skills: string[];
  experience: string;
  duration: string;
  contactMethod: string;
  contactPrice: string;
  status: "active" | "paused" | "closed";
  applications: number;
  createdAt: string;
}

export default function JobPosts() {
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newJob, setNewJob] = useState({
    title: "",
    description: "",
    location: "",
    wage: "",
    workType: "",
    skills: "",
    experience: "",
    duration: "",
    contactMethod: "call",
    contactPrice: "",
  });

  useEffect(() => {
    loadJobPosts();
  }, []);

  const loadJobPosts = async () => {
    setLoading(true);
    try {
      // In a real app, this would fetch from the backend
      // For now, we'll use mock data
      const mockJobs: JobPost[] = [
        {
          id: "1",
          title: "Construction Worker Needed",
          description:
            "Looking for skilled construction worker for residential project. Must have experience with concrete work and basic tools.",
          location: "Mumbai, Maharashtra",
          wage: "₹800-1000 per day",
          workType: "Skilled",
          skills: ["Construction", "Concrete Work", "Basic Tools"],
          experience: "2+ years",
          duration: "3 months",
          contactMethod: "call",
          contactPrice: "₹50",
          status: "active",
          applications: 5,
          createdAt: "2024-01-15",
        },
        {
          id: "2",
          title: "Plumbing Assistant",
          description:
            "Need plumbing assistant for commercial project. Training will be provided for the right candidate.",
          location: "Delhi, NCR",
          wage: "₹600-800 per day",
          workType: "Semi-skilled",
          skills: ["Plumbing", "Basic Tools"],
          experience: "1+ years",
          duration: "2 months",
          contactMethod: "text",
          contactPrice: "₹25",
          status: "active",
          applications: 3,
          createdAt: "2024-01-14",
        },
        {
          id: "3",
          title: "Electrical Work",
          description:
            "Urgent requirement for electrician for wiring work in new building.",
          location: "Bangalore, Karnataka",
          wage: "₹1200-1500 per day",
          workType: "Skilled",
          skills: ["Electrical", "Wiring", "Safety"],
          experience: "3+ years",
          duration: "1 month",
          contactMethod: "call",
          contactPrice: "₹75",
          status: "closed",
          applications: 8,
          createdAt: "2024-01-10",
        },
      ];
      setJobPosts(mockJobs);
    } catch (error) {
      Alert.alert("Error", "Failed to load job posts");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async () => {
    if (
      !newJob.title ||
      !newJob.description ||
      !newJob.location ||
      !newJob.wage
    ) {
      Alert.alert("Required Fields", "Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const skillsArray = newJob.skills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      const jobPost: JobPost = {
        id: Date.now().toString(),
        title: newJob.title,
        description: newJob.description,
        location: newJob.location,
        wage: newJob.wage,
        workType: newJob.workType,
        skills: skillsArray,
        duration: newJob.duration,
        experience: newJob.experience,
        contactMethod: newJob.contactMethod,
        contactPrice: newJob.contactPrice,
        status: "active",
        applications: 0,
        createdAt: new Date().toISOString().split("T")[0],
      };

      setJobPosts((prev) => [jobPost, ...prev]);
      setCreateModalVisible(false);
      setNewJob({
        title: "",
        description: "",
        location: "",
        wage: "",
        workType: "",
        skills: "",
        experience: "",
        duration: "",
        contactMethod: "call",
        contactPrice: "",
      });
      Alert.alert("Success", "Job post created successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to create job post");
    } finally {
      setLoading(false);
    }
  };

  const toggleJobStatus = (jobId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    setJobPosts((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, status: newStatus as "active" | "paused" | "closed" }
          : job,
      ),
    );
  };

  const closeJob = (jobId: string) => {
    setJobPosts((prev) =>
      prev.map((job) =>
        job.id === jobId ? { ...job, status: "closed" as const } : job,
      ),
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "#10b981";
      case "paused":
        return "#f59e0b";
      case "closed":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "paused":
        return "Paused";
      case "closed":
        return "Closed";
      default:
        return "Unknown";
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Job Posts</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setCreateModalVisible(true)}
        >
          <Text style={styles.createButtonText}>+ Create Job</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Loading job posts...</Text>
      ) : (
        <ScrollView style={styles.jobsList}>
          {jobPosts.map((job) => (
            <View key={job.id} style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(job.status) },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {getStatusText(job.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.jobDescription}>{job.description}</Text>

              <View style={styles.jobDetails}>
                <Text style={styles.jobDetail}>📍 {job.location}</Text>
                <Text style={styles.jobDetail}>💰 {job.wage}</Text>
                <Text style={styles.jobDetail}>👷 {job.workType}</Text>
                <Text style={styles.jobDetail}>⏱️ {job.duration}</Text>
                <Text style={styles.jobDetail}>
                  📞 {job.contactMethod} - {job.contactPrice}
                </Text>
              </View>

              <View style={styles.skillsContainer}>
                {job.skills.map((skill, index) => (
                  <View key={index} style={styles.skillTag}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.jobFooter}>
                <Text style={styles.applicationsText}>
                  {job.applications} applications
                </Text>
                <Text style={styles.dateText}>Posted: {job.createdAt}</Text>
              </View>

              <View style={styles.actionButtons}>
                {job.status !== "closed" && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.toggleButton]}
                    onPress={() => toggleJobStatus(job.id, job.status)}
                  >
                    <Text style={styles.actionButtonText}>
                      {job.status === "active" ? "Pause" : "Resume"}
                    </Text>
                  </TouchableOpacity>
                )}

                {job.status !== "closed" && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.closeButton]}
                    onPress={() => closeJob(job.id)}
                  >
                    <Text style={styles.actionButtonText}>Close</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionButton, styles.viewButton]}
                  onPress={() => router.push(`/job-applications/${job.id}`)}
                >
                  <Text style={styles.actionButtonText}>View Applications</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={createModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Job Post</Text>

            <ScrollView style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Job Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter job title"
                  value={newJob.title}
                  onChangeText={(text) => setNewJob({ ...newJob, title: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe the job requirements"
                  value={newJob.description}
                  onChangeText={(text) =>
                    setNewJob({ ...newJob, description: text })
                  }
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Location *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter work location"
                  value={newJob.location}
                  onChangeText={(text) =>
                    setNewJob({ ...newJob, location: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Wage *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., ₹800-1000 per day"
                  value={newJob.wage}
                  onChangeText={(text) => setNewJob({ ...newJob, wage: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Work Type</Text>
                <View style={styles.workTypeContainer}>
                  {["Skilled", "Semi-skilled", "Unskilled"].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.workTypeOption,
                        newJob.workType === type && styles.workTypeSelected,
                      ]}
                      onPress={() => setNewJob({ ...newJob, workType: type })}
                    >
                      <Text
                        style={[
                          styles.workTypeText,
                          newJob.workType === type &&
                            styles.workTypeTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Skills Required</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Construction, Plumbing, Electrical (comma separated)"
                  value={newJob.skills}
                  onChangeText={(text) =>
                    setNewJob({ ...newJob, skills: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Experience Required</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 2+ years, 5+ years"
                  value={newJob.experience}
                  onChangeText={(text) =>
                    setNewJob({ ...newJob, experience: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Duration</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 3 months, 6 months, Ongoing"
                  value={newJob.duration}
                  onChangeText={(text) =>
                    setNewJob({ ...newJob, duration: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contact Method</Text>
                <View style={styles.contactMethodContainer}>
                  <TouchableOpacity
                    style={[
                      styles.contactMethodOption,
                      newJob.contactMethod === "call" &&
                        styles.contactMethodSelected,
                    ]}
                    onPress={() =>
                      setNewJob({ ...newJob, contactMethod: "call" })
                    }
                  >
                    <Text
                      style={[
                        styles.contactMethodText,
                        newJob.contactMethod === "call" &&
                          styles.contactMethodTextSelected,
                      ]}
                    >
                      Call
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.contactMethodOption,
                      newJob.contactMethod === "text" &&
                        styles.contactMethodSelected,
                    ]}
                    onPress={() =>
                      setNewJob({ ...newJob, contactMethod: "text" })
                    }
                  >
                    <Text
                      style={[
                        styles.contactMethodText,
                        newJob.contactMethod === "text" &&
                          styles.contactMethodTextSelected,
                      ]}
                    >
                      Text
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contact Price</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., ₹50, ₹25"
                  value={newJob.contactPrice}
                  onChangeText={(text) =>
                    setNewJob({ ...newJob, contactPrice: text })
                  }
                  keyboardType="numeric"
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createJobButton]}
                onPress={handleCreateJob}
                disabled={loading}
              >
                <Text style={styles.createJobButtonText}>
                  {loading ? "Creating..." : "Create Job"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  createButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  createButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#666",
  },
  jobsList: {
    padding: 24,
    paddingTop: 0,
  },
  jobCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  jobDescription: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 12,
    lineHeight: 20,
  },
  jobDetails: {
    marginBottom: 12,
  },
  jobDetail: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  skillTag: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#3b82f6",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skillText: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "500",
  },
  jobFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  applicationsText: {
    fontSize: 14,
    color: "#6b7280",
  },
  dateText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  toggleButton: {
    backgroundColor: "#f59e0b",
  },
  closeButton: {
    backgroundColor: "#ef4444",
  },
  viewButton: {
    backgroundColor: "#3b82f6",
  },
  actionButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 12,
    width: "95%",
    maxWidth: 500,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
    color: "#1a1a1a",
  },
  modalForm: {
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  workTypeContainer: {
    flexDirection: "row",
    gap: 8,
  },
  workTypeOption: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  workTypeSelected: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  workTypeText: {
    fontSize: 14,
    color: "#374151",
  },
  workTypeTextSelected: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
  contactMethodContainer: {
    flexDirection: "row",
    gap: 8,
  },
  contactMethodOption: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  contactMethodSelected: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  contactMethodText: {
    fontSize: 14,
    color: "#374151",
  },
  contactMethodTextSelected: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  createJobButton: {
    backgroundColor: "#3b82f6",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  createJobButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
