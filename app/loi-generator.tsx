// app/loi-generator.tsx
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
import { TemplateUtils } from "../src/utils/TemplateUtils";
import { ValidationUtils } from "../src/utils/ValidationUtils";
import { AlertUtils } from "../src/utils/AlertUtils";
import { apiService } from "../src/services/ApiService";
import { router } from "expo-router";
import { apiFetch } from "../src/api";
import { getToken } from "../src/auth";

interface LOIData {
  employerName: string;
  employerAddress: string;
  employeeName: string;
  employeePhone: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  salary: string;
  workLocation: string;
  terms: string;
}

export default function LOIGenerator() {
  const [formData, setFormData] = useState<LOIData>({
    employerName: "",
    employerAddress: "",
    employeeName: "",
    employeePhone: "",
    jobTitle: "",
    startDate: "",
    endDate: "",
    salary: "",
    workLocation: "",
    terms: "",
  });
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [generatedOTP, setGeneratedOTP] = useState("");

  const handleSubmit = async () => {
    if (
      !formData.employerName ||
      !formData.employeeName ||
      !formData.employeePhone ||
      !formData.jobTitle
    ) {
      Alert.alert("Required Fields", "Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      // Generate OTP for LOI
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOTP(otp);

      // In a real app, this would send OTP to employee's phone
      Alert.alert(
        "OTP Generated",
        `OTP sent to ${formData.employeePhone}: ${otp}`,
      );

      setPreviewVisible(true);
    } catch (error) {
      Alert.alert("Error", "Failed to generate LOI. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendLOI = () => {
    setPreviewVisible(false);
    setOtpModalVisible(true);
  };

  const verifyOTPAndSend = async () => {
    if (otpInput !== generatedOTP) {
      Alert.alert("Invalid OTP", "Please enter the correct OTP");
      return;
    }

    try {
      // In a real app, this would send the LOI to the backend and employee
      Alert.alert("Success", "LOI sent successfully and acknowledged!");
      setOtpModalVisible(false);
      setOtpInput("");
      setGeneratedOTP("");

      // Reset form
      setFormData({
        employerName: "",
        employerAddress: "",
        employeeName: "",
        employeePhone: "",
        jobTitle: "",
        startDate: "",
        endDate: "",
        salary: "",
        workLocation: "",
        terms: "",
      });
    } catch (error) {
      Alert.alert("Error", "Failed to send LOI. Please try again.");
    }
  };

  const generateLOIPreview = () => {
    return TemplateUtils.generateLOIPreview(formData);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LOI Generator</Text>
      <Text style={styles.subtitle}>
        Generate Letter of Intent for employees
      </Text>

      <ScrollView style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Employer Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter employer/company name"
            value={formData.employerName}
            onChangeText={(text) =>
              setFormData({ ...formData, employerName: text })
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Employer Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter employer address"
            value={formData.employerAddress}
            onChangeText={(text) =>
              setFormData({ ...formData, employerAddress: text })
            }
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Employee Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter employee name"
            value={formData.employeeName}
            onChangeText={(text) =>
              setFormData({ ...formData, employeeName: text })
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Employee Phone *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter employee phone number"
            value={formData.employeePhone}
            onChangeText={(text) =>
              setFormData({ ...formData, employeePhone: text })
            }
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Job Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter job title/position"
            value={formData.jobTitle}
            onChangeText={(text) =>
              setFormData({ ...formData, jobTitle: text })
            }
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Start Date</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/YYYY"
              value={formData.startDate}
              onChangeText={(text) =>
                setFormData({ ...formData, startDate: text })
              }
            />
          </View>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>End Date</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/YYYY"
              value={formData.endDate}
              onChangeText={(text) =>
                setFormData({ ...formData, endDate: text })
              }
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Salary</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter salary details"
            value={formData.salary}
            onChangeText={(text) => setFormData({ ...formData, salary: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Work Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter work location"
            value={formData.workLocation}
            onChangeText={(text) =>
              setFormData({ ...formData, workLocation: text })
            }
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Terms and Conditions</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter any specific terms and conditions"
            value={formData.terms}
            onChangeText={(text) => setFormData({ ...formData, terms: text })}
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? "Generating LOI..." : "Generate LOI"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={previewVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>LOI Preview</Text>
            <ScrollView style={styles.previewContent}>
              <Text style={styles.loiText}>{generateLOIPreview()}</Text>
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setPreviewVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.sendButton]}
                onPress={handleSendLOI}
              >
                <Text style={styles.sendButtonText}>Send LOI</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              Enter the OTP sent to {formData.employeePhone} to send the LOI
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
                onPress={verifyOTPAndSend}
              >
                <Text style={styles.verifyButtonText}>Send & Verify</Text>
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
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
    width: "95%",
    maxWidth: 500,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    color: "#1a1a1a",
  },
  modalDescription: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#666",
  },
  previewContent: {
    maxHeight: 300,
    marginBottom: 20,
  },
  loiText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
    fontFamily: "monospace",
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
  sendButton: {
    backgroundColor: "#10b981",
  },
  verifyButton: {
    backgroundColor: "#3b82f6",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  sendButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  verifyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
