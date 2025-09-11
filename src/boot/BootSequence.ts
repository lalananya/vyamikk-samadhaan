import { appState } from "../state/AppState";
import { getToken } from "../session";

export type BootStep =
  | "HYDRATE"
  | "ME_CALL"
  | "ROUTE_LOGIN"
  | "ROUTE_ONBOARDING"
  | "ROUTE_ORG_SETUP"
  | "ROUTE_JOIN_EMPLOYER"
  | "ROUTE_LINK_CLIENT"
  | "ROUTE_DASHBOARD"
  | "ROUTE_RETRY"
  | "ROUTE_LOGOUT";

export interface BootResult {
  step: BootStep;
  target: string;
  user?: any;
  needsOnboarding?: boolean;
  hasMemberships?: boolean;
}

export class BootSequence {
  private static instance: BootSequence;
  private isBooted = false;
  private bootResult: BootResult | null = null;

  static getInstance(): BootSequence {
    if (!BootSequence.instance) {
      BootSequence.instance = new BootSequence();
    }
    return BootSequence.instance;
  }

  async executeBootSequence(): Promise<BootResult> {
    // If already booted, return cached result
    if (this.isBooted && this.bootResult) {
      console.log(
        "🚀 BootSequence: Already booted, returning cached result:",
        this.bootResult,
      );
      return this.bootResult;
    }

    console.log("🚀 BootSequence: Starting boot sequence");

    try {
      // Step 1: HYDRATE - Read tokens/flags from storage
      const step1 = await this.hydrateStorage();
      console.log("🔍 boot_step: HYDRATE");

      if (!step1.hasToken) {
        const result = { step: "ROUTE_LOGIN", target: "/login" };
        this.bootResult = result;
        this.isBooted = true;
        console.log("🔍 boot_step: ROUTE_LOGIN");
        return result;
      }

      // Step 2: ME_CALL - Validate token with /me endpoint
      const step2 = await this.validateWithMe();
      console.log("🔍 boot_step: ME_CALL");

      if (!step2.success) {
        let result: BootResult;

        if (step2.errorType === "network") {
          // Network error with last-known session → show retry option
          result = { step: "ROUTE_RETRY", target: "/retry-connection" };
          console.log(
            "🔍 boot_step: ROUTE_RETRY (network error with last-known session)",
          );
        } else {
          // Auth error or malformed response → force logout and login
          result = { step: "ROUTE_LOGOUT", target: "/login" };
          console.log(`🔍 boot_step: ROUTE_LOGOUT (${step2.errorType} error)`);
        }

        this.bootResult = result;
        this.isBooted = true;
        return result;
      }

      // Step 3: Route based on user state
      const step3 = await this.determineRoute(step2.user);
      console.log(`🔍 boot_step: ROUTE_${step3.step}`);

      this.bootResult = step3;
      this.isBooted = true;
      return step3;
    } catch (error) {
      console.error("💥 BootSequence error:", error);
      const result = { step: "ROUTE_LOGOUT", target: "/login" };
      this.bootResult = result;
      this.isBooted = true;
      console.log("🔍 boot_step: ROUTE_LOGOUT (error)");
      return result;
    }
  }

  private async hydrateStorage(): Promise<{ hasToken: boolean }> {
    try {
      const token = await getToken();
      return { hasToken: !!token };
    } catch (error) {
      console.error("💥 Hydrate storage error:", error);
      return { hasToken: false };
    }
  }

  private async validateWithMe(): Promise<{
    success: boolean;
    user?: any;
    errorType?: "network" | "auth" | "malformed";
  }> {
    try {
      const token = await getToken();
      if (!token) {
        console.log("🚪 No token found → ROUTE_LOGIN");
        return { success: false, errorType: "auth" };
      }

      const apiBase = appState.getApiBase();
      console.log("🌐 Validating token with /me endpoint...");

      const response = await fetch(`${apiBase}/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        try {
          const userData = await response.json();

          // Validate response structure
          if (!userData || typeof userData !== "object") {
            console.error("💥 Malformed /me response: not an object");
            await this.logout();
            return { success: false, errorType: "malformed" };
          }

          if (!userData.authenticated) {
            console.error("💥 /me response: authenticated=false");
            await this.logout();
            return { success: false, errorType: "auth" };
          }

          if (!userData.profile || typeof userData.profile !== "object") {
            console.error(
              "💥 Malformed /me response: missing or invalid profile",
            );
            await this.logout();
            return { success: false, errorType: "malformed" };
          }

          // Handle new /me response format
          const user = {
            id: userData.profile.id,
            phone: userData.profile.phone,
            role: userData.profile.role,
            registeredAt: userData.profile.registered_at,
            category: userData.profile.category,
            onboardingCompleted: userData.profile.onboarding_complete,
            organizations: userData.memberships || [],
          };

          console.log("✅ /me validation successful");
          return { success: true, user };
        } catch (parseError) {
          console.error("💥 Failed to parse /me response:", parseError);
          await this.logout();
          return { success: false, errorType: "malformed" };
        }
      } else if (response.status === 401) {
        console.log(
          "🚪 401 Unauthorized → clearing tokens and routing to Login",
        );
        await this.logout();
        return { success: false, errorType: "auth" };
      } else {
        console.error(`💥 /me request failed with status ${response.status}`);
        await this.logout();
        return { success: false, errorType: "auth" };
      }
    } catch (error) {
      console.error("💥 Network error during /me validation:", error);

      // Check if we have a last-known-good session for offline mode
      const hasLastKnownSession = await this.hasLastKnownGoodSession();

      if (hasLastKnownSession) {
        console.log(
          "🔄 Network error but have last-known session → showing retry option",
        );
        return { success: false, errorType: "network" };
      } else {
        console.log(
          "🚪 Network error and no last-known session → forcing Login",
        );
        await this.logout();
        return { success: false, errorType: "network" };
      }
    }
  }

  private async hasLastKnownGoodSession(): Promise<boolean> {
    try {
      // Check if we have any stored user data that might be valid
      const user = appState.getUser();
      const token = await getToken();

      // Only consider it a "last known good session" if we have both user and token
      return !!(user && token);
    } catch (error) {
      console.error("💥 Error checking last known session:", error);
      return false;
    }
  }

  private async determineRoute(user: any): Promise<BootResult> {
    if (!user) {
      return { step: "ROUTE_LOGIN", target: "/login" };
    }

    console.log("🔍 BootSequence: Determining route for user:", {
      id: user.id,
      category: user.category,
      onboardingCompleted: user.onboardingCompleted,
      membershipsCount: user.organizations?.length || 0,
    });

    // Gate 1: Onboarding completion - FORCE onboarding if incomplete
    if (!user.onboardingCompleted) {
      console.log("🚪 Gate 1: Onboarding incomplete → FORCE Onboarding Wizard");
      return {
        step: "ROUTE_ONBOARDING",
        target: "/onboarding",
        user,
        needsOnboarding: true,
      };
    }

    // Gate 2: Business roles need organization setup
    const businessRoles = [
      "owner",
      "partner",
      "director",
      "supervisor",
      "accountant",
    ];
    const isBusinessRole = businessRoles.includes(user.category);
    const hasMemberships = user.organizations && user.organizations.length > 0;

    if (isBusinessRole && !hasMemberships) {
      console.log(
        "🚪 Gate 2: Business role without memberships → FORCE Org Setup",
      );
      return {
        step: "ROUTE_ORG_SETUP",
        target: "/organizations",
        user,
        hasMemberships: false,
      };
    }

    // Gate 3: Labour roles need employer link
    const labourRoles = ["labour", "supervisor", "accountant"];
    const isLabourRole = labourRoles.includes(user.category);
    const hasEmployerLink = this.hasEmployerLink(user);

    if (isLabourRole && !hasEmployerLink) {
      console.log(
        "🚪 Gate 3: Labour role without employer → FORCE Join Employer",
      );
      return {
        step: "ROUTE_JOIN_EMPLOYER",
        target: "/join-employer",
        user,
        hasEmployerLink: false,
      };
    }

    // Gate 4: Professional roles need client link
    const professionalRoles = ["professional", "ca", "lawyer", "advocate"];
    const isProfessionalRole = professionalRoles.includes(user.category);
    const hasClientLink = this.hasClientLink(user);

    if (isProfessionalRole && !hasClientLink) {
      console.log(
        "🚪 Gate 4: Professional role without clients → FORCE Link Client",
      );
      return {
        step: "ROUTE_LINK_CLIENT",
        target: "/link-client",
        user,
        hasClientLink: false,
      };
    }

    // All gates passed - user is fully ready
    console.log("✅ All gates passed → Dashboard");
    return {
      step: "ROUTE_DASHBOARD",
      target: "/dashboard",
      user,
      hasMemberships: hasMemberships,
      hasEmployerLink: hasEmployerLink,
      hasClientLink: hasClientLink,
    };
  }

  private hasEmployerLink(user: any): boolean {
    // Check if user has an active employer relationship
    // This would typically check for active employment records
    // For now, we'll check if they have any organization memberships
    // In a real app, this would check employment status
    return (
      user.organizations &&
      user.organizations.some(
        (org: any) =>
          org.status === "active" &&
          ["labour", "supervisor", "accountant"].includes(org.role),
      )
    );
  }

  private hasClientLink(user: any): boolean {
    // Check if user has active client relationships
    // This would typically check for professional-client associations
    // For now, we'll check if they have any organization memberships
    // In a real app, this would check professional client relationships
    return (
      user.organizations &&
      user.organizations.some(
        (org: any) =>
          org.status === "active" &&
          ["professional", "ca", "lawyer", "advocate"].includes(org.role),
      )
    );
  }

  private async logout(): Promise<void> {
    try {
      await appState.logout();
    } catch (error) {
      console.error("💥 Logout error:", error);
    }
  }

  getBootResult(): BootResult | null {
    return this.bootResult;
  }

  isBootComplete(): boolean {
    return this.isBooted;
  }

  reset(): void {
    this.isBooted = false;
    this.bootResult = null;
  }
}

export const bootSequence = BootSequence.getInstance();
