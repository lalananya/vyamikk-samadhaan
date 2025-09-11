import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { router, usePathname } from "expo-router";
import { appState } from "../state/AppState";
import { featureFlags } from "../features/FeatureFlags";
import { analytics } from "../analytics/AnalyticsService";

interface AppFlowGuardProps {
  children: React.ReactNode;
}

export default function AppFlowGuard({ children }: AppFlowGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRender, setShouldRender] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    checkAppFlow();
  }, [pathname]);

  const checkAppFlow = async () => {
    try {
      setIsLoading(true);

      // Print startup diagnostics
      console.log("🚀 AppFlowGuard: Starting app flow check");
      console.log("📍 Current pathname:", pathname);

      // Validate authentication first
      const isAuthenticated = await appState.validateAuthentication();
      console.log("🔐 Authentication validated:", isAuthenticated);

      // Get current user state after validation
      const user = appState.getUser();
      console.log("👤 User state:", user);
      console.log("🔐 Is authenticated:", appState.isAuthenticated());
      console.log("📋 Needs onboarding:", appState.needsOnboarding());
      console.log("🏢 Has org context:", appState.hasOrganizationContext());

      // Track app open
      await appState.trackAppOpen();

      // If no user, redirect to login
      if (!user) {
        if (pathname !== "/login") {
          router.replace("/login");
        } else {
          setShouldRender(true);
        }
        return;
      }

      // Check if user needs onboarding
      if (appState.needsOnboarding()) {
        if (pathname !== "/onboarding") {
          router.replace("/onboarding");
        } else {
          setShouldRender(true);
        }
        return;
      }

      // Check if user has organization context
      if (!appState.hasOrganizationContext()) {
        if (pathname !== "/organizations") {
          router.replace("/organizations");
        } else {
          setShouldRender(true);
        }
        return;
      }

      // User is authenticated, has completed onboarding, and has org context
      // Allow access to the requested route
      setShouldRender(true);

      // Track session start if this is the first load
      if (pathname === "/dashboard") {
        await appState.trackSessionStart();
      }
    } catch (error) {
      console.error("App flow check failed:", error);
      // On error, redirect to login
      router.replace("/login");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!shouldRender) {
    return null;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    color: "#fff",
    marginTop: 16,
    fontSize: 16,
  },
});
