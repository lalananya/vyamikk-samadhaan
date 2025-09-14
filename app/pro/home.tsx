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

const ProHomeScreen = () => {
  const router = useRouter();

  // Debug: Log when this screen loads
  console.log(
    "Professional Dashboard loaded - this should not happen without login!",
  );

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
      id: "find-jobs",
      title: Strings.DASHBOARD.PROFESSIONAL.FIND_JOBS,
      icon: "search-outline",
      color: "#4CAF50",
      onPress: () => router.push("/job-search"),
    },
    {
      id: "punch-in-out",
      title: Strings.DASHBOARD.PROFESSIONAL.PUNCH_IN_OUT,
      icon: "time-outline",
      color: "#2196F3",
      onPress: () => router.push("/punch-in-out"),
    },
    {
      id: "my-profile",
      title: Strings.DASHBOARD.PROFESSIONAL.MY_PROFILE,
      icon: "person-outline",
      color: "#FF9800",
      onPress: () => router.push("/profile"),
    },
    {
      id: "smart-search",
      title: Strings.DASHBOARD.PROFESSIONAL.SMART_SEARCH,
      icon: "bulb-outline",
      color: "#9C27B0",
      onPress: () => router.push("/smart-search"),
    },
    {
      id: "notifications",
      title: Strings.DASHBOARD.PROFESSIONAL.NOTIFICATIONS,
      icon: "notifications-outline",
      color: "#F44336",
      onPress: () => router.push("/notifications"),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Professional Dashboard</Text>
          <Text style={styles.subtitle}>
            Find opportunities and grow your career
          </Text>
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

export default ProHomeScreen;
