import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from "react-native";
import { router } from "expo-router";
import {
  partnershipService,
  Partner,
} from "../src/services/PartnershipService";
import { analytics } from "../src/analytics/AnalyticsService";
import AuthenticatedLayout from "../src/layouts/AuthenticatedLayout";

interface PartnershipFormData {
  gstin: string;
  tradeName: string;
  principalPlace: {
    city: string;
    state: string;
  };
  panOfFirm?: string;
  partners: Partner[];
  operatingPartnerId: string;
}

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
  "Puducherry",
  "Chandigarh",
  "Jammu and Kashmir",
  "Ladakh",
];

export default function PartnershipRegistrationScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

  const [formData, setFormData] = useState<PartnershipFormData>({
    gstin: "",
    tradeName: "",
    principalPlace: {
      city: "",
      state: "",
    },
    panOfFirm: "",
    partners: [],
    operatingPartnerId: "",
  });

  const [newPartner, setNewPartner] = useState({
    fullName: "",
    mobile: "",
    email: "",
    shareRatio: "",
    isOperatingPartner: false,
  });

  const handleNext = () => {
    if (step === 1) {
      if (
        !formData.gstin ||
        !formData.tradeName ||
        !formData.principalPlace.city ||
        !formData.principalPlace.state
      ) {
        Alert.alert("Required Fields", "Please fill in all required fields");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (formData.partners.length === 0) {
        Alert.alert("Partners Required", "Please add at least one partner");
        return;
      }
      if (!formData.operatingPartnerId) {
        Alert.alert(
          "Operating Partner Required",
          "Please select an operating partner",
        );
        return;
      }
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Create partnership registration
      const partnership =
        await partnershipService.createPartnershipRegistration({
          organizationId: "temp_org_id", // This would come from the organization creation flow
          gstin: formData.gstin,
          tradeName: formData.tradeName,
          principalPlace: formData.principalPlace,
          panOfFirm: formData.panOfFirm,
          partners: formData.partners,
          operatingPartnerId: formData.operatingPartnerId,
        });

      // Send partner invites
      await partnershipService.sendPartnerInvites(partnership.id);

      // Track completion
      analytics.track({
        event: "partnership_registration_completed",
        properties: {
          partnershipId: partnership.id,
          partnerCount: formData.partners.length,
          operatingPartnerId: formData.operatingPartnerId,
        },
        timestamp: new Date(),
      });

      Alert.alert(
        "Partnership Registration Created",
        "Partner invites have been sent. You can track the status in your organization dashboard.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/organizations"),
          },
        ],
      );
    } catch (error) {
      console.error("Error creating partnership registration:", error);
      Alert.alert("Error", "Failed to create partnership registration");
    } finally {
      setLoading(false);
    }
  };

  const addPartner = () => {
    if (!newPartner.fullName || !newPartner.mobile || !newPartner.shareRatio) {
      Alert.alert(
        "Required Fields",
        "Please fill in partner name, mobile, and share ratio",
      );
      return;
    }

    const partner: Partner = {
      id: `partner_${Date.now()}`,
      fullName: newPartner.fullName,
      mobile: newPartner.mobile,
      email: newPartner.email || undefined,
      shareRatio: newPartner.shareRatio,
      isOperatingPartner: newPartner.isOperatingPartner,
      status: "pending",
    };

    setFormData((prev) => ({
      ...prev,
      partners: [...prev.partners, partner],
      operatingPartnerId: newPartner.isOperatingPartner
        ? partner.id
        : prev.operatingPartnerId,
    }));

    setNewPartner({
      fullName: "",
      mobile: "",
      email: "",
      shareRatio: "",
      isOperatingPartner: false,
    });
    setShowPartnerModal(false);
  };

  const editPartner = (partner: Partner) => {
    setEditingPartner(partner);
    setNewPartner({
      fullName: partner.fullName,
      mobile: partner.mobile,
      email: partner.email || "",
      shareRatio: partner.shareRatio,
      isOperatingPartner: partner.isOperatingPartner,
    });
    setShowPartnerModal(true);
  };

  const updatePartner = () => {
    if (!editingPartner) return;

    if (!newPartner.fullName || !newPartner.mobile || !newPartner.shareRatio) {
      Alert.alert(
        "Required Fields",
        "Please fill in partner name, mobile, and share ratio",
      );
      return;
    }

    setFormData((prev) => ({
      ...prev,
      partners: prev.partners.map((p) =>
        p.id === editingPartner.id
          ? {
              ...p,
              fullName: newPartner.fullName,
              mobile: newPartner.mobile,
              email: newPartner.email || undefined,
              shareRatio: newPartner.shareRatio,
              isOperatingPartner: newPartner.isOperatingPartner,
            }
          : p,
      ),
      operatingPartnerId: newPartner.isOperatingPartner
        ? editingPartner.id
        : prev.operatingPartnerId,
    }));

    setEditingPartner(null);
    setNewPartner({
      fullName: "",
      mobile: "",
      email: "",
      shareRatio: "",
      isOperatingPartner: false,
    });
    setShowPartnerModal(false);
  };

  const removePartner = (partnerId: string) => {
    setFormData((prev) => ({
      ...prev,
      partners: prev.partners.filter((p) => p.id !== partnerId),
      operatingPartnerId:
        prev.operatingPartnerId === partnerId ? "" : prev.operatingPartnerId,
    }));
  };

  const setOperatingPartner = (partnerId: string) => {
    setFormData((prev) => ({
      ...prev,
      partners: prev.partners.map((p) => ({
        ...p,
        isOperatingPartner: p.id === partnerId,
      })),
      operatingPartnerId: partnerId,
    }));
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Partnership Details</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>GSTIN *</Text>
        <TextInput
          style={styles.input}
          value={formData.gstin}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, gstin: text }))
          }
          placeholder="22AAAAA0000A1Z5"
          placeholderTextColor="#666"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Trade Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.tradeName}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, tradeName: text }))
          }
          placeholder="Enter trade name"
          placeholderTextColor="#666"
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>City *</Text>
          <TextInput
            style={styles.input}
            value={formData.principalPlace.city}
            onChangeText={(text) =>
              setFormData((prev) => ({
                ...prev,
                principalPlace: { ...prev.principalPlace, city: text },
              }))
            }
            placeholder="City"
            placeholderTextColor="#666"
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>State *</Text>
          <TextInput
            style={styles.input}
            value={formData.principalPlace.state}
            onChangeText={(text) =>
              setFormData((prev) => ({
                ...prev,
                principalPlace: { ...prev.principalPlace, state: text },
              }))
            }
            placeholder="State"
            placeholderTextColor="#666"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>PAN of Firm (Optional)</Text>
        <TextInput
          style={styles.input}
          value={formData.panOfFirm}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, panOfFirm: text }))
          }
          placeholder="AAAAA0000A"
          placeholderTextColor="#666"
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Partner Roster</Text>

      <View style={styles.partnersList}>
        {formData.partners.map((partner) => (
          <View key={partner.id} style={styles.partnerCard}>
            <View style={styles.partnerHeader}>
              <Text style={styles.partnerName}>{partner.fullName}</Text>
              {partner.isOperatingPartner && (
                <View style={styles.operatingBadge}>
                  <Text style={styles.operatingText}>Operating Partner</Text>
                </View>
              )}
            </View>
            <Text style={styles.partnerDetails}>{partner.mobile}</Text>
            <Text style={styles.partnerDetails}>
              Share: {partner.shareRatio}
            </Text>
            <View style={styles.partnerActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => editPartner(partner)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePartner(partner.id)}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
              {!partner.isOperatingPartner && (
                <TouchableOpacity
                  style={styles.setOperatingButton}
                  onPress={() => setOperatingPartner(partner.id)}
                >
                  <Text style={styles.setOperatingButtonText}>
                    Set as Operating
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.addPartnerButton}
        onPress={() => setShowPartnerModal(true)}
      >
        <Text style={styles.addPartnerButtonText}>+ Add Partner</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <AuthenticatedLayout title="Partnership Registration">
      <ScrollView style={styles.container}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressStep,
              step >= 1 && styles.progressStepActive,
            ]}
          >
            <Text
              style={[
                styles.progressStepText,
                step >= 1 && styles.progressStepTextActive,
              ]}
            >
              1
            </Text>
          </View>
          <View
            style={[
              styles.progressLine,
              step >= 2 && styles.progressLineActive,
            ]}
          />
          <View
            style={[
              styles.progressStep,
              step >= 2 && styles.progressStepActive,
            ]}
          >
            <Text
              style={[
                styles.progressStepText,
                step >= 2 && styles.progressStepTextActive,
              ]}
            >
              2
            </Text>
          </View>
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          {step > 1 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep(step - 1)}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.nextButton, loading && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={loading}
          >
            <Text style={styles.nextButtonText}>
              {loading
                ? "Creating..."
                : step === 2
                  ? "Create Partnership"
                  : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Partner Modal */}
      <Modal
        visible={showPartnerModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingPartner ? "Edit Partner" : "Add Partner"}
            </Text>
            <TouchableOpacity onPress={() => setShowPartnerModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={newPartner.fullName}
                onChangeText={(text) =>
                  setNewPartner((prev) => ({ ...prev, fullName: text }))
                }
                placeholder="Enter full name"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number *</Text>
              <TextInput
                style={styles.input}
                value={newPartner.mobile}
                onChangeText={(text) =>
                  setNewPartner((prev) => ({ ...prev, mobile: text }))
                }
                placeholder="+91 9876543210"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email (Optional)</Text>
              <TextInput
                style={styles.input}
                value={newPartner.email}
                onChangeText={(text) =>
                  setNewPartner((prev) => ({ ...prev, email: text }))
                }
                placeholder="partner@example.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Share Ratio *</Text>
              <TextInput
                style={styles.input}
                value={newPartner.shareRatio}
                onChangeText={(text) =>
                  setNewPartner((prev) => ({ ...prev, shareRatio: text }))
                }
                placeholder="e.g., 50%, 1/3, 25%"
                placeholderTextColor="#666"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.checkboxContainer,
                newPartner.isOperatingPartner &&
                  styles.checkboxContainerChecked,
              ]}
              onPress={() =>
                setNewPartner((prev) => ({
                  ...prev,
                  isOperatingPartner: !prev.isOperatingPartner,
                }))
              }
            >
              <Text style={styles.checkboxText}>Set as Operating Partner</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowPartnerModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={editingPartner ? updatePartner : addPartner}
            >
              <Text style={styles.saveButtonText}>
                {editingPartner ? "Update" : "Add"} Partner
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AuthenticatedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  progressStepActive: {
    backgroundColor: "#007AFF",
  },
  progressStepText: {
    color: "#999",
    fontSize: 16,
    fontWeight: "bold",
  },
  progressStepTextActive: {
    color: "#fff",
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#333",
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: "#007AFF",
  },
  stepContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
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
  row: {
    flexDirection: "row",
  },
  partnersList: {
    marginBottom: 20,
  },
  partnerCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  partnerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  partnerName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  operatingBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  operatingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  partnerDetails: {
    fontSize: 14,
    color: "#999",
    marginBottom: 4,
  },
  partnerActions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  editButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  removeButton: {
    backgroundColor: "#ff4444",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  setOperatingButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  setOperatingButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  addPartnerButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  addPartnerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  navigationContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  backButton: {
    flex: 1,
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  nextButton: {
    flex: 2,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "#666",
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#111",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    marginTop: 8,
  },
  checkboxContainerChecked: {
    borderColor: "#007AFF",
    backgroundColor: "#001a33",
  },
  checkboxText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 8,
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
  saveButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
