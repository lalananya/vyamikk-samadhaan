import AsyncStorage from "@react-native-async-storage/async-storage";
import { RBACEvent, RBAC_EVENTS } from "./events";

interface AnalyticsConfig {
  enabled: boolean;
  batchSize: number;
  flushInterval: number; // milliseconds
  endpoint?: string;
}

class AnalyticsService {
  private config: AnalyticsConfig;
  private eventQueue: RBACEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isOnline: boolean = true;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      enabled: true,
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
      ...config,
    };

    this.startFlushTimer();
    this.checkOnlineStatus();
  }

  // Track a single event
  async track(event: RBACEvent): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Add to queue
      this.eventQueue.push(event);

      // Flush if batch size reached
      if (this.eventQueue.length >= this.config.batchSize) {
        await this.flush();
      }

      // Store in local storage for offline persistence
      await this.persistEvent(event);
    } catch (error) {
      console.error("Failed to track event:", error);
    }
  }

  // Track multiple events
  async trackBatch(events: RBACEvent[]): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      this.eventQueue.push(...events);

      if (this.eventQueue.length >= this.config.batchSize) {
        await this.flush();
      }

      // Persist all events
      for (const event of events) {
        await this.persistEvent(event);
      }
    } catch (error) {
      console.error("Failed to track events batch:", error);
    }
  }

  // Flush events to server
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0 || !this.isOnline) {
      return;
    }

    try {
      const eventsToFlush = [...this.eventQueue];
      this.eventQueue = [];

      if (this.config.endpoint) {
        await this.sendToServer(eventsToFlush);
      }

      // Remove persisted events after successful send
      await this.removePersistedEvents(eventsToFlush);
    } catch (error) {
      console.error("Failed to flush events:", error);
      // Re-add events to queue if flush failed
      this.eventQueue.unshift(...this.eventQueue);
    }
  }

  // Send events to analytics server
  private async sendToServer(events: RBACEvent[]): Promise<void> {
    if (!this.config.endpoint) {
      return;
    }

    const response = await fetch(this.config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        events,
        timestamp: new Date().toISOString(),
        source: "mobile_app",
      }),
    });

    if (!response.ok) {
      throw new Error(`Analytics server responded with ${response.status}`);
    }
  }

  // Persist event to local storage
  private async persistEvent(event: RBACEvent): Promise<void> {
    try {
      const key = `analytics_event_${Date.now()}_${Math.random()}`;
      await AsyncStorage.setItem(key, JSON.stringify(event));
    } catch (error) {
      console.error("Failed to persist event:", error);
    }
  }

  // Remove persisted events after successful send
  private async removePersistedEvents(events: RBACEvent[]): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const eventKeys = keys.filter((key) =>
        key.startsWith("analytics_event_"),
      );

      for (const key of eventKeys) {
        const eventData = await AsyncStorage.getItem(key);
        if (eventData) {
          const event = JSON.parse(eventData);
          if (events.some((e) => e.timestamp === event.timestamp)) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error("Failed to remove persisted events:", error);
    }
  }

  // Load and flush persisted events on app start
  async loadPersistedEvents(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const eventKeys = keys.filter((key) =>
        key.startsWith("analytics_event_"),
      );

      const events: RBACEvent[] = [];
      for (const key of eventKeys) {
        const eventData = await AsyncStorage.getItem(key);
        if (eventData) {
          events.push(JSON.parse(eventData));
        }
      }

      if (events.length > 0) {
        await this.trackBatch(events);
      }
    } catch (error) {
      console.error("Failed to load persisted events:", error);
    }
  }

  // Start periodic flush timer
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  // Stop flush timer
  stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // Check online status
  private checkOnlineStatus(): void {
    // This would typically use a network status library
    // For now, we'll assume online
    this.isOnline = true;
  }

  // Update configuration
  updateConfig(newConfig: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current queue size
  getQueueSize(): number {
    return this.eventQueue.length;
  }

  // Clear all events
  async clearAllEvents(): Promise<void> {
    this.eventQueue = [];

    try {
      const keys = await AsyncStorage.getAllKeys();
      const eventKeys = keys.filter((key) =>
        key.startsWith("analytics_event_"),
      );
      await AsyncStorage.multiRemove(eventKeys);
    } catch (error) {
      console.error("Failed to clear events:", error);
    }
  }

  // Enable/disable analytics
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  // Get analytics summary
  async getAnalyticsSummary(): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    lastFlush: Date | null;
  }> {
    const keys = await AsyncStorage.getAllKeys();
    const eventKeys = keys.filter((key) => key.startsWith("analytics_event_"));

    const eventsByType: Record<string, number> = {};
    let totalEvents = 0;

    for (const key of eventKeys) {
      const eventData = await AsyncStorage.getItem(key);
      if (eventData) {
        const event = JSON.parse(eventData);
        eventsByType[event.event] = (eventsByType[event.event] || 0) + 1;
        totalEvents++;
      }
    }

    return {
      totalEvents,
      eventsByType,
      lastFlush: null, // Would track this in a real implementation
    };
  }
}

// Export singleton instance
export const analytics = new AnalyticsService({
  enabled: __DEV__ ? true : true, // Enable in both dev and prod
  batchSize: 5,
  flushInterval: 30000,
  endpoint: process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT || undefined,
});

// Export the class for custom instances
export { AnalyticsService };
