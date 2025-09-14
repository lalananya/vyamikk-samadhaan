import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getToken } from "../../src/auth";
import Strings from "../../src/strings";

const OrgHomeScreen = () => {
  const router = useRouter();

  // Force redirect to login if no token
  useEffect(() => {
    const checkAuth = async () => {
      const token = await getToken();
      if (!token) {
        console.log("No token found, redirecting to login");
        router.replace("/login");
      }
    };
    checkAuth();
  }, []);

  const tiles = [
    {
      id: "post-jobs",
      title: Strings.DASHBOARD.ORGANISATION.POST_JOBS,
      icon: "add-circle-outline",
      color: "#4CAF50",
      onPress: () => router.push("/job-posts"),
    },
    {
      id: "manage-jobs",
      title: Strings.DASHBOARD.ORGANISATION.MANAGE_JOBS,
      icon: "briefcase-outline",
      color: "#2196F3",
      onPress: () => router.push("/job-posts"),
    },
    {
      id: "employees",
      title: Strings.DASHBOARD.ORGANISATION.EMPLOYEES,
      icon: "people-outline",
      color: "#FF9800",
      onPress: () => router.push("/profile"),
    },
    {
      id: "ledger",
      title: Strings.DASHBOARD.ORGANISATION.LEDGER,
      icon: "book-outline",
      color: "#9C27B0",
      onPress: () => router.push("/ledger"),
    },
    {
      id: "loi",
      title: Strings.DASHBOARD.ORGANISATION.LOI,
      icon: "document-text-outline",
      color: "#F44336",
      onPress: () => router.push("/loi"),
    },
    {
      id: "attendance-approvals",
      title: Strings.DASHBOARD.ORGANISATION.ATTENDANCE_APPROVALS,
      icon: "checkmark-circle-outline",
      color: "#607D8B",
      onPress: () => router.push("/attendance/approvals"),
    },
    {
      id: "notifications",
      title: Strings.DASHBOARD.ORGANISATION.NOTIFICATIONS,
      icon: "notifications-outline",
      color: "#795548",
      onPress: () => router.push("/notifications"),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Organisation Dashboard</Text>
          <Text style={styles.subtitle}>Manage your business operations</Text>
        </View>

        <View style={styles.tilesContainer}>
          {tiles.map((tile) => (
            <TouchableOpacity
              key={tile.id}
              style={[styles.tile, { borderLeftColor: tile.color }]}
              onPress={tile.onPress}
            >
              <View style={styles.tileContent}>
                <Ionicons
                  name={tile.icon as any}
                  size={32}
                  color={tile.color}
                />
                <Text style={styles.tileTitle}>{tile.title}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Extra padding for bottom navigation
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  tilesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tile: {
    width: "48%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tileContent: {
    alignItems: "center",
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginTop: 8,
  },
});

export default OrgHomeScreen;
