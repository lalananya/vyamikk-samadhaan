// app/smart-search.tsx
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
import { getToken, getUserData } from "../src/auth";

interface SmartSearchResult {
  id: string;
  type: "job" | "labour" | "employer";
  title: string;
  description: string;
  location: string;
  relevanceScore: number;
  matchReasons: string[];
  premiumFeatures: string[];
}

interface SearchFilters {
  location: string;
  radius: number;
  workType: string;
  experience: string;
  skills: string[];
  wageRange: {
    min: number;
    max: number;
  };
  availability: string;
  rating: number;
}

export default function SmartSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SmartSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    location: "",
    radius: 10,
    workType: "",
    experience: "",
    skills: [],
    wageRange: { min: 0, max: 10000 },
    availability: "",
    rating: 0,
  });
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [userRole, setUserRole] = useState<"employer" | "labour" | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await getUserData();
      if (userData) {
        setUserRole(userData.role);
        // In a real app, check premium status from backend
        setIsPremium(true); // Mock premium status
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
    }
  };

  const performSmartSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert("Search Required", "Please enter a search query");
      return;
    }

    setLoading(true);
    try {
      // In a real app, this would call the smart search API
      // For now, we'll use mock data
      const mockResults: SmartSearchResult[] = [
        {
          id: "1",
          type: "job",
          title: "Senior Construction Worker",
          description:
            "Experienced construction worker needed for high-rise project. Must have 5+ years experience with concrete work and safety protocols.",
          location: "Mumbai, Maharashtra",
          relevanceScore: 95,
          matchReasons: [
            "Skills match: Construction, Concrete Work",
            "Experience level: 5+ years",
            "Location: Mumbai",
          ],
          premiumFeatures: [
            "AI-powered matching",
            "Real-time availability",
            "Verified employer",
          ],
        },
        {
          id: "2",
          type: "labour",
          title: "Skilled Electrician - John Doe",
          description:
            "Certified electrician with 8 years experience. Specializes in residential and commercial wiring. Available for immediate work.",
          location: "Delhi, NCR",
          relevanceScore: 88,
          matchReasons: [
            "Skills match: Electrical, Wiring",
            "Experience: 8 years",
            "Certified professional",
          ],
          premiumFeatures: [
            "Background verified",
            "Skill assessments completed",
            "Previous work portfolio",
          ],
        },
        {
          id: "3",
          type: "job",
          title: "Plumbing Assistant",
          description:
            "Entry-level plumbing position with training provided. Good opportunity for career growth in construction industry.",
          location: "Bangalore, Karnataka",
          relevanceScore: 82,
          matchReasons: [
            "Entry-level position",
            "Training provided",
            "Career growth opportunity",
          ],
          premiumFeatures: [
            "Training program included",
            "Mentorship available",
            "Career progression path",
          ],
        },
      ];
      setResults(mockResults);
    } catch (error) {
      Alert.alert(
        "Search Error",
        "Failed to perform smart search. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const addSkill = (skill: string) => {
    if (skill.trim() && !filters.skills.includes(skill.trim())) {
      setFilters((prev) => ({
        ...prev,
        skills: [...prev.skills, skill.trim()],
      }));
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFilters((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }));
  };

  const applyFilters = () => {
    setFilterModalVisible(false);
    performSmartSearch();
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case "job":
        return "💼";
      case "labour":
        return "👷";
      case "employer":
        return "🏢";
      default:
        return "📋";
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 90) return "#10b981";
    if (score >= 70) return "#f59e0b";
    return "#ef4444";
  };

  const handleResultPress = (result: SmartSearchResult) => {
    if (result.type === "job") {
      router.push("/job-search");
    } else if (result.type === "labour") {
      router.push("/profile");
    } else {
      router.push("/employer-onboarding");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Smart Search</Text>
        {isPremium && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>PREMIUM</Text>
          </View>
        )}
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs, workers, or employers with AI-powered matching..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          multiline
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={performSmartSearch}
          disabled={loading}
        >
          <Text style={styles.searchButtonText}>
            {loading ? "Searching..." : "Search"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Text style={styles.filterButtonText}>🔍 Advanced Filters</Text>
        </TouchableOpacity>

        {filters.skills.length > 0 && (
          <View style={styles.activeFilters}>
            <Text style={styles.activeFiltersLabel}>Active filters:</Text>
            <View style={styles.skillsContainer}>
              {filters.skills.map((skill, index) => (
                <View key={index} style={styles.skillTag}>
                  <Text style={styles.skillText}>{skill}</Text>
                  <TouchableOpacity
                    style={styles.removeSkillButton}
                    onPress={() => removeSkill(skill)}
                  >
                    <Text style={styles.removeSkillText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>AI is analyzing your search...</Text>
        </View>
      ) : (
        <ScrollView style={styles.resultsList}>
          {results.map((result) => (
            <TouchableOpacity
              key={result.id}
              style={styles.resultCard}
              onPress={() => handleResultPress(result)}
            >
              <View style={styles.resultHeader}>
                <Text style={styles.resultIcon}>
                  {getResultIcon(result.type)}
                </Text>
                <View style={styles.resultContent}>
                  <Text style={styles.resultTitle}>{result.title}</Text>
                  <Text style={styles.resultLocation}>
                    📍 {result.location}
                  </Text>
                </View>
                <View
                  style={[
                    styles.relevanceBadge,
                    {
                      backgroundColor: getRelevanceColor(result.relevanceScore),
                    },
                  ]}
                >
                  <Text style={styles.relevanceText}>
                    {result.relevanceScore}%
                  </Text>
                </View>
              </View>

              <Text style={styles.resultDescription}>{result.description}</Text>

              <View style={styles.matchReasons}>
                <Text style={styles.matchReasonsTitle}>Why this matches:</Text>
                {result.matchReasons.map((reason, index) => (
                  <Text key={index} style={styles.matchReason}>
                    • {reason}
                  </Text>
                ))}
              </View>

              {isPremium && result.premiumFeatures.length > 0 && (
                <View style={styles.premiumFeatures}>
                  <Text style={styles.premiumFeaturesTitle}>
                    ✨ Premium Features:
                  </Text>
                  {result.premiumFeatures.map((feature, index) => (
                    <Text key={index} style={styles.premiumFeature}>
                      • {feature}
                    </Text>
                  ))}
                </View>
              )}
            </TouchableOpacity>
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
            <Text style={styles.modalTitle}>Advanced Filters</Text>

            <ScrollView style={styles.filterForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter city or state"
                  value={filters.location}
                  onChangeText={(text) => handleFilterChange("location", text)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Search Radius (km)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter radius"
                  value={filters.radius.toString()}
                  onChangeText={(text) =>
                    handleFilterChange("radius", parseInt(text) || 10)
                  }
                  keyboardType="numeric"
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
                        filters.workType === type && styles.workTypeSelected,
                      ]}
                      onPress={() => handleFilterChange("workType", type)}
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
                <Text style={styles.label}>Experience Level</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 2+ years, 5+ years"
                  value={filters.experience}
                  onChangeText={(text) =>
                    handleFilterChange("experience", text)
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Skills</Text>
                <View style={styles.skillsInputContainer}>
                  <TextInput
                    style={styles.skillsInput}
                    placeholder="Add skills (comma separated)"
                    onSubmitEditing={(e) => {
                      const skills = e.nativeEvent.text
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s);
                      skills.forEach((skill) => addSkill(skill));
                      e.nativeEvent.text = "";
                    }}
                  />
                </View>
                <View style={styles.skillsContainer}>
                  {filters.skills.map((skill, index) => (
                    <View key={index} style={styles.skillTag}>
                      <Text style={styles.skillText}>{skill}</Text>
                      <TouchableOpacity
                        style={styles.removeSkillButton}
                        onPress={() => removeSkill(skill)}
                      >
                        <Text style={styles.removeSkillText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Wage Range (₹)</Text>
                <View style={styles.wageRangeContainer}>
                  <TextInput
                    style={styles.wageInput}
                    placeholder="Min"
                    value={filters.wageRange.min.toString()}
                    onChangeText={(text) =>
                      handleFilterChange("wageRange", {
                        ...filters.wageRange,
                        min: parseInt(text) || 0,
                      })
                    }
                    keyboardType="numeric"
                  />
                  <Text style={styles.wageSeparator}>to</Text>
                  <TextInput
                    style={styles.wageInput}
                    placeholder="Max"
                    value={filters.wageRange.max.toString()}
                    onChangeText={(text) =>
                      handleFilterChange("wageRange", {
                        ...filters.wageRange,
                        max: parseInt(text) || 10000,
                      })
                    }
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Minimum Rating</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 4.0, 4.5"
                  value={filters.rating.toString()}
                  onChangeText={(text) =>
                    handleFilterChange("rating", parseFloat(text) || 0)
                  }
                  keyboardType="numeric"
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
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
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  premiumBadge: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  searchContainer: {
    padding: 24,
    paddingTop: 0,
  },
  searchInput: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 50,
    textAlignVertical: "top",
  },
  searchButton: {
    backgroundColor: "#3b82f6",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  searchButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  filterContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  filterButton: {
    backgroundColor: "#6b7280",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  filterButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  activeFilters: {
    marginTop: 12,
  },
  activeFiltersLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillTag: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#3b82f6",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  skillText: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "500",
  },
  removeSkillButton: {
    marginLeft: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
  },
  removeSkillText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
  },
  resultsList: {
    padding: 24,
    paddingTop: 0,
  },
  resultCard: {
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
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  resultIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  resultLocation: {
    fontSize: 14,
    color: "#6b7280",
  },
  relevanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  relevanceText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  resultDescription: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 12,
  },
  matchReasons: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  matchReasonsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  matchReason: {
    fontSize: 12,
    color: "#374151",
    marginBottom: 2,
  },
  premiumFeatures: {
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  premiumFeaturesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 4,
  },
  premiumFeature: {
    fontSize: 12,
    color: "#92400e",
    marginBottom: 2,
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
  skillsInputContainer: {
    marginBottom: 8,
  },
  skillsInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  wageRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  wageInput: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  wageSeparator: {
    fontSize: 16,
    color: "#6b7280",
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
  applyButton: {
    backgroundColor: "#3b82f6",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  applyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
