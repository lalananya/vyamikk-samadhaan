import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { brand } from "../src/theme/brand";

export default function IntroScreen() {
  const handleSkip = () => {
    router.replace("/login");
  };

  const handleDone = () => {
    router.replace("/login");
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.skipButton}
        onPress={handleSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip intro"
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>Vyamikk Samadhaan</Text>
        <Text style={styles.subtitleText}>Welcome to the future of work</Text>
        <Pressable style={styles.continueButton} onPress={handleDone}>
          <Text style={styles.continueText}>Get Started</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.bg,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  skipButton: {
    position: "absolute",
    top: 60,
    right: 24,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  skipText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
  },
  logoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 18,
    color: "#cccccc",
    marginBottom: 32,
    textAlign: "center",
  },
  continueButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  continueText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
