import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";

interface BlockingSplashProps {
  message?: string;
}

const BlockingSplash: React.FC<BlockingSplashProps> = ({
  message = "Loading...",
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.subtitle}>
        Please wait while we verify your access
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 20,
  },
  message: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginTop: 20,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginTop: 8,
    textAlign: "center",
  },
});

export default BlockingSplash;
