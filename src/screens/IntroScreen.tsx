import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import IntroLogo from "../components/IntroLogo.native";
import { brand } from "../theme/brand";

type IntroScreenProps = {
  onDone?: () => void;
};

export default function IntroScreen({ onDone }: IntroScreenProps) {
  const handleSkip = () => {
    onDone?.() || router.replace("/login");
  };

  const handleDone = () => {
    onDone?.() || router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Pressable
        style={styles.skipButton}
        onPress={handleSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip intro"
        hitSlop={8}
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <View style={styles.logoContainer}>
        <IntroLogo autoplay durationMs={3000} onDone={handleDone} size={280} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.bg,
    justifyContent: "center",
    alignItems: "center",
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
