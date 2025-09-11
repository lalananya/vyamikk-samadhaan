// app/employee-onboarding.tsx
import React, { useState } from "react";
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

interface EmployeeData {
  name: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  skills: string;
  experience: string;
  idProof: string;
  idNumber: string;
}

export default function EmployeeOnboarding() {
  const [formData, setFormData] = useState<EmployeeData>({
    name: "",
    phone: "",
    email: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    skills: "",
    experience: "",
    idProof: "",
    idNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [generatedOTP, setGeneratedOTP] = useState("");

  const idProofTypes = [
    "Aadhaar Card",
    "PAN Card",
    "Driving License",
    "Voter ID",
    "Passport",
  ];

  const handleSubmit = async () => {
    if (
      !formData.name ||
      !formData.phone ||
      !formData.address ||
      !formData.idProof ||
      !formData.idNumber
    ) {
      Alert.alert("Required Fields", "Please fill in all required fields");
      return;
    }

    if (!termsAccepted) {
      Alert.alert("Terms Required", "Please accept the terms and conditions");
      return;
    }

    setLoading(true);
    try {
      // Generate OTP for employee onboarding
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOTP(otp);

      // In a real app, this would send OTP to employee's phone
      Alert.alert("OTP Generated", `OTP sent to ${formData.phone}: ${otp}`);

      setOtpModalVisible(true);
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to start onboarding process. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyOTPAndComplete = async () => {
    if (otpInput !== generatedOTP) {
      Alert.alert("Invalid OTP", "Please enter the correct OTP");
      return;
    }

    try {
      // In a real app, this would send the employee data to the backend
      Alert.alert("Success", "Employee onboarded successfully!");
      setOtpModalVisible(false);
      setOtpInput("");
      setGeneratedOTP("");

      // Reset form
      setFormData({
        name: "",
        phone: "",
        email: "",
        address: "",
        emergencyContact: "",
        emergencyPhone: "",
        skills: "",
        experience: "",
        idProof: "",
        idNumber: "",
      });
      setTermsAccepted(false);
    } catch (error) {
      Alert.alert("Error", "Failed to complete onboarding. Please try again.");
    }
  };

  const renderTermsAndConditions = () => (
    <View style={styles.termsContainer}>
      <Text style={styles.termsTitle}>Terms and Conditions</Text>
      <ScrollView style={styles.termsContent}>
        <Text style={styles.termsText}>
          1. The employee agrees to work according to the terms specified in
          their employment contract.
        </Text>
        <Text style={styles.termsText}>
          2. The employee must maintain confidentiality of all company
          information.
        </Text>
        <Text style={styles.termsText}>
          3. The employee agrees to follow all safety protocols and company
          policies.
        </Text>
        <Text style={styles.termsText}>
          4. The employee's personal information will be used for employment
          purposes only.
        </Text>
        <Text style={styles.termsText}>
          5. The employee agrees to provide accurate information and update it
          as needed.
        </Text>
        <Text style={styles.termsText}>
          6. The employer reserves the right to terminate employment as per
          company policy.
        </Text>
        <Text style={styles.termsText}>
          7. The employee agrees to work the hours specified in their contract.
        </Text>
        <Text style={styles.termsText}>
          8. All disputes will be resolved through appropriate legal channels.
        </Text>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.checkboxContainer,
          termsAccepted && styles.checkboxSelected,
        ]}
        onPress={() => setTermsAccepted(!termsAccepted)}
      >
        <Text style={styles.checkboxText}>
          I accept the terms and conditions
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Employee Onboarding</Text>
      <Text style={styles.subtitle}>Add new employee to your organization</Text>

      <ScrollView style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter employee's full name"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter phone number"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter email address"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter complete address"
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Emergency Contact Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter emergency contact name"
            value={formData.emergencyContact}
            onChangeText={(text) =>
              setFormData({ ...formData, emergencyContact: text })
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Emergency Contact Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter emergency contact phone"
            value={formData.emergencyPhone}
            onChangeText={(text) =>
              setFormData({ ...formData, emergencyPhone: text })
            }
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Skills</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="List employee's skills"
            value={formData.skills}
            onChangeText={(text) => setFormData({ ...formData, skills: text })}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Experience</Text>
          <TextInput
            style={styles.input}
            placeholder="Years of experience"
            value={formData.experience}
            onChangeText={(text) =>
              setFormData({ ...formData, experience: text })
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>ID Proof Type *</Text>
          <View style={styles.idProofContainer}>
            {idProofTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.idProofOption,
                  formData.idProof === type && styles.idProofSelected,
                ]}
                onPress={() => setFormData({ ...formData, idProof: type })}
              >
                <Text
                  style={[
                    styles.idProofText,
                    formData.idProof === type && styles.idProofTextSelected,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>ID Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter ID number"
            value={formData.idNumber}
            onChangeText={(text) =>
              setFormData({ ...formData, idNumber: text })
            }
          />
        </View>

        {renderTermsAndConditions()}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? "Processing..." : "Onboard Employee"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={otpModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verify OTP</Text>
            <Text style={styles.modalDescription}>
              Enter the OTP sent to {formData.phone} to complete employee
              onboarding
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="Enter OTP"
              value={otpInput}
              onChangeText={setOtpInput}
              keyboardType="numeric"
              maxLength={6}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setOtpModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.verifyButton]}
                onPress={verifyOTPAndComplete}
              >
                <Text style={styles.verifyButtonText}>Complete Onboarding</Text>
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
  idProofContainer: {
    gap: 8,
  },
  idProofOption: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
  },
  idProofSelected: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  idProofText: {
    fontSize: 16,
    color: "#374151",
  },
  idProofTextSelected: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
  termsContainer: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginBottom: 20,
  },
  termsTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#1a1a1a",
  },
  termsContent: {
    maxHeight: 200,
    marginBottom: 16,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  checkboxSelected: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },
  checkboxText: {
    fontSize: 16,
    color: "#374151",
    marginLeft: 8,
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
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
    color: "#1a1a1a",
  },
  modalDescription: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#666",
  },
  otpInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
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
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  verifyButton: {
    backgroundColor: "#3b82f6",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  verifyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
