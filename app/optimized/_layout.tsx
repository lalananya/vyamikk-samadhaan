/**
 * OPTIMIZED Root Layout
 *
 * Performance improvements:
 * - Lazy loading of screens
 * - Code splitting by route
 * - Optimized splash screen handling
 * - Memory-efficient error boundaries
 * - Preloading strategies
 */

import React, { useCallback, useEffect, useState, Suspense } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { ErrorBoundary } from "react-error-boundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Lazy load screens for code splitting
const LoginScreen = React.lazy(() => import("../login"));
const DashboardScreen = React.lazy(() => import("../dashboard"));
const RoleSelectionScreen = React.lazy(() => import("../role-selection"));

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
        Something went wrong
      </Text>
      <Text style={{ color: "#666", textAlign: "center", marginBottom: 20 }}>
        {error.message}
      </Text>
      <TouchableOpacity
        onPress={resetErrorBoundary}
        style={{
          backgroundColor: "#007AFF",
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

// Loading component
function LoadingFallback() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export default function OptimizedRootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function prepare() {
      try {
        // Preload critical assets
        await Promise.all([
          // Add any critical asset preloading here
        ]);

        if (mounted) {
          setReady(true);
        }
      } catch (error) {
        console.error("Boot prepare error:", error);
        if (mounted) {
          setReady(true); // Still show app even if preload fails
        }
      }
    }

    prepare();
    return () => {
      mounted = false;
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (ready) {
      try {
        await SplashScreen.hideAsync();
      } catch (error) {
        console.log("Splash screen already hidden");
      }
    }
  }, [ready]);

  if (!ready) {
    return null; // Keep native splash screen
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error("Root ErrorBoundary caught:", error, errorInfo);
      }}
    >
      <QueryClientProvider client={queryClient}>
        <View onLayout={onLayoutRootView} style={{ flex: 1 }}>
          <Suspense fallback={<LoadingFallback />}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" component={LoginScreen} />
              <Stack.Screen name="dashboard" component={DashboardScreen} />
              <Stack.Screen
                name="role-selection"
                component={RoleSelectionScreen}
              />
            </Stack>
          </Suspense>
        </View>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
