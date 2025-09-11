import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { request } from "../src/net/http";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";
import { appState } from "../src/state/AppState";

// Categories and their types
const CATEGORIES = [
  { id: "micro_unit", label: "Micro Unit", icon: "🏭", requiresEntity: true },
  { id: "small_unit", label: "Small Unit", icon: "🏢", requiresEntity: true },
  {
    id: "professional",
    label: "Professional",
    icon: "👨‍💼",
    requiresEntity: false,
  },
  { id: "ca", label: "CA", icon: "📊", requiresEntity: false },
  { id: "advocate", label: "Advocate", icon: "⚖️", requiresEntity: false },
  { id: "lawyer", label: "Lawyer", icon: "⚖️", requiresEntity: false },
  { id: "labour", label: "Labour", icon: "👷", requiresEntity: false },
  { id: "supervisor", label: "Supervisor", icon: "👨‍💼", requiresEntity: false },
  { id: "accountant", label: "Accountant", icon: "📈", requiresEntity: false },
  {
    id: "owner_partner",
    label: "Owner/Partner",
    icon: "👑",
    requiresEntity: true,
  },
  { id: "director", label: "Director", icon: "🎯", requiresEntity: true },
];

const LEGAL_ENTITIES = [
  { id: "proprietorship", label: "Proprietorship" },
  { id: "partnership", label: "Partnership" },
  { id: "llp", label: "LLP" },
  { id: "pvt_ltd", label: "Pvt. Ltd." },
  { id: "other", label: "Other" },
];

const PROFESSIONAL_SPECIALIZATIONS = [
  "Audit",
  "Compliance",
  "Contracts",
  "Taxation",
  "Corporate Law",
  "Criminal Law",
  "Civil Law",
  "Family Law",
  "Property Law",
  "Labour Law",
];

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
];

interface OnboardingData {
  category: string;
  legalEntity?: string;
  displayName: string;
  gstin?: string;
  location: {
    city: string;
    state: string;
  };
  specializations?: string[];
  serviceAreas?: string[];
}

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    category: "",
    displayName: "",
    location: { city: "", state: "" },
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Track onboarding start
    analytics.track({
      event: "onboarding_start",
      properties: {
        step: currentStep,
        totalSteps: 3,
      },
      timestamp: new Date(),
    });
  }, []);

  const handleCategorySelect = (categoryId: string) => {
    const category = CATEGORIES.find((c) => c.id === categoryId);
    if (!category) return;

    setData((prev) => ({ ...prev, category: categoryId }));

    // Track category selection
    analytics.track({
      event: "category_selected",
      properties: {
        categoryId,
        categoryLabel: category.label,
        requiresEntity: category.requiresEntity,
      },
      timestamp: new Date(),
    });

    // Auto-advance to next step
    if (category.requiresEntity) {
      setCurrentStep(1);
    } else {
      // Skip legal entity step for professionals
      setCurrentStep(2);
    }
  };

  const handleLegalEntitySelect = (entityId: string) => {
    setData((prev) => ({ ...prev, legalEntity: entityId }));

    // Track entity selection
    analytics.track({
      event: "entity_selected",
      properties: {
        entityId,
        categoryId: data.category,
      },
      timestamp: new Date(),
    });

    setCurrentStep(2);
  };

  const handleComplete = async () => {
    try {
      setLoading(true);

      // Save onboarding data
      await request("/user/onboarding/complete", {
        method: "POST",
        json: {
          category: data.category,
          legalEntity: data.legalEntity,
          displayName: data.displayName,
          gstin: data.gstin,
          location: data.location,
          specializations: data.specializations,
          serviceAreas: data.serviceAreas,
          registeredAt: new Date().toISOString(),
        },
      });

      // Update app state with category
      await appState.updateUser({
        category: data.category,
        onboardingCompleted: true,
      });

      // Check if user needs partnership registration
      const needsPartnership = [
        "partnership",
        "llp",
        "pvt_ltd",
        "other",
      ].includes(data.legalEntity || "");
      if (needsPartnership) {
        // Redirect to partnership registration
        router.replace("/partnership-registration");
        return;
      }

      // Track completion
      analytics.track({
        event: "onboarding_complete",
        properties: {
          category: data.category,
          hasLegalEntity: !!data.legalEntity,
          hasSpecializations: !!data.specializations?.length,
          hasServiceAreas: !!data.serviceAreas?.length,
        },
        timestamp: new Date(),
      });

      // Reset boot sequence to trigger re-evaluation
      const { bootSequence } = await import("../src/boot/BootSequence");
      bootSequence.reset();

      // Let BootGuard handle the routing based on updated user state
      // No manual navigation needed
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      Alert.alert("Error", "Failed to complete onboarding. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!data.category;
      case 1:
        return !!data.legalEntity;
      case 2:
        return !!(
          data.displayName &&
          data.location.city &&
          data.location.state
        );
      default:
        return false;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 0:
        return "Choose Your Category";
      case 1:
        return "Select Legal Entity";
      case 2:
        return "Organization Basics";
      default:
        return "Onboarding";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 0:
        return "Select the category that best describes your role or business type.";
      case 1:
        return "Choose the legal structure of your business.";
      case 2:
        return "Provide basic information about your organization.";
      default:
        return "";
    }
  };

  return (
    <AuthenticatedLayout title={getStepTitle()} showFooter={false}>
      <View style={styles.container}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentStep + 1) / 3) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>Step {currentStep + 1} of 3</Text>
        </View>

        {/* Step Description */}
        <Text style={styles.stepDescription}>{getStepDescription()}</Text>

        {/* Step Content */}
        <ScrollView
          style={styles.stepContent}
          showsVerticalScrollIndicator={false}
        >
          {currentStep === 0 && (
            <CategoryStep
              selectedCategory={data.category}
              onSelect={handleCategorySelect}
            />
          )}

          {currentStep === 1 && (
            <LegalEntityStep
              selectedEntity={data.legalEntity}
              onSelect={handleLegalEntitySelect}
            />
          )}

          {currentStep === 2 && (
            <OrgBasicsStep
              data={data}
              onChange={setData}
              category={data.category}
            />
          )}
        </ScrollView>

        {/* Navigation */}
        <View style={styles.navigation}>
          {currentStep < 2 ? (
            <TouchableOpacity
              style={[
                styles.nextButton,
                !canProceed() && styles.nextButtonDisabled,
              ]}
              onPress={() => setCurrentStep((prev) => prev + 1)}
              disabled={!canProceed()}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.completeButton,
                (!canProceed() || loading) && styles.completeButtonDisabled,
              ]}
              onPress={handleComplete}
              disabled={!canProceed() || loading}
            >
              <Text style={styles.completeButtonText}>
                {loading ? "Completing..." : "Complete Setup"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </AuthenticatedLayout>
  );
}

// Step Components
function CategoryStep({
  selectedCategory,
  onSelect,
}: {
  selectedCategory: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.categoriesGrid}>
      {CATEGORIES.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryCard,
            selectedCategory === category.id && styles.categoryCardSelected,
          ]}
          onPress={() => onSelect(category.id)}
        >
          <Text style={styles.categoryIcon}>{category.icon}</Text>
          <Text style={styles.categoryLabel}>{category.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function LegalEntityStep({
  selectedEntity,
  onSelect,
}: {
  selectedEntity?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.entitiesList}>
      {LEGAL_ENTITIES.map((entity) => (
        <TouchableOpacity
          key={entity.id}
          style={[
            styles.entityCard,
            selectedEntity === entity.id && styles.entityCardSelected,
          ]}
          onPress={() => onSelect(entity.id)}
        >
          <View style={styles.entityCheckbox}>
            {selectedEntity === entity.id && (
              <Text style={styles.entityCheckmark}>✓</Text>
            )}
          </View>
          <Text style={styles.entityLabel}>{entity.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function OrgBasicsStep({
  data,
  onChange,
  category,
}: {
  data: OnboardingData;
  onChange: (data: OnboardingData) => void;
  category: string;
}) {
  const selectedCategory = CATEGORIES.find((c) => c.id === category);
  const isProfessional =
    selectedCategory &&
    ["professional", "ca", "advocate", "lawyer"].includes(category);

  return (
    <View style={styles.basicsForm}>
      {/* Display Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Display Name *</Text>
        <TextInput
          style={styles.input}
          value={data.displayName}
          onChangeText={(text) => onChange({ ...data, displayName: text })}
          placeholder="Enter your organization name"
          placeholderTextColor="#666"
        />
      </View>

      {/* GSTIN (for business categories) */}
      {selectedCategory?.requiresEntity && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>GSTIN (Optional)</Text>
          <TextInput
            style={styles.input}
            value={data.gstin}
            onChangeText={(text) => onChange({ ...data, gstin: text })}
            placeholder="Enter GSTIN if available"
            placeholderTextColor="#666"
          />
        </View>
      )}

      {/* Location */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>City *</Text>
        <TextInput
          style={styles.input}
          value={data.location.city}
          onChangeText={(text) =>
            onChange({
              ...data,
              location: { ...data.location, city: text },
            })
          }
          placeholder="Enter your city"
          placeholderTextColor="#666"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>State *</Text>
        <ScrollView style={styles.stateDropdown} nestedScrollEnabled>
          {INDIAN_STATES.map((state) => (
            <TouchableOpacity
              key={state}
              style={[
                styles.stateOption,
                data.location.state === state && styles.stateOptionSelected,
              ]}
              onPress={() =>
                onChange({
                  ...data,
                  location: { ...data.location, state },
                })
              }
            >
              <Text style={styles.stateOptionText}>{state}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Professional Specializations */}
      {isProfessional && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Specializations (Optional)</Text>
          <View style={styles.specializationsGrid}>
            {PROFESSIONAL_SPECIALIZATIONS.map((spec) => (
              <TouchableOpacity
                key={spec}
                style={[
                  styles.specializationChip,
                  data.specializations?.includes(spec) &&
                    styles.specializationChipSelected,
                ]}
                onPress={() => {
                  const current = data.specializations || [];
                  const updated = current.includes(spec)
                    ? current.filter((s) => s !== spec)
                    : [...current, spec];
                  onChange({ ...data, specializations: updated });
                }}
              >
                <Text style={styles.specializationChipText}>{spec}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Service Areas for Professionals */}
      {isProfessional && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Service Areas (Optional)</Text>
          <ScrollView style={styles.stateDropdown} nestedScrollEnabled>
            {INDIAN_STATES.map((state) => (
              <TouchableOpacity
                key={state}
                style={[
                  styles.stateOption,
                  data.serviceAreas?.includes(state) &&
                    styles.stateOptionSelected,
                ]}
                onPress={() => {
                  const current = data.serviceAreas || [];
                  const updated = current.includes(state)
                    ? current.filter((s) => s !== state)
                    : [...current, state];
                  onChange({ ...data, serviceAreas: updated });
                }}
              >
                <Text style={styles.stateOptionText}>{state}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 2,
  },
  progressText: {
    color: "#999",
    fontSize: 12,
    textAlign: "center",
  },
  stepDescription: {
    fontSize: 16,
    color: "#ccc",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  stepContent: {
    flex: 1,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  categoryCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    width: "48%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  categoryCardSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#001a33",
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
    fontWeight: "500",
  },
  entitiesList: {
    gap: 12,
  },
  entityCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  entityCardSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#001a33",
  },
  entityCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  entityCheckmark: {
    color: "#007AFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  entityLabel: {
    fontSize: 16,
    color: "#fff",
  },
  basicsForm: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
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
  stateDropdown: {
    backgroundColor: "#111",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    maxHeight: 200,
  },
  stateOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  stateOptionSelected: {
    backgroundColor: "#001a33",
  },
  stateOptionText: {
    color: "#fff",
    fontSize: 14,
  },
  specializationsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  specializationChip: {
    backgroundColor: "#111",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#333",
  },
  specializationChipSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#001a33",
  },
  specializationChipText: {
    color: "#fff",
    fontSize: 12,
  },
  navigation: {
    paddingTop: 24,
  },
  nextButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "#333",
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  completeButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  completeButtonDisabled: {
    backgroundColor: "#333",
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
