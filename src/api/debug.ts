import { request } from "../net/http";
import { API_BASE } from "../config";

// High-end debugging wrapper for all API calls
export class DebugApiClient {
  private static log(
    level: "info" | "warn" | "error",
    message: string,
    data?: any,
  ) {
    const timestamp = new Date().toISOString();
    const prefix = level === "info" ? "🔵" : level === "warn" ? "🟡" : "🔴";
    console.log(`${prefix} [${timestamp}] ${message}`, data || "");
  }

  static async login(phone: string, otp: string) {
    this.log("info", "LOGIN ATTEMPT", { phone, otp, apiBase: API_BASE });

    try {
      const result = await request("/auth/login", {
        json: { phone, totp: otp },
        timeoutMs: 8000,
      });

      this.log("info", "LOGIN SUCCESS", {
        phone,
        hasToken: !!result.token,
        hasUser: !!result.user,
        userRole: result.user?.role,
        onboardingCompleted: result.user?.onboardingCompleted,
      });

      return result;
    } catch (error: any) {
      this.log("error", "LOGIN FAILED", {
        phone,
        error: error.message,
        status: error.status,
        body: error.body,
      });
      throw error;
    }
  }

  static async getProfile(token: string) {
    this.log("info", "PROFILE REQUEST", {
      tokenPrefix: token.substring(0, 20) + "...",
      apiBase: API_BASE,
    });

    try {
      const result = await request("/me", {
        headers: { Authorization: `Bearer ${token}` },
        timeoutMs: 8000,
      });

      this.log("info", "PROFILE SUCCESS", {
        hasUser: !!result.user,
        userRole: result.user?.role,
        onboardingCompleted: result.user?.onboardingCompleted,
      });

      return result;
    } catch (error: any) {
      this.log("error", "PROFILE FAILED", {
        error: error.message,
        status: error.status,
        body: error.body,
      });
      throw error;
    }
  }

  static async getDashboard(token: string) {
    this.log("info", "DASHBOARD REQUEST", {
      tokenPrefix: token.substring(0, 20) + "...",
      apiBase: API_BASE,
    });

    try {
      const result = await request("/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
        timeoutMs: 8000,
      });

      this.log("info", "DASHBOARD SUCCESS", {
        hasUser: !!result.user,
        hasStats: !!result.stats,
        statsKeys: result.stats ? Object.keys(result.stats) : [],
        recentActivityCount: result.recentActivity?.length || 0,
        notificationsCount: result.notifications?.length || 0,
      });

      return result;
    } catch (error: any) {
      this.log("error", "DASHBOARD FAILED", {
        error: error.message,
        status: error.status,
        body: error.body,
      });
      throw error;
    }
  }

  static async testConnection() {
    this.log("info", "CONNECTION TEST", { apiBase: API_BASE });

    try {
      const result = await request("/health", { timeoutMs: 5000 });
      this.log("info", "CONNECTION SUCCESS", { result });
      return result;
    } catch (error: any) {
      this.log("error", "CONNECTION FAILED", {
        error: error.message,
        status: error.status,
      });
      throw error;
    }
  }
}
