import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Strings from "../src/strings";

const ChooseRoleScreen = () => {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const roles = [
    {
      id: Strings.ROLES.ORGANISATION,
      title: Strings.ROLES.ORGANISATION_LABEL,
      description: Strings.ROLE_DESCRIPTIONS.ORGANISATION,
      icon: "business-outline",
      color: "#4CAF50",
    },
    {
      id: Strings.ROLES.PROFESSIONAL,
      title: Strings.ROLES.PROFESSIONAL_LABEL,
      description: Strings.ROLE_DESCRIPTIONS.PROFESSIONAL,
      icon: "person-outline",
      color: "#2196F3",
    },
  ];

  const handleRoleSelect = async (role: string) => {
    if (isLoading) return;

    setSelectedRole(role);
    setIsLoading(true);

    try {
      // User already has a role from login, just navigate to appropriate home screen
      if (role === Strings.ROLES.ORGANISATION) {
        router.replace("/org/home");
      } else {
        router.replace("/pro/home");
      }
    } catch (error) {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{Strings.LABELS.CHOOSE_ROLE}</Text>
          <Text style={styles.subtitle}>
            {Strings.MESSAGES.CHOOSE_ROLE_ONCE}
          </Text>
        </View>

        <View style={styles.rolesContainer}>
          {roles.map((role) => (
            <TouchableOpacity
              key={role.id}
              style={[
                styles.roleCard,
                selectedRole === role.id && styles.roleCardSelected,
                { borderColor: role.color },
              ]}
              onPress={() => handleRoleSelect(role.id)}
              disabled={isLoading}
            >
              <View style={styles.roleContent}>
                <Ionicons
                  name={role.icon as any}
                  size={48}
                  color={role.color}
                  style={styles.roleIcon}
                />
                <Text style={[styles.roleTitle, { color: role.color }]}>
                  {role.title}
                </Text>
                <Text style={styles.roleDescription}>{role.description}</Text>
                {selectedRole === role.id && isLoading && (
                  <Text style={styles.loadingText}>Setting up...</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            You can request a role change later by contacting support
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  rolesContainer: {
    gap: 20,
  },
  roleCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  roleCardSelected: {
    borderWidth: 3,
  },
  roleContent: {
    alignItems: "center",
  },
  roleIcon: {
    marginBottom: 16,
  },
  roleTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  roleDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "600",
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default ChooseRoleScreen;
