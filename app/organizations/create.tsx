import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { request } from "../../src/net/http";

interface CreateOrgForm {
  name: string;
  slug: string;
  type: "msme" | "enterprise" | "ngo";
  industry: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
}

export default function CreateOrganizationScreen() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateOrgForm>({
    name: "",
    slug: "",
    type: "msme",
    industry: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    website: "",
  });

  const [errors, setErrors] = useState<Partial<CreateOrgForm>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateOrgForm> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Organization name is required";
    }

    if (!formData.slug.trim()) {
      newErrors.slug = "Organization slug is required";
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug =
        "Slug can only contain lowercase letters, numbers, and hyphens";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (formData.phone && !/^[0-9+\-\s()]+$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (formData.pincode && !/^[0-9]{6}$/.test(formData.pincode)) {
      newErrors.pincode = "Pincode must be 6 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({ ...prev, name }));
    if (!formData.slug || formData.slug === generateSlug(formData.name)) {
      setFormData((prev) => ({ ...prev, slug: generateSlug(name) }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const response = await request("/organizations", {
        method: "POST",
        json: formData,
      });

      Alert.alert(
        "Success!",
        "Organization created successfully. You are now the owner.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/dashboard"),
          },
        ],
      );
    } catch (error: any) {
      console.error("Failed to create organization:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to create organization. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const organizationTypes = [
    {
      value: "msme",
      label: "MSME",
      icon: "🏭",
      description: "Micro, Small & Medium Enterprise",
    },
    {
      value: "enterprise",
      label: "Enterprise",
      icon: "🏢",
      description: "Large Corporation",
    },
    {
      value: "ngo",
      label: "NGO",
      icon: "🤝",
      description: "Non-Governmental Organization",
    },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create Organization</Text>
        </View>

        <View style={styles.form}>
          {/* Organization Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Organization Type</Text>
            <View style={styles.typeContainer}>
              {organizationTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeCard,
                    formData.type === type.value && styles.selectedTypeCard,
                  ]}
                  onPress={() =>
                    setFormData((prev) => ({
                      ...prev,
                      type: type.value as any,
                    }))
                  }
                >
                  <Text style={styles.typeIcon}>{type.icon}</Text>
                  <Text style={styles.typeLabel}>{type.label}</Text>
                  <Text style={styles.typeDescription}>{type.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Organization Name *</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={formData.name}
                onChangeText={handleNameChange}
                placeholder="Enter organization name"
                placeholderTextColor="#666"
              />
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Organization Slug *</Text>
              <TextInput
                style={[styles.input, errors.slug && styles.inputError]}
                value={formData.slug}
                onChangeText={(slug) =>
                  setFormData((prev) => ({ ...prev, slug }))
                }
                placeholder="organization-slug"
                placeholderTextColor="#666"
                autoCapitalize="none"
              />
              <Text style={styles.helpText}>
                This will be your organization's unique identifier (e.g.,
                my-company)
              </Text>
              {errors.slug && (
                <Text style={styles.errorText}>{errors.slug}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Industry</Text>
              <TextInput
                style={styles.input}
                value={formData.industry}
                onChangeText={(industry) =>
                  setFormData((prev) => ({ ...prev, industry }))
                }
                placeholder="e.g., Manufacturing, IT Services, Healthcare"
                placeholderTextColor="#666"
              />
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                value={formData.phone}
                onChangeText={(phone) =>
                  setFormData((prev) => ({ ...prev, phone }))
                }
                placeholder="+91 9876543210"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
              {errors.phone && (
                <Text style={styles.errorText}>{errors.phone}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={formData.email}
                onChangeText={(email) =>
                  setFormData((prev) => ({ ...prev, email }))
                }
                placeholder="contact@organization.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Website</Text>
              <TextInput
                style={styles.input}
                value={formData.website}
                onChangeText={(website) =>
                  setFormData((prev) => ({ ...prev, website }))
                }
                placeholder="https://www.organization.com"
                placeholderTextColor="#666"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.address}
                onChangeText={(address) =>
                  setFormData((prev) => ({ ...prev, address }))
                }
                placeholder="Street address, building, etc."
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={formData.city}
                  onChangeText={(city) =>
                    setFormData((prev) => ({ ...prev, city }))
                  }
                  placeholder="City"
                  placeholderTextColor="#666"
                />
              </View>

              <View
                style={[styles.inputGroup, styles.flex1, styles.marginLeft]}
              >
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  value={formData.state}
                  onChangeText={(state) =>
                    setFormData((prev) => ({ ...prev, state }))
                  }
                  placeholder="State"
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Pincode</Text>
              <TextInput
                style={[styles.input, errors.pincode && styles.inputError]}
                value={formData.pincode}
                onChangeText={(pincode) =>
                  setFormData((prev) => ({ ...prev, pincode }))
                }
                placeholder="123456"
                placeholderTextColor="#666"
                keyboardType="numeric"
                maxLength={6}
              />
              {errors.pincode && (
                <Text style={styles.errorText}>{errors.pincode}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Create Organization</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  form: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 16,
  },
  typeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  typeCard: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  selectedTypeCard: {
    borderColor: "#007AFF",
    backgroundColor: "#1a1a2e",
  },
  typeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#111",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
  },
  inputError: {
    borderColor: "#FF6B6B",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
  },
  flex1: {
    flex: 1,
  },
  marginLeft: {
    marginLeft: 12,
  },
  helpText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: "#FF6B6B",
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: "#333",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
