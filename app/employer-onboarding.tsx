// app/employer-onboarding.tsx
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
// import { apiFetch } from "../src/api"; // Not currently used

export default function EmployerOnboarding() {
  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "",
    registrationNumber: "",
    contactPerson: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [loading, setLoading] = useState(false);

  const businessTypes = [
    "Proprietorship",
    "Partnership",
    "LLP (Limited Liability Partnership)",
    "Private Limited",
    "Public Limited",
    "Unregistered Business",
  ];

  const handleSubmit = async () => {
    if (
      !formData.businessName ||
      !formData.businessType ||
      !formData.contactPerson
    ) {
      Alert.alert("Required Fields", "Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      // In a real app, you would send this data to the backend
      // For now, we'll just navigate to dashboard
      Alert.alert("Success", "Organisation profile created successfully!");
      router.replace("/dashboard");
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to create employer profile. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Employer Onboarding</Text>
      <Text style={styles.subtitle}>Tell us about your business</Text>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Business Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your business name"
            value={formData.businessName}
            onChangeText={(text) =>
              setFormData({ ...formData, businessName: text })
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Business Type *</Text>
          <View style={styles.businessTypeContainer}>
            {businessTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.businessTypeOption,
                  formData.businessType === type && styles.businessTypeSelected,
                ]}
                onPress={() => setFormData({ ...formData, businessType: type })}
              >
                <Text
                  style={[
                    styles.businessTypeText,
                    formData.businessType === type &&
                      styles.businessTypeTextSelected,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Registration Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter registration number (if applicable)"
            value={formData.registrationNumber}
            onChangeText={(text) =>
              setFormData({ ...formData, registrationNumber: text })
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contact Person *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter contact person name"
            value={formData.contactPerson}
            onChangeText={(text) =>
              setFormData({ ...formData, contactPerson: text })
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter business address"
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              placeholder="City"
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
            />
          </View>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              placeholder="State"
              value={formData.state}
              onChangeText={(text) => setFormData({ ...formData, state: text })}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pincode</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter pincode"
            value={formData.pincode}
            onChangeText={(text) => setFormData({ ...formData, pincode: text })}
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? "Creating Profile..." : "Create Employer Profile"}
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  businessTypeContainer: {
    gap: 8,
  },
  businessTypeOption: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
  },
  businessTypeSelected: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  businessTypeText: {
    fontSize: 16,
    color: "#374151",
  },
  businessTypeTextSelected: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#3b82f6",
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
