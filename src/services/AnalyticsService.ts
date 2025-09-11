import { appState } from "../state/AppState";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: Date;
  userId?: string;
  organizationId?: string;
  sessionId?: string;
}

export interface AnalyticsQuery {
  event?: string;
  userId?: string;
  organizationId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AnalyticsStats {
  totalEvents: number;
  uniqueUsers: number;
  eventsByType: Record<string, number>;
  eventsByUser: Record<string, number>;
  eventsByOrganization: Record<string, number>;
  successRate: number;
  failureRate: number;
  recentEvents: AnalyticsEvent[];
}

export interface EventMap {
  // Category changes
  category_changed: {
    oldCategory: string;
    newCategory: string;
    changeType: string;
    success: boolean;
    failureReason?: string;
  };

  // Partner acknowledgements
  partner_acknowledged: {
    partnershipId: string;
    partnerId: string;
    acknowledged: boolean;
    success: boolean;
    failureReason?: string;
  };

  partner_declined: {
    partnershipId: string;
    partnerId: string;
    acknowledged: boolean;
    success: boolean;
    failureReason?: string;
  };

  // Employee acknowledgements
  employee_acknowledged: {
    employeeId: string;
    acknowledged: boolean;
    success: boolean;
    failureReason?: string;
  };

  employee_declined: {
    employeeId: string;
    acknowledged: boolean;
    success: boolean;
    failureReason?: string;
  };

  // Cash transactions
  cash_transaction_initiated: {
    transactionId: string;
    amount: number;
    recipientId: string;
    currency: string;
    success: boolean;
    failureReason?: string;
  };

  cash_transaction_confirmed: {
    transactionId: string;
    amount: number;
    recipientId: string;
    currency: string;
    success: boolean;
    failureReason?: string;
  };

  cash_transaction_expired: {
    transactionId: string;
    amount: number;
    recipientId: string;
    currency: string;
    success: boolean;
    failureReason?: string;
  };

  cash_transaction_overridden: {
    transactionId: string;
    amount: number;
    recipientId: string;
    currency: string;
    success: boolean;
    failureReason?: string;
  };

  // Disbursements
  disbursement_allocated: {
    disbursementId: string;
    amount: number;
    supervisorId: string;
    currency: string;
    success: boolean;
    failureReason?: string;
  };

  disbursement_payout_created: {
    disbursementId: string;
    amount: number;
    supervisorId: string;
    labourId: string;
    currency: string;
    success: boolean;
    failureReason?: string;
  };

  disbursement_payout_confirmed: {
    disbursementId: string;
    amount: number;
    supervisorId: string;
    labourId: string;
    currency: string;
    success: boolean;
    failureReason?: string;
  };

  disbursement_bill_submitted: {
    disbursementId: string;
    amount: number;
    supervisorId: string;
    currency: string;
    success: boolean;
    failureReason?: string;
  };

  disbursement_bill_approved: {
    disbursementId: string;
    amount: number;
    supervisorId: string;
    currency: string;
    success: boolean;
    failureReason?: string;
  };

  disbursement_float_returned: {
    disbursementId: string;
    amount: number;
    supervisorId: string;
    currency: string;
    success: boolean;
    failureReason?: string;
  };

  // Issue lifecycle
  issue_created: {
    issueId: string;
    issueType: string;
    urgency: string;
    reportedBy: string;
    success: boolean;
    failureReason?: string;
  };

  issue_acknowledged: {
    issueId: string;
    issueType: string;
    urgency: string;
    reportedBy: string;
    acknowledgedBy: string;
    success: boolean;
    failureReason?: string;
  };

  issue_assigned: {
    issueId: string;
    issueType: string;
    urgency: string;
    reportedBy: string;
    assignedTo: string;
    success: boolean;
    failureReason?: string;
  };

  issue_resolved: {
    issueId: string;
    issueType: string;
    urgency: string;
    reportedBy: string;
    resolvedBy: string;
    success: boolean;
    failureReason?: string;
  };

  issue_closed: {
    issueId: string;
    issueType: string;
    urgency: string;
    reportedBy: string;
    closedBy: string;
    success: boolean;
    failureReason?: string;
  };

  // Professional linking
  professional_invited: {
    professionalId: string;
    organizationId: string;
    scopes: string[];
    success: boolean;
    failureReason?: string;
  };

  professional_accepted: {
    professionalId: string;
    organizationId: string;
    scopes: string[];
    success: boolean;
    failureReason?: string;
  };

  professional_declined: {
    professionalId: string;
    organizationId: string;
    scopes: string[];
    success: boolean;
    failureReason?: string;
  };

  professional_revoked: {
    professionalId: string;
    organizationId: string;
    scopes: string[];
    success: boolean;
    failureReason?: string;
  };

  // Punch system
  punch_punch_in: {
    employeeId: string;
    punchId: string;
    success: boolean;
    failureReason?: string;
  };

  punch_punch_out: {
    employeeId: string;
    punchId: string;
    success: boolean;
    failureReason?: string;
  };

  punch_punch_synced: {
    employeeId: string;
    punchId: string;
    success: boolean;
    failureReason?: string;
  };

  // Dashboard and UI events
  dashboard_viewed: {
    userId: string;
    organizationId: string;
    category: string;
    widgetCount: number;
    success: boolean;
  };

  widget_tapped: {
    userId: string;
    organizationId: string;
    widgetId: string;
    action: string;
    success: boolean;
  };

  quick_action_tapped: {
    userId: string;
    organizationId: string;
    actionId: string;
    actionTitle: string;
    success: boolean;
  };

  // Permission events
  permission_denied: {
    userId: string;
    organizationId: string;
    resource: string;
    action: string;
    screen: string;
    reason: string;
    success: boolean;
  };

  // Navigation events
  navigation_denied: {
    userId: string;
    organizationId: string;
    screen: string;
    reason: string;
    fallbackScreen: string;
    success: boolean;
  };

  // Audit events
  audit_logs_viewed: {
    userId: string;
    organizationId: string;
    filter: string;
    logCount: number;
    success: boolean;
  };

  audit_filter_changed: {
    userId: string;
    organizationId: string;
    filter: string;
    success: boolean;
  };
}

class AnalyticsService {
  private readonly STORAGE_KEY = "analytics_events";
  private readonly MAX_LOCAL_EVENTS = 5000; // Keep last 5000 events locally
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  // Track an analytics event
  async track<T extends keyof EventMap>(
    event: T,
    properties: EventMap[T] & {
      organizationId?: string;
      userId?: string;
      success?: boolean;
      failureReason?: string;
    },
  ): Promise<void> {
    try {
      const user = appState.getUser();
      const organizationId = appState.getCurrentOrganizationId();

      const analyticsEvent: AnalyticsEvent = {
        event,
        properties: {
          ...properties,
          organizationId: properties.organizationId || organizationId,
          userId: properties.userId || user?.id,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
          platform: "mobile",
          appVersion: "1.0.0",
        },
        timestamp: new Date(),
        userId: properties.userId || user?.id,
        organizationId: properties.organizationId || organizationId,
        sessionId: this.sessionId,
      };

      // Store locally
      await this.storeEvent(analyticsEvent);

      // Send to server (in production)
      await this.sendToServer(analyticsEvent);

      console.log("📊 Analytics event tracked:", {
        event,
        userId: analyticsEvent.userId,
        organizationId: analyticsEvent.organizationId,
        success: properties.success,
      });
    } catch (error) {
      console.error("Error tracking analytics event:", error);
    }
  }

  // Query analytics events
  async queryEvents(query: AnalyticsQuery): Promise<AnalyticsEvent[]> {
    try {
      const events = await this.getEvents();

      let filteredEvents = events;

      // Apply filters
      if (query.event) {
        filteredEvents = filteredEvents.filter(
          (event) => event.event === query.event,
        );
      }

      if (query.userId) {
        filteredEvents = filteredEvents.filter(
          (event) => event.userId === query.userId,
        );
      }

      if (query.organizationId) {
        filteredEvents = filteredEvents.filter(
          (event) => event.organizationId === query.organizationId,
        );
      }

      if (query.startDate) {
        filteredEvents = filteredEvents.filter(
          (event) => event.timestamp >= new Date(query.startDate),
        );
      }

      if (query.endDate) {
        filteredEvents = filteredEvents.filter(
          (event) => event.timestamp <= new Date(query.endDate),
        );
      }

      // Sort by timestamp (newest first)
      filteredEvents.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 100;

      return filteredEvents.slice(offset, offset + limit);
    } catch (error) {
      console.error("Error querying analytics events:", error);
      return [];
    }
  }

  // Get analytics statistics
  async getAnalyticsStats(organizationId?: string): Promise<AnalyticsStats> {
    try {
      const events = await this.getEvents();
      const filteredEvents = organizationId
        ? events.filter((event) => event.organizationId === organizationId)
        : events;

      const totalEvents = filteredEvents.length;
      const uniqueUsers = new Set(filteredEvents.map((event) => event.userId))
        .size;

      const eventsByType: Record<string, number> = {};
      const eventsByUser: Record<string, number> = {};
      const eventsByOrganization: Record<string, number> = {};

      let successCount = 0;
      let failureCount = 0;

      filteredEvents.forEach((event) => {
        eventsByType[event.event] = (eventsByType[event.event] || 0) + 1;

        if (event.userId) {
          eventsByUser[event.userId] = (eventsByUser[event.userId] || 0) + 1;
        }

        if (event.organizationId) {
          eventsByOrganization[event.organizationId] =
            (eventsByOrganization[event.organizationId] || 0) + 1;
        }

        if (event.properties.success === true) {
          successCount++;
        } else if (event.properties.success === false) {
          failureCount++;
        }
      });

      return {
        totalEvents,
        uniqueUsers,
        eventsByType,
        eventsByUser,
        eventsByOrganization,
        successRate: totalEvents > 0 ? (successCount / totalEvents) * 100 : 0,
        failureRate: totalEvents > 0 ? (failureCount / totalEvents) * 100 : 0,
        recentEvents: filteredEvents.slice(0, 10),
      };
    } catch (error) {
      console.error("Error getting analytics stats:", error);
      return {
        totalEvents: 0,
        uniqueUsers: 0,
        eventsByType: {},
        eventsByUser: {},
        eventsByOrganization: {},
        successRate: 0,
        failureRate: 0,
        recentEvents: [],
      };
    }
  }

  // Export analytics events
  async exportEvents(query: AnalyticsQuery): Promise<string> {
    try {
      const events = await this.queryEvents(query);

      // Convert to CSV format
      const csvHeaders = [
        "Event",
        "Timestamp",
        "User ID",
        "Organization ID",
        "Session ID",
        "Success",
        "Properties",
      ];

      const csvRows = events.map((event) => [
        event.event,
        event.timestamp.toISOString(),
        event.userId || "",
        event.organizationId || "",
        event.sessionId || "",
        event.properties.success || false,
        JSON.stringify(event.properties),
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map((row) => row.map((field) => `"${field}"`).join(","))
        .join("\n");

      return csvContent;
    } catch (error) {
      console.error("Error exporting analytics events:", error);
      return "";
    }
  }

  // Store event locally
  private async storeEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const existingEvents = await this.getEvents();
      const updatedEvents = [event, ...existingEvents].slice(
        0,
        this.MAX_LOCAL_EVENTS,
      );

      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(updatedEvents),
      );
    } catch (error) {
      console.error("Error storing analytics event:", error);
    }
  }

  // Get events from local storage
  private async getEvents(): Promise<AnalyticsEvent[]> {
    try {
      const eventsJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!eventsJson) return [];

      const events = JSON.parse(eventsJson);
      return events.map((event: any) => ({
        ...event,
        timestamp: new Date(event.timestamp),
      }));
    } catch (error) {
      console.error("Error getting analytics events:", error);
      return [];
    }
  }

  // Send to server (mock implementation)
  private async sendToServer(event: AnalyticsEvent): Promise<void> {
    try {
      // In production, this would send to the server
      console.log("📤 Sending analytics event to server:", event.event);
    } catch (error) {
      console.error("Error sending analytics event to server:", error);
    }
  }

  // Generate session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Start new session
  startNewSession(): void {
    this.sessionId = this.generateSessionId();
  }

  // Get current session ID
  getCurrentSessionId(): string {
    return this.sessionId;
  }

  // Clean up old events
  async cleanupOldEvents(): Promise<void> {
    try {
      const events = await this.getEvents();
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const filteredEvents = events.filter(
        (event) => event.timestamp > thirtyDaysAgo,
      );

      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(filteredEvents),
      );

      console.log(
        `🧹 Cleaned up ${events.length - filteredEvents.length} old analytics events`,
      );
    } catch (error) {
      console.error("Error cleaning up old events:", error);
    }
  }
}

export const analyticsService = new AnalyticsService();
