import React, { useState, useEffect, useRef, useCallback } from "react";
import { View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { bootSequence, BootResult } from "../boot/BootSequence";
import BlockingSplash from "../components/BlockingSplash";
import { routeLogger } from "../debug/RouteLogger";
import DevHelper from "../dev/DevHelper";

// Global flag to prevent multiple executions across component remounts
// Use a more robust approach with a timestamp to prevent race conditions
let globalBootExecuted = false;
let globalBootTimestamp = 0;
let tokensClearedOnStartup = false;

// Function to reset the global flag (for testing or manual reset)
export const resetGlobalBootFlag = () => {
  globalBootExecuted = false;
  globalBootTimestamp = 0;
  tokensClearedOnStartup = false;
};

type StackType = "Public" | "App" | "Loading";

const RootRouterGuard: React.FC = () => {
  const [stackType, setStackType] = useState<StackType>("Public");
  const [bootResult, setBootResult] = useState<BootResult | null>(null);
  const bootPromiseRef = useRef<Promise<BootResult | null> | null>(null);
  const hasNavigatedRef = useRef(false);
  const hasExecutedRef = useRef(false);
  const router = useRouter();

  const executeBootSequence = useCallback(async (): Promise<BootResult | null> => {
    const currentTime = Date.now();
    
    // Prevent multiple executions globally with timestamp check
    if (globalBootExecuted && (currentTime - globalBootTimestamp) < 5000) {
      console.log("🚀 RootRouterGuard: Already executed globally, skipping");
      return null;
    }

    if (bootPromiseRef.current) {
      console.log("🚀 RootRouterGuard: Boot already in flight, skipping");
      return bootPromiseRef.current;
    }

    // Set the global flag immediately to prevent race conditions
    globalBootExecuted = true;
    globalBootTimestamp = currentTime;

    const bootPromise = (async () => {
      try {
        console.log("🚀 RootRouterGuard: Starting boot sequence");
        hasExecutedRef.current = true;

        // Enable fast dev mode to skip /me validation
        if (__DEV__) {
          await DevHelper.enableFastDevMode();
        }

        // Clear tokens in development mode for fresh testing
        if (__DEV__ && !tokensClearedOnStartup) {
          console.log("🚀 DEV MODE: Clearing cached tokens on first startup");
          const { clearToken } = await import("../storage/tokens");
          await clearToken();
          tokensClearedOnStartup = true;
        }

        const result = await bootSequence.executeBootSequence();
        setBootResult(result);
        console.log("🎯 RootRouterGuard: Boot result:", result);

        // Determine stack type based on boot result
        let selectedStack: StackType = "Public";
        switch (result.step) {
          case "ROUTE_LOGIN":
          case "ROUTE_LOGOUT":
            selectedStack = "Public";
            break;
          case "ROUTE_LANGUAGE_SELECTION":
          case "ROUTE_ONBOARDING":
          case "ROUTE_ORG_SETUP":
          case "ROUTE_JOIN_EMPLOYER":
          case "ROUTE_LINK_CLIENT":
          case "ROUTE_DASHBOARD":
          case "ROUTE_RETRY":
            selectedStack = "App";
            break;
          default:
            selectedStack = "Public";
        }

        console.log(`🔍 stack_selected: ${selectedStack}`);

        // One-shot navigation
        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          let targetRoute = result.target || "/login";
          if (selectedStack === "App") {
            switch (result.step) {
              case "ROUTE_LANGUAGE_SELECTION":
                targetRoute = result.target || "/language-selection";
                break;
              case "ROUTE_ONBOARDING":
                targetRoute = result.target || "/profile-wizard";
                break;
              case "ROUTE_ORG_SETUP":
                targetRoute = result.target || "/organizations";
                break;
              case "ROUTE_JOIN_EMPLOYER":
                targetRoute = result.target || "/join-employer";
                break;
              case "ROUTE_LINK_CLIENT":
                targetRoute = result.target || "/link-client";
                break;
              case "ROUTE_RETRY":
                targetRoute = result.target || "/retry-connection";
                break;
              case "ROUTE_DASHBOARD":
                targetRoute = result.target || "/main";
                break;
              default:
                targetRoute = "/main";
            }
          }
          routeLogger.logRouteChange("boot", targetRoute);

          // Set stack type and navigate
          setStackType(selectedStack);
          router.replace(targetRoute);
        } else {
          // If already navigated, just set the stack type
          setStackType(selectedStack);
        }

        return result;
      } catch (error) {
        console.error("💥 RootRouterGuard error:", error);
        console.log("🔍 stack_selected: Public (error)");

        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          routeLogger.logRouteChange("boot", "/login");

          // Set stack type and navigate
          setStackType("Public");
          router.replace("/login");
        } else {
          setStackType("Public");
        }
        return null;
      } finally {
        // Clear the promise reference
        bootPromiseRef.current = null;
      }
    })();

    bootPromiseRef.current = bootPromise;
    return bootPromise;
  }, []); // Remove router dependency to prevent infinite loop

  useEffect(() => {
    // Run boot sequence on mount
    console.log("🚀 RootRouterGuard: useEffect triggered");
    executeBootSequence();
  }, []); // Empty dependency array - only run once on mount


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("🚀 RootRouterGuard: Component unmounting, cleaning up");
      bootPromiseRef.current = null;
      hasExecutedRef.current = false;
      // Don't reset globalBootExecuted here as it should persist across remounts
    };
  }, []);

  // Always render the stack - let individual screens handle their own loading states
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="language-selection" />
      <Stack.Screen name="post-login-gate" />
      <Stack.Screen name="profile-wizard" />
      <Stack.Screen name="retry-connection" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="organizations" />
      <Stack.Screen name="join-employer" />
      <Stack.Screen name="link-client" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="partnership-registration" />
      <Stack.Screen name="employee-onboarding" />
      <Stack.Screen name="punch-card" />
      <Stack.Screen name="machine-issues" />
      <Stack.Screen name="cash-transactions" />
      <Stack.Screen name="fund-disbursement" />
      <Stack.Screen name="professional-invites" />
      <Stack.Screen name="compliance-dashboard" />
      <Stack.Screen name="permission-audit" />
      <Stack.Screen name="client-workspace" />
      <Stack.Screen name="professional-dashboard" />
      <Stack.Screen name="supervisor-disbursement" />
      <Stack.Screen name="payout-confirmation" />
      <Stack.Screen name="cash-confirmation" />
      <Stack.Screen name="cash-ledger" />
      <Stack.Screen name="issue-management" />
      <Stack.Screen name="labour-profile" />
      <Stack.Screen name="employee-acknowledgement" />
      <Stack.Screen name="partner-acknowledgement" />
      <Stack.Screen name="professional-accept" />
      <Stack.Screen name="invite/[token]" />
    </Stack>
  );
};

export default RootRouterGuard;
