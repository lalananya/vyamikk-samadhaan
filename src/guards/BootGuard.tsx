import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { bootSequence, BootResult } from "../boot/BootSequence";
import BlockingSplash from "../components/BlockingSplash";

interface BootGuardProps {
  children: React.ReactNode;
}

const BootGuard: React.FC<BootGuardProps> = ({ children }) => {
  const [isBooted, setIsBooted] = useState(false);
  const [bootResult, setBootResult] = useState<BootResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    executeBootSequence();
  }, []);

  const executeBootSequence = async () => {
    if (isBooted) {
      return; // Prevent multiple executions
    }

    try {
      setIsLoading(true);
      console.log("🚀 BootGuard: Starting boot sequence");

      const result = await bootSequence.executeBootSequence();
      setBootResult(result);

      console.log("🎯 BootGuard: Boot result:", result);

      // Route based on boot result
      switch (result.step) {
        case "ROUTE_LOGIN":
          router.replace("/login");
          break;
        case "ROUTE_ONBOARDING":
          router.replace("/onboarding");
          break;
        case "ROUTE_ORG_SETUP":
          router.replace("/organizations");
          break;
        case "ROUTE_DASHBOARD":
          router.replace("/dashboard");
          break;
        case "ROUTE_LOGOUT":
          router.replace("/login");
          break;
        default:
          router.replace("/login");
      }

      setIsBooted(true);
    } catch (error) {
      console.error("💥 BootGuard error:", error);
      router.replace("/login");
      setIsBooted(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Show blocking splash during boot sequence
  if (isLoading || !isBooted) {
    return <BlockingSplash message="Verifying access..." />;
  }

  // Only render children after successful boot
  return <>{children}</>;
};

export default BootGuard;
