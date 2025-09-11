import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Home() {
  // This screen should never be reached due to BootGuard
  // But if it is, show a fallback message
  console.warn(
    "⚠️ Index: This screen should not be reached - BootGuard should handle routing",
  );

  return (
    <View style={s.container}>
      <Text style={s.message}>Redirecting...</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  message: {
    color: "#fff",
    fontSize: 16,
  },
});
