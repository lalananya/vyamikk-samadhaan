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

export default function JoinEmployer() {
  const [employerCode, setEmployerCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleJoinEmployer = async () => {
    if (!employerCode.trim()) {
      Alert.alert("Error", "Please enter an employer code");
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement actual employer joining logic
      console.log("Joining employer with code:", employerCode);

      // For now, simulate successful join
      await new Promise((resolve) => setTimeout(resolve, 1000));

      Alert.alert(
        "Success",
        "Successfully joined employer! You can now access your workplace features.",
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
      console.error("Error joining employer:", error);
      Alert.alert("Error", "Failed to join employer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      "Skip Employer Join",
      "You can join an employer later from your profile. You will have limited access to workplace features.",
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
        <Text style={styles.title}>Join Your Employer</Text>
        <Text style={styles.subtitle}>
          Enter the employer code provided by your workplace to access workplace
          features.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Employer Code</Text>
          <TextInput
            style={styles.input}
            value={employerCode}
            onChangeText={setEmployerCode}
            placeholder="Enter employer code"
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
          onPress={handleJoinEmployer}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Joining..." : "Join Employer"}
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
            • Contact your employer for the correct code{"\n"}• Check with your
            supervisor or HR department{"\n"}• You can join later from your
            profile
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
});
