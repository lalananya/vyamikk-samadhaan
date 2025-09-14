import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import IntroLogoWeb from "../src/components/IntroLogoWeb";
import { brand } from "../src/theme/brand";

export default function IntroWeb() {
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
        <IntroLogoWeb
          autoplay
          durationMs={3000}
          onDone={handleDone}
          size={280}
        />
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
});
