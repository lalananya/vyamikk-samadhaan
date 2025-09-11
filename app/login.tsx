import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { loginReq, API_BASE, pingApi, normalizePhone } from "../src/api";
import { setToken } from "../src/session";
import { appState } from "../src/state/AppState";
import { analytics } from "../src/analytics/AnalyticsService";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [stat, setStat] = useState<any>(null);

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
      Alert.alert("Success", "App state cleared. Please restart the app.");
    } catch (error) {
      Alert.alert("Error", "Failed to clear app state");
    }
  }

  async function onLogin() {
    if (loading || !phone || !otp) return;
    setLoading(true);

    try {
      const phone10 = normalizePhone(phone);

      // Step 1: Get OTP token
      const loginResp = await loginReq({ phone: phone10 });
      const { otpToken } = loginResp;

      // Step 2: Verify OTP
      const verifyResp = await fetch(`${API_BASE}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpToken, code: otp }),
      });

      if (!verifyResp.ok) {
        const errorData = await verifyResp.json();
        throw new Error(
          errorData.error?.message || `HTTP ${verifyResp.status}`,
        );
      }

      const { accessJwt, user } = await verifyResp.json();
      console.log("🔐 Got accessJwt:", accessJwt ? "YES" : "NO");
      await setToken(accessJwt);

      // Set authenticated user state
      await appState.setAuthenticatedUser({
        id: user.id,
        phone: user.phone,
        role: user.role,
        registeredAt: new Date().toISOString(),
        onboardingCompleted: false, // Will be updated based on feature flag
        organizations: [],
      });

      // Track login success
      analytics.track({
        event: "login_success",
        properties: {
          userId: user.id,
          phone: user.phone,
          role: user.role,
        },
        timestamp: new Date(),
      });

      console.log("🔐 Token stored, resetting boot sequence");
      console.log("🔍 User state after login:", appState.getUser());
      console.log("🔍 Needs onboarding:", appState.needsOnboarding());

      // Reset boot sequence to trigger re-evaluation
      const { bootSequence } = await import("../src/boot/BootSequence");
      bootSequence.reset();

      // Let BootGuard handle the routing based on user state
      // No manual navigation needed
    } catch (e: any) {
      const details = [
        `Base: ${API_BASE}`,
        e?.status ? `HTTP ${e.status}` : "no HTTP",
        e?.message || "",
        e?.body ? `Body: ${String(e.body).slice(0, 200)}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      Alert.alert("Login failed", details);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vyamikk Samadhaan</Text>
      <Text style={styles.subtitle}>Login to continue</Text>

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
          placeholder={__DEV__ ? "Dev: try 123456" : "OTP code"}
          style={styles.input}
        />

        <TouchableOpacity
          style={[
            styles.button,
            (!phone || !otp || loading) && styles.buttonDisabled,
          ]}
          onPress={onLogin}
          disabled={!phone || !otp || loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Logging in..." : "Login"}
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
});
