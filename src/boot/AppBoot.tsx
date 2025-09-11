import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import Constants from "expo-constants";
import { API_BASE, pingApi } from "../config";

// Prevent auto-hide splash screen
SplashScreen.preventAutoHideAsync().catch(() => {});

interface BootState {
  phase: "initializing" | "checking-network" | "ready" | "error";
  error?: string;
  apiReachable: boolean;
  retryCount: number;
}

export function AppBoot({ children }: { children: React.ReactNode }) {
  const [bootState, setBootState] = useState<BootState>({
    phase: "initializing",
    apiReachable: false,
    retryCount: 0,
  });

  const maxRetries = 3;
  const retryDelay = 2000;

  const checkNetwork = async (retryCount = 0): Promise<void> => {
    try {
      setBootState((prev) => ({
        ...prev,
        phase: "checking-network",
        retryCount,
      }));

      const result = await pingApi(5000); // 5 second timeout

      if (result.ok) {
        setBootState({
          phase: "ready",
          apiReachable: true,
          retryCount: 0,
        });
        await SplashScreen.hideAsync();
        return;
      }

      // If not reachable and we have retries left
      if (retryCount < maxRetries) {
        setTimeout(() => checkNetwork(retryCount + 1), retryDelay);
        return;
      }

      // Max retries reached
      setBootState({
        phase: "error",
        error: `API unreachable after ${maxRetries} attempts. Status: ${result.status || "No response"}`,
        apiReachable: false,
        retryCount,
      });
      await SplashScreen.hideAsync();
    } catch (error) {
      console.error("Network check failed:", error);

      if (retryCount < maxRetries) {
        setTimeout(() => checkNetwork(retryCount + 1), retryDelay);
        return;
      }

      setBootState({
        phase: "error",
        error: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
        apiReachable: false,
        retryCount,
      });
      await SplashScreen.hideAsync();
    }
  };

  useEffect(() => {
    // Initialize boot sequence
    const init = async () => {
      try {
        // Phase 1: Basic initialization
        setBootState((prev) => ({ ...prev, phase: "initializing" }));

        // Small delay to ensure everything is loaded
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Phase 2: Network check
        await checkNetwork();
      } catch (error) {
        console.error("Boot initialization failed:", error);
        setBootState({
          phase: "error",
          error: "Initialization failed",
          apiReachable: false,
          retryCount: 0,
        });
        await SplashScreen.hideAsync();
      }
    };

    init();
  }, []);

  // Show loading screen during boot
  if (bootState.phase !== "ready") {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.title}>Vyamikk Samadhaan</Text>
          <Text style={styles.subtitle}>
            {bootState.phase === "initializing" && "Initializing..."}
            {bootState.phase === "checking-network" &&
              `Checking network... (${bootState.retryCount + 1}/${maxRetries + 1})`}
            {bootState.phase === "error" && "Connection Error"}
          </Text>
          {bootState.phase === "error" && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{bootState.error}</Text>
              <Text style={styles.apiText}>API: {API_BASE}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // App is ready
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    padding: 24,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    color: "#aaa",
    fontSize: 16,
    textAlign: "center",
  },
  errorContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    alignItems: "center",
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  apiText: {
    color: "#9acdff",
    fontSize: 12,
    fontFamily: "monospace",
  },
});
