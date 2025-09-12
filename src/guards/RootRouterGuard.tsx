import React, { useState, useEffect, useRef, useCallback } from "react";
import { View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { bootSequence, BootResult } from "../boot/BootSequence";
import BlockingSplash from "../components/BlockingSplash";
import { routeLogger } from "../debug/RouteLogger";

type StackType = "Public" | "App" | "Loading";

const RootRouterGuard: React.FC = () => {
  const [stackType, setStackType] = useState<StackType>("Loading");
  const [bootResult, setBootResult] = useState<BootResult | null>(null);
  const bootPromiseRef = useRef<Promise<BootResult | null> | null>(null);
  const hasNavigatedRef = useRef(false);
  const isInitializedRef = useRef(false);
  const router = useRouter();

  const executeBootSequence = useCallback(async (): Promise<BootResult | null> => {
    // Prevent multiple executions
    if (bootPromiseRef.current || isInitializedRef.current) {
      console.log("🚀 RootRouterGuard: Boot already in flight or initialized, skipping");
      return bootPromiseRef.current;
    }

    const bootPromise = (async () => {
      try {
        console.log("🚀 RootRouterGuard: Starting boot sequence");
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
        setStackType(selectedStack);

        // One-shot navigation
        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          let targetRoute = "/login";
          if (selectedStack === "App") {
            switch (result.step) {
              case "ROUTE_ONBOARDING":
                targetRoute = "/onboarding";
                break;
              case "ROUTE_ORG_SETUP":
                targetRoute = "/organizations";
                break;
              case "ROUTE_JOIN_EMPLOYER":
                targetRoute = "/join-employer";
                break;
              case "ROUTE_LINK_CLIENT":
                targetRoute = "/link-client";
                break;
              case "ROUTE_RETRY":
                targetRoute = "/retry-connection";
                break;
              case "ROUTE_DASHBOARD":
                targetRoute = "/dashboard";
                break;
              default:
                targetRoute = "/dashboard";
            }
          }
          routeLogger.logRouteChange("boot", targetRoute);
          router.replace(targetRoute);
        }

        return result;
      } catch (error) {
        console.error("💥 RootRouterGuard error:", error);
        console.log("🔍 stack_selected: Public (error)");
        setStackType("Public");
        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          routeLogger.logRouteChange("boot", "/login");
          router.replace("/login");
        }
        return null;
      } finally {
        // Mark as initialized to prevent re-execution
        isInitializedRef.current = true;
      }
    })();

    bootPromiseRef.current = bootPromise;
    return bootPromise;
  }, [router]);

  useEffect(() => {
    // Only run once on mount
    if (!isInitializedRef.current) {
      console.log("🚀 RootRouterGuard: useEffect triggered - first time");
      executeBootSequence();
    } else {
      console.log("🚀 RootRouterGuard: useEffect triggered - already initialized, skipping");
    }
  }, [executeBootSequence]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("🚀 RootRouterGuard: Component unmounting, cleaning up");
      bootPromiseRef.current = null;
      hasNavigatedRef.current = false;
      isInitializedRef.current = false;
    };
  }, []);

  // Show blocking splash during boot sequence
  if (stackType === "Loading") {
    return <BlockingSplash message="Verifying access..." />;
  }

  // Render the stack - navigation is handled by the boot sequence
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
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
