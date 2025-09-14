import AsyncStorage from "@react-native-async-storage/async-storage";
import { analytics } from "../analytics/AnalyticsService";
import { featureFlags } from "../features/FeatureFlags";
import { clearToken } from "../session/index";
import { healthCheckService } from "../services/HealthCheckService";

// Helper function to safely use AsyncStorage
const safeAsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    // Check if we're in a React Native environment
    if (typeof window === 'undefined') return null;
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    // Check if we're in a React Native environment
    if (typeof window === 'undefined') return;
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Ignore errors in web environment
    }
  },
  removeItem: async (key: string): Promise<void> => {
    // Check if we're in a React Native environment
    if (typeof window === 'undefined') return;
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore errors in web environment
    }
  },
  clear: async (): Promise<void> => {
    // Check if we're in a React Native environment
    if (typeof window === 'undefined') return;
    try {
      await AsyncStorage.clear();
    } catch {
      // Ignore errors in web environment
    }
  }
};

export interface UserState {
  id: string;
  phone: string;
  role: string;
  category?: string;
  registeredAt?: string;
  onboardingCompleted: boolean;
  displayName?: string;
  currentOrganizationId?: string;
  language?: string;
  organizations: {
    id: string;
    name: string;
    role: string;
    status: string;
  }[];
}

class AppStateManager {
  private user: UserState | null = null;
  private initialized = false;
  private authenticated = false; // Single source of truth for auth state
  private listeners: ((user: UserState | null) => void)[] = [];
  private authListeners: ((authenticated: boolean, reason: string) => void)[] =
    [];
  private healthCheckStarted = false;

  async initialize(): Promise<void> {
    try {
      // Check if we're in a web environment
      if (typeof window === 'undefined') {
        this.initialized = true;
        this.notifyListeners();
        return;
      }
      
      const stored = await safeAsyncStorage.getItem("user_state");
      if (stored) {
        this.user = JSON.parse(stored);
      }
      this.initialized = true;
      this.notifyListeners();
    } catch (error) {
      console.error("Failed to initialize app state:", error);
      this.initialized = true;
    }
  }

  subscribe(listener: (user: UserState | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  subscribeToAuth(
    listener: (authenticated: boolean, reason: string) => void,
  ): () => void {
    this.authListeners.push(listener);
    return () => {
      this.authListeners = this.authListeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.user));
  }

  private notifyAuthListeners(reason: string): void {
    this.authListeners.forEach((listener) =>
      listener(this.authenticated, reason),
    );
  }

  private setAuthState(authenticated: boolean, reason: string): void {
    const prev = this.authenticated;
    this.authenticated = authenticated;

    console.log("🔐 auth_state_changed:", {
      prev,
      next: authenticated,
      reason,
    });

    this.notifyAuthListeners(reason);
  }

  async setUser(user: UserState): Promise<void> {
    this.user = user;
    try {
      await safeAsyncStorage.setItem("user_state", JSON.stringify(user));
      this.notifyListeners();
    } catch (error) {
      console.error("Failed to save user state:", error);
    }
  }

  async setAuthenticatedUser(user: UserState): Promise<void> {
    await this.setUser(user);
    this.setAuthState(true, "user_set_after_login");
  }

  async updateUser(updates: Partial<UserState>): Promise<void> {
    if (!this.user) return;

    this.user = { ...this.user, ...updates };
    try {
      await safeAsyncStorage.setItem("user_state", JSON.stringify(this.user));
      this.notifyListeners();
    } catch (error) {
      console.error("Failed to update user state:", error);
    }
  }

  async setCurrentOrganization(organizationId: string): Promise<void> {
    if (!this.user) return;

    this.user.currentOrganizationId = organizationId;
    try {
      await safeAsyncStorage.setItem("user_state", JSON.stringify(this.user));
      this.notifyListeners();
    } catch (error) {
      console.error("Failed to set current organization:", error);
    }
  }

  async completeOnboarding(): Promise<void> {
    if (!this.user) return;

    this.user.onboardingCompleted = true;
    try {
      await safeAsyncStorage.setItem("user_state", JSON.stringify(this.user));
      this.notifyListeners();
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
    }
  }

  async setLanguage(language: string): Promise<void> {
    if (!this.user) return;

    this.user.language = language;
    try {
      await safeAsyncStorage.setItem("user_state", JSON.stringify(this.user));
      this.notifyListeners();
    } catch (error) {
      console.error("Failed to set language:", error);
    }
  }

  getLanguage(): string {
    return this.user?.language || 'EN';
  }

  async logout(): Promise<void> {
    this.user = null;
    this.setAuthState(false, "logout");
    this.stopHealthChecks();
    try {
      await safeAsyncStorage.removeItem("user_state");
      // Also clear token
      await clearToken();
      this.notifyListeners();
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  }

  async clearAllData(): Promise<void> {
    this.user = null;
    this.setAuthState(false, "clear_all_data");
    this.stopHealthChecks();
    try {
      await safeAsyncStorage.clear();
      // Also clear token
      await clearToken();
      this.notifyListeners();
    } catch (error) {
      console.error("Failed to clear all data:", error);
    }
  }

  getUser(): UserState | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  needsOnboarding(): boolean {
    if (!this.user) return false;

    // Check if dev shortcut allows skipping onboarding
    if (featureFlags.canSkipOnboarding()) {
      console.warn("🚨 DEV SHORTCUT: Skipping onboarding check");
      return false;
    }

    if (!featureFlags.isEnabled("post_login_onboarding")) return false;
    return !this.user.onboardingCompleted;
  }

  hasOrganizationContext(): boolean {
    return this.user?.currentOrganizationId !== undefined;
  }

  getCurrentOrganizationId(): string | undefined {
    return this.user?.currentOrganizationId;
  }

  async validateAuthentication(): Promise<boolean> {
    try {
      // Check if we have a stored token
      const token = await this.getStoredToken();
      if (!token) {
        this.setAuthState(false, "no_token");
        return false;
      }

      // Validate token with /me endpoint
      const response = await fetch(`${this.getApiBase()}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.log("🔐 Token validation failed:", response.status);
        this.setAuthState(false, "token_invalid");
        await this.logout(); // Clear invalid data
        return false;
      }

      const userData = await response.json();

      // Update user data from /me response
      if (userData.user) {
        await this.setUser({
          id: userData.user.id,
          phone: userData.user.phone,
          role: userData.user.role,
          registeredAt: userData.user.registeredAt || new Date().toISOString(),
          onboardingCompleted: userData.user.onboardingCompleted || false,
          organizations: userData.user.organizations || [],
        });
      }

      this.setAuthState(true, "me_validation_success");
      // Start health checks only if not already running
      this.startHealthChecks();
      return true;
    } catch (error) {
      console.error("Failed to validate authentication:", error);
      this.setAuthState(false, "me_validation_error");
      await this.logout(); // Clear invalid data
      return false;
    }
  }

  private async getStoredToken(): Promise<string | null> {
    try {
      const { getToken } = await import("../session");
      return await getToken();
    } catch (error) {
      console.error("Failed to get stored token:", error);
      return null;
    }
  }

  getApiBase(): string {
    try {
      const { API_BASE } = require("../api");
      return API_BASE;
    } catch (error) {
      console.error("Failed to get API base:", error);
      return "http://192.168.29.242:4001/api/v1";
    }
  }

  async loadUserFromAPI(): Promise<UserState | null> {
    // This method is now deprecated - use validateAuthentication instead
    return this.user;
  }

  async trackAppOpen(): Promise<void> {
    // Analytics tracking temporarily disabled
    console.log("📊 App opened for user:", this.user?.id);
  }

  async trackSessionStart(): Promise<void> {
    // Analytics tracking temporarily disabled
    console.log("📊 Session started for user:", this.user?.id);
  }

  startHealthChecks(): void {
    if (this.healthCheckStarted) {
      console.log("🏥 Health checks already started, skipping");
      return;
    }
    console.log("🏥 Starting optimized health check service");
    this.healthCheckStarted = true;
    healthCheckService.start();
  }

  stopHealthChecks(): void {
    if (this.healthCheckStarted) {
      console.log("🏥 Stopping health check service");
      this.healthCheckStarted = false;
      healthCheckService.stop();
    }
  }
}

export const appState = new AppStateManager();

// Initialize on app start
appState.initialize();
