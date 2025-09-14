import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import {
  categoryChangeService,
  CategoryChangePolicy,
} from "../services/CategoryChangeService";
import { analytics } from "../analytics/AnalyticsService";

interface CategoryChangeBannerProps {
  userId: string;
  registeredAt: string;
  currentCategory: string;
  onCategoryChange: (newCategory: string) => void;
}

export default function CategoryChangeBanner({
  userId,
  registeredAt,
  currentCategory,
  onCategoryChange,
}: CategoryChangeBannerProps) {
  const [policy, setPolicy] = useState<CategoryChangePolicy | null>(null);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    checkPolicy();
    const interval = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [userId, registeredAt]);

  const checkPolicy = async () => {
    try {
      const policyResult = await categoryChangeService.canChangeCategory(
        userId,
        registeredAt,
      );
      setPolicy(policyResult);

      if (policyResult.canChange && policyResult.timeRemaining) {
        setTimeRemaining(
          categoryChangeService.formatTimeRemaining(policyResult.timeRemaining),
        );
      }
    } catch (error) {
      console.error("Error checking category change policy:", error);
    }
  };

  const updateTimeRemaining = () => {
    if (policy?.canChange && policy.timeRemaining) {
      const newTimeRemaining = policy.timeRemaining - 1000;
      if (newTimeRemaining <= 0) {
        setPolicy({
          ...policy,
          canChange: false,
          reason: "Category change deadline has expired",
        });
        setTimeRemaining("00:00");
      } else {
        setTimeRemaining(
          categoryChangeService.formatTimeRemaining(newTimeRemaining),
        );
        setPolicy({ ...policy, timeRemaining: newTimeRemaining });
      }
    }
  };

  const handleChangeCategory = async () => {
    try {
      await categoryChangeService.openCategoryChange(userId, registeredAt);
      setShowChangeModal(true);
    } catch (error) {
      console.error("Error opening category change:", error);
    }
  };

  const handleAppealRequest = () => {
    Alert.alert(
      "Appeal Category Change",
      "To request a category change after the deadline, please contact support with a valid reason. This feature will be available soon.",
      [{ text: "OK" }],
    );
  };

  if (!policy) {
    return null;
  }

  return (
    <>
      <View
        style={[
          styles.banner,
          policy.canChange ? styles.bannerActive : styles.bannerExpired,
        ]}
      >
        <View style={styles.bannerContent}>
          <Text style={styles.bannerIcon}>
            {policy.canChange ? "⏰" : "🔒"}
          </Text>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>
              {policy.canChange
                ? "Category Change Available"
                : "Category Change Expired"}
            </Text>
            <Text style={styles.bannerSubtitle}>
              {policy.canChange
                ? `Time remaining: ${timeRemaining}`
                : "72-hour change window has expired"}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.bannerButton,
              policy.canChange
                ? styles.bannerButtonActive
                : styles.bannerButtonDisabled,
            ]}
            onPress={
              policy.canChange ? handleChangeCategory : handleAppealRequest
            }
            disabled={!policy.canChange}
          >
            <Text
              style={[
                styles.bannerButtonText,
                policy.canChange
                  ? styles.bannerButtonTextActive
                  : styles.bannerButtonTextDisabled,
              ]}
            >
              {policy.canChange ? "Change" : "Appeal"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <CategoryChangeModal
        visible={showChangeModal}
        onClose={() => setShowChangeModal(false)}
        currentCategory={currentCategory}
        onCategoryChange={onCategoryChange}
        userId={userId}
        registeredAt={registeredAt}
      />
    </>
  );
}

// Category Change Modal Component
interface CategoryChangeModalProps {
  visible: boolean;
  onClose: () => void;
  currentCategory: string;
  onCategoryChange: (newCategory: string) => void;
  userId: string;
  registeredAt: string;
}

function CategoryChangeModal({
  visible,
  onClose,
  currentCategory,
  onCategoryChange,
  userId,
  registeredAt,
}: CategoryChangeModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [changing, setChanging] = useState(false);

  const CATEGORIES = [
    { id: "micro_unit", label: "Micro Unit", icon: "🏭" },
    { id: "small_unit", label: "Small Unit", icon: "🏢" },
    { id: "professional", label: "Professional", icon: "👨‍💼" },
    { id: "ca", label: "CA", icon: "📊" },
    { id: "advocate", label: "Advocate", icon: "⚖️" },
    { id: "lawyer", label: "Lawyer", icon: "⚖️" },
    { id: "labour", label: "Labour", icon: "👷" },
    { id: "supervisor", label: "Supervisor", icon: "👨‍💼" },
    { id: "accountant", label: "Accountant", icon: "📈" },
    { id: "owner_partner", label: "Owner/Partner", icon: "👑" },
    { id: "director", label: "Director", icon: "🎯" },
  ];

  const handleConfirmChange = async () => {
    if (!selectedCategory || selectedCategory === currentCategory) {
      Alert.alert("Invalid Selection", "Please select a different category.");
      return;
    }

    try {
      setChanging(true);
      const result = await categoryChangeService.changeCategory(
        userId,
        currentCategory,
        selectedCategory,
        registeredAt,
        "User requested category change",
      );

      if (result.success) {
        onCategoryChange(selectedCategory);
        onClose();
        Alert.alert("Success", "Category changed successfully!");
      } else {
        Alert.alert("Error", result.error || "Failed to change category");
      }
    } catch (error) {
      console.error("Error changing category:", error);
      Alert.alert("Error", "Failed to change category");
    } finally {
      setChanging(false);
    }
  };

  const getRBACPreview = (category: string) => {
    const rbacMap: { [key: string]: string } = {
      micro_unit: "Owner/Manager role in organization",
      small_unit: "Owner/Manager role in organization",
      professional: "No organization role (service-based)",
      ca: "No organization role (service-based)",
      advocate: "No organization role (service-based)",
      lawyer: "No organization role (service-based)",
      labour: "Operator role in organization",
      supervisor: "Manager role in organization",
      accountant: "Accountant role in organization",
      owner_partner: "Owner role in organization",
      director: "Owner/Manager role in organization",
    };
    return rbacMap[category] || "Unknown role";
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Change Category</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <Text style={styles.modalSubtitle}>
            Current: {CATEGORIES.find((c) => c.id === currentCategory)?.label}
          </Text>

          <Text style={styles.sectionTitle}>Select New Category:</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.filter((c) => c.id !== currentCategory).map(
              (category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryOption,
                    selectedCategory === category.id &&
                      styles.categoryOptionSelected,
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={styles.categoryLabel}>{category.label}</Text>
                </TouchableOpacity>
              ),
            )}
          </View>

          {selectedCategory && (
            <View style={styles.rbacPreview}>
              <Text style={styles.rbacTitle}>RBAC Preview:</Text>
              <Text style={styles.rbacText}>
                {getRBACPreview(selectedCategory)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              (!selectedCategory ||
                selectedCategory === currentCategory ||
                changing) &&
                styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirmChange}
            disabled={
              !selectedCategory ||
              selectedCategory === currentCategory ||
              changing
            }
          >
            <Text style={styles.confirmButtonText}>
              {changing ? "Changing..." : "Confirm Change"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  bannerActive: {
    backgroundColor: "#001a33",
    borderColor: "#007AFF",
    borderWidth: 1,
  },
  bannerExpired: {
    backgroundColor: "#333",
    borderColor: "#666",
    borderWidth: 1,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  bannerIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  bannerSubtitle: {
    color: "#ccc",
    fontSize: 12,
  },
  bannerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bannerButtonActive: {
    backgroundColor: "#007AFF",
  },
  bannerButtonDisabled: {
    backgroundColor: "#666",
  },
  bannerButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  bannerButtonTextActive: {
    color: "#fff",
  },
  bannerButtonTextDisabled: {
    color: "#999",
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
    padding: 8,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 18,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalSubtitle: {
    color: "#ccc",
    fontSize: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  categoryOption: {
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    width: "48%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  categoryOptionSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#001a33",
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  categoryLabel: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
  },
  rbacPreview: {
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  rbacTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  rbacText: {
    color: "#ccc",
    fontSize: 12,
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
  confirmButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#333",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
