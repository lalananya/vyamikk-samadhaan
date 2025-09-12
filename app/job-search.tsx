// app/job-search.tsx
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
  employer: string;
  applications: number;
  createdAt: string;
}

export default function JobSearch() {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    workType: "",
    location: "",
    minWage: "",
    maxWage: "",
    skills: "",
  });
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [contactModalVisible, setContactModalVisible] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
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
          employer: "ABC Construction",
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
          employer: "XYZ Builders",
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
          employer: "DEF Contractors",
          applications: 8,
          createdAt: "2024-01-10",
        },
        {
          id: "4",
          title: "Painting Work",
          description:
            "Need experienced painter for house painting project. Must have own tools.",
          location: "Pune, Maharashtra",
          wage: "₹500-700 per day",
          workType: "Semi-skilled",
          skills: ["Painting", "Color Mixing", "Tools"],
          experience: "1+ years",
          duration: "2 weeks",
          contactMethod: "text",
          contactPrice: "₹30",
          employer: "GHI Painters",
          applications: 2,
          createdAt: "2024-01-12",
        },
      ];
      setJobs(mockJobs);
    } catch (error) {
      Alert.alert("Error", "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.skills.some((skill) =>
        skill.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesWorkType =
      !filters.workType || job.workType === filters.workType;
    const matchesLocation =
      !filters.location ||
      job.location.toLowerCase().includes(filters.location.toLowerCase());

    return matchesSearch && matchesWorkType && matchesLocation;
  });

  const handleContact = (job: JobPost) => {
    setSelectedJob(job);
    setContactModalVisible(true);
  };

  const confirmContact = () => {
    if (selectedJob) {
      Alert.alert(
        "Contact Employer",
        `You will be charged ${selectedJob.contactPrice} to ${selectedJob.contactMethod} the employer. Continue?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Continue",
            onPress: () => {
              // In a real app, this would process the payment and contact
              Alert.alert(
                "Success",
                `Contacting ${selectedJob.employer} via ${selectedJob.contactMethod}`,
              );
              setContactModalVisible(false);
              setSelectedJob(null);
            },
          },
        ],
      );
    }
  };

  const applyFilters = () => {
    setFilterModalVisible(false);
  };

  const clearFilters = () => {
    setFilters({
      workType: "",
      location: "",
      minWage: "",
      maxWage: "",
      skills: "",
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Jobs</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs by title, skills, or description..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Loading jobs...</Text>
      ) : (
        <ScrollView style={styles.jobsList}>
          {filteredJobs.map((job) => (
            <View key={job.id} style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <View style={styles.workTypeBadge}>
                  <Text style={styles.workTypeText}>{job.workType}</Text>
                </View>
              </View>

              <Text style={styles.employer}>by {job.employer}</Text>
              <Text style={styles.jobDescription}>{job.description}</Text>

              <View style={styles.jobDetails}>
                <Text style={styles.jobDetail}>📍 {job.location}</Text>
                <Text style={styles.jobDetail}>💰 {job.wage}</Text>
                <Text style={styles.jobDetail}>⏱️ {job.duration}</Text>
                <Text style={styles.jobDetail}>
                  👥 {job.applications} applications
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
                <Text style={styles.dateText}>Posted: {job.createdAt}</Text>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleContact(job)}
                >
                  <Text style={styles.contactButtonText}>
                    Contact - {job.contactPrice}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter Jobs</Text>

            <ScrollView style={styles.filterForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Work Type</Text>
                <View style={styles.workTypeContainer}>
                  {["Skilled", "Semi-skilled", "Unskilled"].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.workTypeOption,
                        filters.workType === type && styles.workTypeSelected,
                      ]}
                      onPress={() => setFilters({ ...filters, workType: type })}
                    >
                      <Text
                        style={[
                          styles.workTypeText,
                          filters.workType === type &&
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
                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter city or state"
                  value={filters.location}
                  onChangeText={(text) =>
                    setFilters({ ...filters, location: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Skills</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter skills (comma separated)"
                  value={filters.skills}
                  onChangeText={(text) =>
                    setFilters({ ...filters, skills: text })
                  }
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.clearButton]}
                onPress={clearFilters}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.applyButton]}
                onPress={applyFilters}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={contactModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setContactModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Contact Employer</Text>

            {selectedJob && (
              <View style={styles.contactInfo}>
                <Text style={styles.contactJobTitle}>{selectedJob.title}</Text>
                <Text style={styles.contactEmployer}>
                  by {selectedJob.employer}
                </Text>
                <Text style={styles.contactMethod}>
                  Method: {selectedJob.contactMethod}
                </Text>
                <Text style={styles.contactPrice}>
                  Cost: {selectedJob.contactPrice}
                </Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setContactModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmContact}
              >
                <Text style={styles.confirmButtonText}>Contact Now</Text>
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
  filterButton: {
    backgroundColor: "#6b7280",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  filterButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    flex: 1,
  },
  workTypeBadge: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#3b82f6",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  workTypeText: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "600",
  },
  employer: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
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
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skillText: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "500",
  },
  jobFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  contactButton: {
    backgroundColor: "#10b981",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  contactButtonText: {
    color: "white",
    fontSize: 14,
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
  filterForm: {
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
  contactInfo: {
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  contactJobTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  contactEmployer: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  contactMethod: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },
  contactPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10b981",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  clearButton: {
    backgroundColor: "#f3f4f6",
  },
  applyButton: {
    backgroundColor: "#3b82f6",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  confirmButton: {
    backgroundColor: "#10b981",
  },
  clearButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  applyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
