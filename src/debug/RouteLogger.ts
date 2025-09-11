import { appState } from "../state/AppState";

interface RouteChange {
  from: string;
  to: string;
  timestamp: number;
  timeSinceBoot: number;
  state: {
    isAuthenticated: boolean;
    onboarding_complete: boolean;
    orgId: string | null;
  };
}

class RouteLogger {
  private static instance: RouteLogger;
  private bootTime: number;
  private currentRoute: string = "unknown";
  private routeHistory: RouteChange[] = [];
  private isEnabled: boolean = __DEV__;

  private constructor() {
    this.bootTime = Date.now();
  }

  static getInstance(): RouteLogger {
    if (!RouteLogger.instance) {
      RouteLogger.instance = new RouteLogger();
    }
    return RouteLogger.instance;
  }

  logRouteChange(from: string, to: string): void {
    if (!this.isEnabled) return;

    const now = Date.now();
    const timeSinceBoot = now - this.bootTime;

    const user = appState.getUser();
    const state = {
      isAuthenticated: appState.isAuthenticated(),
      onboarding_complete: user?.onboardingCompleted || false,
      orgId: user?.currentOrganizationId || null,
    };

    const routeChange: RouteChange = {
      from,
      to,
      timestamp: now,
      timeSinceBoot,
      state,
    };

    this.routeHistory.push(routeChange);
    this.currentRoute = to;

    // Keep only last 50 route changes to prevent memory issues
    if (this.routeHistory.length > 50) {
      this.routeHistory = this.routeHistory.slice(-50);
    }

    // Format time since boot
    const timeStr = this.formatTimeSinceBoot(timeSinceBoot);

    // Log the route change with key state info
    console.log(`🛣️  route_change: ${from} → ${to} (${timeStr})`);
    console.log(`   🔐 auth: ${state.isAuthenticated ? "✅" : "❌"}`);
    console.log(`   📋 onboarding: ${state.onboarding_complete ? "✅" : "❌"}`);
    console.log(`   🏢 orgId: ${state.orgId || "none"}`);

    // Special logging for Dashboard jumps
    if (to === "/dashboard") {
      console.log(`🚨 DASHBOARD JUMP DETECTED!`);
      console.log(`   Previous route: ${from}`);
      console.log(`   Time since boot: ${timeStr}`);
      console.log(
        `   State: auth=${state.isAuthenticated}, onboarding=${state.onboarding_complete}, org=${state.orgId}`,
      );

      // Show recent route history for context
      const recentRoutes = this.routeHistory.slice(-5);
      console.log(
        `   Recent routes: ${recentRoutes.map((r) => r.to).join(" → ")}`,
      );
    }
  }

  private formatTimeSinceBoot(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }

  getCurrentRoute(): string {
    return this.currentRoute;
  }

  getRouteHistory(): RouteChange[] {
    return [...this.routeHistory];
  }

  getLastRouteChange(): RouteChange | null {
    return this.routeHistory.length > 0
      ? this.routeHistory[this.routeHistory.length - 1]
      : null;
  }

  clearHistory(): void {
    this.routeHistory = [];
    console.log("🧹 Route history cleared");
  }

  enable(): void {
    this.isEnabled = true;
    console.log("🔍 Route logger enabled");
  }

  disable(): void {
    this.isEnabled = false;
    console.log("🔍 Route logger disabled");
  }

  isRouteLoggerEnabled(): boolean {
    return this.isEnabled;
  }

  // Debug method to print full route history
  printRouteHistory(): void {
    if (!this.isEnabled) return;

    console.log("📋 Full Route History:");
    this.routeHistory.forEach((change, index) => {
      const timeStr = this.formatTimeSinceBoot(change.timeSinceBoot);
      console.log(
        `   ${index + 1}. ${change.from} → ${change.to} (${timeStr})`,
      );
      console.log(
        `      State: auth=${change.state.isAuthenticated}, onboarding=${change.state.onboarding_complete}, org=${change.state.orgId}`,
      );
    });
  }
}

export const routeLogger = RouteLogger.getInstance();
