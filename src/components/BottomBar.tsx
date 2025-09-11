import React from "react";
import { View, StyleSheet, Platform } from "react-native";

interface BottomBarProps {
  children: React.ReactNode;
  style?: any;
}

export default function BottomBar({ children, style }: BottomBarProps) {
  return <View style={[styles.container, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e1e5e9",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16, // Account for home indicator
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
});
