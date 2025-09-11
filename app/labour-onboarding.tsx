// app/labour-onboarding.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { apiFetch } from "../src/api";

export default function LabourOnboarding() {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    skills: "",
    experience: "",
    location: "",
    availability: "",
    expectedWage: "",
    workType: "",
  });
  const [loading, setLoading] = useState(false);

  const workTypes = ["Skilled", "Unskilled", "Semi-skilled"];

  const handleSubmit = async () => {
    if (!formData.fullName || !formData.phone || !formData.skills) {
      Alert.alert("Required Fields", "Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      // In a real app, you would send this data to the backend
      // For now, we'll just navigate to dashboard
      Alert.alert("Success", "Professional profile created successfully!");
      router.replace("/dashboard");
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to create labour profile. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Labour Onboarding</Text>
      <Text style={styles.subtitle}>Create your worker profile</Text>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            value={formData.fullName}
            onChangeText={(text) =>
              setFormData({ ...formData, fullName: text })
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your phone number"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Skills *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="List your skills (e.g., Construction, Plumbing, Electrical, etc.)"
            value={formData.skills}
            onChangeText={(text) => setFormData({ ...formData, skills: text })}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Work Type *</Text>
          <View style={styles.workTypeContainer}>
            {workTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.workTypeOption,
                  formData.workType === type && styles.workTypeSelected,
                ]}
                onPress={() => setFormData({ ...formData, workType: type })}
              >
                <Text
                  style={[
                    styles.workTypeText,
                    formData.workType === type && styles.workTypeTextSelected,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Experience</Text>
          <TextInput
            style={styles.input}
            placeholder="Years of experience (e.g., 2 years, 5+ years)"
            value={formData.experience}
            onChangeText={(text) =>
              setFormData({ ...formData, experience: text })
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your current location"
            value={formData.location}
            onChangeText={(text) =>
              setFormData({ ...formData, location: text })
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Availability</Text>
          <TextInput
            style={styles.input}
            placeholder="When are you available? (e.g., Full-time, Part-time, Weekends only)"
            value={formData.availability}
            onChangeText={(text) =>
              setFormData({ ...formData, availability: text })
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Expected Wage (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Expected daily/monthly wage"
            value={formData.expectedWage}
            onChangeText={(text) =>
              setFormData({ ...formData, expectedWage: text })
            }
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? "Creating Profile..." : "Create Labour Profile"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 8,
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    color: "#666",
    paddingHorizontal: 24,
  },
  form: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#374151",
  },
  input: {
    backgroundColor: "white",
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
    gap: 8,
  },
  workTypeOption: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
  },
  workTypeSelected: {
    borderColor: "#10b981",
    backgroundColor: "#ecfdf5",
  },
  workTypeText: {
    fontSize: 16,
    color: "#374151",
  },
  workTypeTextSelected: {
    color: "#059669",
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#10b981",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  submitButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
