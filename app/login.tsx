import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { API_BASE, pingApi, normalizePhone } from "../src/api";
import { appState } from "../src/state/AppState";
import { analytics } from "../src/analytics/AnalyticsService";
import { authService } from "../src/api/auth";
import { ValidationUtils } from "../src/utils/ValidationUtils";
import { AlertUtils } from "../src/utils/AlertUtils";
import { ErrorUtils } from "../src/utils/ErrorUtils";
import { handleOfflineError } from "../src/utils/OfflineUtils";
import { useLoadingState } from "../src/hooks/useLoadingState";
import AnimatedLogo from "../src/components/AnimatedLogo";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stat, setStat] = useState<any>(null);
  const { isLoading, error, execute, setError } = useLoadingState();

  useEffect(() => {
    (async () => {
      const apiStat = await pingApi();
      setStat(apiStat);

      // Print diagnostics
      console.log("🔍 App Diagnostics:");
      console.log("📱 buildCommit:", __DEV__ ? "dev" : "production");
      console.log("🌍 env:", process.env.NODE_ENV || "development");
      console.log("🔗 apiBase:", API_BASE);
      console.log("📦 bundleUrlHost:", __DEV__ ? "metro" : "production");
      console.log("📊 API Status:", apiStat);
    })();
  }, []);

  async function onClearAppState() {
    try {
      await appState.clearAllData();
      // Navigate to login after clearing state
      router.replace("/login");
      AlertUtils.showSuccess("App state cleared. You can now login fresh.");
    } catch (error) {
      AlertUtils.showError("Failed to clear app state");
    }
  }

  async function onLogin() {
    if (!phone || !otp) {
      AlertUtils.showError("Please enter both phone number and OTP");
      return;
    }
    
    // Prevent automatic login if values are empty
    if (phone.trim() === "" || otp.trim() === "") {
      AlertUtils.showError("Please enter both phone number and OTP");
      return;
    }

    // Normalize inputs to strings and trim whitespace
    const normalizedPhone = String(phone).trim();
    const normalizedOtp = String(otp).trim();
    
    console.log("🔍 Normalized inputs:", { 
      original: { phone, otp }, 
      normalized: { phone: normalizedPhone, otp: normalizedOtp },
      types: { phone: typeof normalizedPhone, otp: typeof normalizedOtp }
    });

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setError("Login timeout - please try again");
      console.log("⏰ Login timeout after 30 seconds");
    }, 30000);

    await execute(async () => {
      console.log("🔐 Attempting login with:", { phone: normalizedPhone, otp: normalizedOtp });
      
      // Try simple login first (single-step)
      try {
        const response = await authService.simpleLogin({ phone: normalizedPhone, otp: normalizedOtp });
        console.log("✅ Simple login successful:", response);
        
        // Store the JWT token first
        if (response.accessJwt) {
          const { setToken } = await import("../src/storage/tokens");
          await setToken(response.accessJwt);
          console.log("💾 JWT token stored successfully");
        } else {
          console.log("⚠️ No accessJwt in response:", response);
        }
        
        // Set authenticated user state
        await appState.setAuthenticatedUser(response.user);
        
        console.log("🔍 User state after login:", appState.getUser());
        
        // Wait a moment for state to be fully set
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Let BootSequence handle routing after login
        const { bootSequence } = await import("../src/boot/BootSequence");
        const result = await bootSequence.executeBootSequence();
        console.log("🎯 Login: BootSequence result:", result);
        
        // Navigate based on boot sequence result
        router.replace(result.target as any);
        
        // Clear timeout on success
        clearTimeout(timeoutId);
        
      } catch (error) {
        console.log("❌ Simple login failed:", error);
        // Clear timeout on error
        clearTimeout(timeoutId);
        // Force reset loading state on error
        setError(error?.message || "Login failed");
        throw error;
      }
    }, {
      onError: (error) => {
        console.log("🚨 Login error:", error);
        AlertUtils.showError("Login failed: " + (error?.message || "Unknown error"));
        // Ensure loading state is reset
        setTimeout(() => setError(null), 5000); // Clear error after 5 seconds
        // Clear timeout on error
        clearTimeout(timeoutId);
      }
    });
  }

  // Show verifying access screen during login process
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.verifyingContainer}>
          <AnimatedLogo size={120} showAnimation={true} />
          <Text style={styles.title}>Vyamikk Samadhaan</Text>
          <Text style={styles.verifyingText}>Verifying access...</Text>
          <Text style={styles.verifyingSubtext}>
            Please wait while we authenticate your credentials
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AnimatedLogo size={100} showAnimation={true} />
      <Text style={styles.title}>Vyamikk Samadhaan</Text>
      <Text style={styles.subtitle}>Login to continue</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.form}>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="Phone number"
          style={styles.input}
        />

        <TextInput
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          placeholder="OTP"
          style={styles.input}
        />

        <TouchableOpacity
          style={[
            styles.button,
            isLoading && styles.buttonDisabled,
          ]}
          onPress={onLogin}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Logging in..." : "Login"}
          </Text>
        </TouchableOpacity>

        {__DEV__ && stat && (
          <Text style={{ color: "#9acdff", marginTop: 8, fontSize: 12 }}>
            API {stat.base} ·{" "}
            {stat.ok
              ? `OK ${stat.status}`
              : `DOWN ${stat.error || stat.status}`}
          </Text>
        )}

        {__DEV__ && (
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: "#ff6b6b", marginTop: 16 },
            ]}
            onPress={onClearAppState}
          >
            <Text style={styles.buttonText}>Clear App State (Debug)</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Designed & developed by{" "}
          <Text style={styles.footerBrand}>Special</Text>
        </Text>
        <Text style={styles.footerSubtext}>
          Empowering MSMEs with smart workforce management
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#ccc",
    textAlign: "center",
    marginBottom: 40,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#666",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  devPanel: {
    marginTop: 16,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#111",
  },
  devText: {
    color: "#9acdff",
    fontSize: 12,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  footerText: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
  },
  footerBrand: {
    color: "#007AFF",
    fontWeight: "bold",
  },
  footerSubtext: {
    color: "#444",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  verifyingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  verifyingText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginTop: 20,
    textAlign: "center",
  },
  verifyingSubtext: {
    fontSize: 14,
    color: "#888",
    marginTop: 8,
    textAlign: "center",
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
});
