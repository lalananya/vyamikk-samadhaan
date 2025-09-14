import NetInfo from "@react-native-community/netinfo";
import { API_BASE, pingApi } from "../config";

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  apiReachable: boolean;
  lastCheck: number;
}

class NetworkManager {
  private listeners: Set<(state: NetworkState) => void> = new Set();
  private currentState: NetworkState = {
    isConnected: false,
    isInternetReachable: null,
    type: null,
    apiReachable: false,
    lastCheck: 0,
  };
  private checkInterval: NodeJS.Timeout | null = null;
  private isChecking = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Listen to network state changes
    NetInfo.addEventListener((state) => {
      this.updateNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        apiReachable: this.currentState.apiReachable,
        lastCheck: this.currentState.lastCheck,
      });
    });

    // Initial check
    await this.checkApiReachability();

    // Periodic checks every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkApiReachability();
    }, 30000);
  }

  private updateNetworkState(updates: Partial<NetworkState>) {
    this.currentState = { ...this.currentState, ...updates };
    this.notifyListeners();
  }

  private async checkApiReachability() {
    if (this.isChecking) return;

    this.isChecking = true;
    try {
      const result = await pingApi(3000);
      this.updateNetworkState({
        apiReachable: result.ok,
        lastCheck: Date.now(),
      });
    } catch (error) {
      console.warn("API reachability check failed:", error);
      this.updateNetworkState({
        apiReachable: false,
        lastCheck: Date.now(),
      });
    } finally {
      this.isChecking = false;
    }
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentState);
      } catch (error) {
        console.error("Network state listener error:", error);
      }
    });
  }

  public subscribe(listener: (state: NetworkState) => void) {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.currentState);

    return () => {
      this.listeners.delete(listener);
    };
  }

  public getCurrentState(): NetworkState {
    return { ...this.currentState };
  }

  public async forceCheck(): Promise<boolean> {
    await this.checkApiReachability();
    return this.currentState.apiReachable;
  }

  public isOnline(): boolean {
    return (
      this.currentState.isConnected &&
      (this.currentState.isInternetReachable ?? true) &&
      this.currentState.apiReachable
    );
  }

  public destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.listeners.clear();
  }
}

// Singleton instance
export const networkManager = new NetworkManager();
