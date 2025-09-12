import AsyncStorage from "@react-native-async-storage/async-storage";

export interface FeatureFlags {
  post_login_onboarding: boolean;
  category_roles: boolean;
  cash_otp: boolean;
  fund_disbursement: boolean;
  machine_issue: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  post_login_onboarding: true,
  category_roles: true,
  cash_otp: false,
  fund_disbursement: false,
  machine_issue: false,
};

// Dev shortcuts - these can bypass auth/onboarding if enabled
const DEV_SHORTCUT_FLAGS = {
  DEV_AUTH_ANY: false, // Never allow auth bypass in production
  DEV_MOCK_USER: false, // Never allow mock users in production
  DEV_DEFAULT_ORG: false, // Never allow default org assignment
  DEV_SKIP_ONBOARDING: false, // Never allow onboarding bypass
  DEV_SKIP_ME_VALIDATION: false, // Skip /me validation for faster development
} as const;

class FeatureFlagService {
  private flags: FeatureFlags = DEFAULT_FLAGS;
  private initialized = false;

  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem("feature_flags");
      if (stored) {
        this.flags = { ...DEFAULT_FLAGS, ...JSON.parse(stored) };
      }
      this.initialized = true;
    } catch (error) {
      console.error("Failed to load feature flags:", error);
      this.flags = DEFAULT_FLAGS;
      this.initialized = true;
    }
  }

  isEnabled(flag: keyof FeatureFlags): boolean {
    if (!this.initialized) {
      console.warn("Feature flags not initialized, using default value");
      return DEFAULT_FLAGS[flag];
    }
    return this.flags[flag];
  }

  // Dev shortcuts - these require explicit enabling and are disabled by default
  isDevShortcutEnabled(shortcut: keyof typeof DEV_SHORTCUT_FLAGS): boolean {
    if (!__DEV__) {
      console.warn(`Dev shortcut ${shortcut} is only available in development`);
      return false;
    }
    return DEV_SHORTCUT_FLAGS[shortcut];
  }

  // Guard function to check if auth bypass is allowed
  canBypassAuth(): boolean {
    return __DEV__ && this.isDevShortcutEnabled("DEV_AUTH_ANY");
  }

  // Guard function to check if onboarding can be skipped
  canSkipOnboarding(): boolean {
    return __DEV__ && this.isDevShortcutEnabled("DEV_SKIP_ONBOARDING");
  }

  // Guard function to check if /me validation can be skipped
  canSkipMeValidation(): boolean {
    return __DEV__ && this.isDevShortcutEnabled("DEV_SKIP_ME_VALIDATION");
  }

  async setFlag(flag: keyof FeatureFlags, enabled: boolean): Promise<void> {
    this.flags[flag] = enabled;
    try {
      await AsyncStorage.setItem("feature_flags", JSON.stringify(this.flags));
    } catch (error) {
      console.error("Failed to save feature flags:", error);
    }
  }

  async setFlags(flags: Partial<FeatureFlags>): Promise<void> {
    this.flags = { ...this.flags, ...flags };
    try {
      await AsyncStorage.setItem("feature_flags", JSON.stringify(this.flags));
    } catch (error) {
      console.error("Failed to save feature flags:", error);
    }
  }

  getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }

  async resetToDefaults(): Promise<void> {
    this.flags = { ...DEFAULT_FLAGS };
    try {
      await AsyncStorage.setItem("feature_flags", JSON.stringify(this.flags));
    } catch (error) {
      console.error("Failed to reset feature flags:", error);
    }
  }
}

export const featureFlags = new FeatureFlagService();

// Convenience hooks for React components
export const useFeatureFlag = (flag: keyof FeatureFlags): boolean => {
  return featureFlags.isEnabled(flag);
};

// Initialize on app start
featureFlags.initialize();
