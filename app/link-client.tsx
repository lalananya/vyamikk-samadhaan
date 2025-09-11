import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { appState } from "../src/state/AppState";
import { bootSequence } from "../src/boot/BootSequence";

export default function LinkClient() {
  const [clientCode, setClientCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLinkClient = async () => {
    if (!clientCode.trim()) {
      Alert.alert("Error", "Please enter a client code");
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement actual client linking logic
      console.log("Linking client with code:", clientCode);

      // For now, simulate successful link
      await new Promise((resolve) => setTimeout(resolve, 1000));

      Alert.alert(
        "Success",
        "Successfully linked to client! You can now access their workspace.",
        [
          {
            text: "Continue",
            onPress: async () => {
              // Reset boot sequence to re-evaluate user state
              bootSequence.reset();
              // The RootRouterGuard will pick up the reset and re-route
            },
          },
        ],
      );
    } catch (error) {
      console.error("Error linking client:", error);
      Alert.alert("Error", "Failed to link client. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      "Skip Client Link",
      "You can link clients later from your professional dashboard. You will have limited access to client features.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Skip",
          onPress: async () => {
            // Reset boot sequence to re-evaluate user state
            bootSequence.reset();
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Link a Client</Text>
        <Text style={styles.subtitle}>
          Enter the client code provided by your client organization to access
          their workspace.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Client Code</Text>
          <TextInput
            style={styles.input}
            value={clientCode}
            onChangeText={setClientCode}
            placeholder="Enter client code"
            placeholderTextColor="#999"
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleLinkClient}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Linking..." : "Link Client"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleSkip}
        >
          <Text style={styles.secondaryButtonText}>Skip for Now</Text>
        </TouchableOpacity>

        <View style={styles.helpContainer}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            • Contact your client for the correct code{"\n"}• Check with the
            organization's admin{"\n"}• You can link clients later from your
            professional dashboard
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Client Workspace Features</Text>
          <Text style={styles.featuresText}>
            • Access client-specific data and documents{"\n"}• Manage client
            projects and tasks{"\n"}• Communicate with client team members{"\n"}
            • Track billable hours and expenses
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#007AFF",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  helpContainer: {
    marginTop: 30,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  helpText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  featuresContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#28a745",
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  featuresText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
});
