import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import RootRouterGuard from "../src/guards/RootRouterGuard";
import StateInspectorWrapper from "../src/components/StateInspectorWrapper";
import { useRouteLogger } from "../src/hooks/useRouteLogger";
import "../src/boot/globalDebug";
import "../src/boot/instrumentFetch";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  // Initialize route logger
  useRouteLogger();

  useEffect(() => {
    let m = true;
    (async () => {
      try {
        // preload assets/fonts here if needed
      } catch (e) {
        console.error("Boot error:", e);
      } finally {
        if (m) setReady(true);
      }
    })();
    return () => {
      m = false;
    };
  }, []);

  const onLayout = useCallback(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <StateInspectorWrapper>
        <View style={{ flex: 1 }} onLayout={onLayout}>
          <RootRouterGuard />
        </View>
      </StateInspectorWrapper>
    </ErrorBoundary>
  );
}
