import { appState } from "../state/AppState";
import { analytics } from "../analytics/AnalyticsService";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AuditLog {
  id: string;
  timestamp: string;
  organizationId: string;
  actorId: string;
  actorRole: string;
  actorCategory: string;
  action: string;
  resource: string;
  resourceId?: string;
  targetId?: string;
  targetType?: string;
  success: boolean;
  failureReason?: string;
  metadata: Record<string, any>;
  dataRetentionTag: DataRetentionTag;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface DataRetentionTag {
  category:
    | "operational"
    | "financial"
    | "personal"
    | "compliance"
    | "security";
  retentionPeriod: number; // in days
  autoDelete: boolean;
  legalHold: boolean;
  description: string;
}

export interface AuditQuery {
  organizationId?: string;
  actorId?: string;
  action?: string;
  resource?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  dataRetentionTag?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  totalEvents: number;
  successRate: number;
  failureRate: number;
  eventsByAction: Record<string, number>;
  eventsByResource: Record<string, number>;
  eventsByActor: Record<string, number>;
  eventsByRetentionTag: Record<string, number>;
  recentEvents: AuditLog[];
}

class AuditService {
  private readonly STORAGE_KEY = "audit_logs";
  private readonly MAX_LOCAL_LOGS = 1000; // Keep last 1000 logs locally

  // Data retention policy
  private readonly RETENTION_TAGS: Record<string, DataRetentionTag> = {
    operational: {
      category: "operational",
      retentionPeriod: 365, // 1 year
      autoDelete: true,
      legalHold: false,
      description: "General operational activities",
    },
    financial: {
      category: "financial",
      retentionPeriod: 2555, // 7 years
      autoDelete: false,
      legalHold: true,
      description: "Financial transactions and records",
    },
    personal: {
      category: "personal",
      retentionPeriod: 90, // 3 months
      autoDelete: true,
      legalHold: false,
      description: "Personal data and privacy-related events",
    },
    compliance: {
      category: "compliance",
      retentionPeriod: 1825, // 5 years
      autoDelete: false,
      legalHold: true,
      description: "Compliance and regulatory events",
    },
    security: {
      category: "security",
      retentionPeriod: 1095, // 3 years
      autoDelete: false,
      legalHold: true,
      description: "Security events and access control",
    },
  };

  // Log an audit event
  async logEvent(
    action: string,
    resource: string,
    success: boolean,
    metadata: Record<string, any> = {},
    resourceId?: string,
    targetId?: string,
    targetType?: string,
    failureReason?: string,
    dataRetentionTag: string = "operational",
  ): Promise<string> {
    try {
      const user = appState.getUser();
      const organizationId = appState.getCurrentOrganizationId();

      if (!user || !organizationId) {
        console.error(
          "Cannot log audit event: User or organization not available",
        );
        return "";
      }

      const auditLog: AuditLog = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        organizationId,
        actorId: user.id,
        actorRole: user.role || "unknown",
        actorCategory: user.category || "unknown",
        action,
        resource,
        resourceId,
        targetId,
        targetType,
        success,
        failureReason,
        metadata: {
          ...metadata,
          appVersion: "1.0.0", // This would come from app config
          platform: "mobile",
        },
        dataRetentionTag:
          this.RETENTION_TAGS[dataRetentionTag] ||
          this.RETENTION_TAGS.operational,
        sessionId: this.generateSessionId(),
      };

      // Store locally
      await this.storeAuditLog(auditLog);

      // Track analytics event
      await this.trackAnalyticsEvent(auditLog);

      // Send to server (in production)
      await this.sendToServer(auditLog);

      console.log("📊 Audit event logged:", {
        id: auditLog.id,
        action,
        resource,
        success,
        actorRole: auditLog.actorRole,
        actorCategory: auditLog.actorCategory,
      });

      return auditLog.id;
    } catch (error) {
      console.error("Error logging audit event:", error);
      return "";
    }
  }

  // Category change audit
  async logCategoryChange(
    oldCategory: string,
    newCategory: string,
    success: boolean,
    failureReason?: string,
  ): Promise<string> {
    return this.logEvent(
      "category_changed",
      "user_profile",
      success,
      {
        oldCategory,
        newCategory,
        changeType: "category_update",
      },
      undefined,
      undefined,
      "user",
      failureReason,
      "compliance",
    );
  }

  // Partner acknowledgement audit
  async logPartnerAcknowledgement(
    partnershipId: string,
    partnerId: string,
    acknowledged: boolean,
    success: boolean,
    failureReason?: string,
  ): Promise<string> {
    return this.logEvent(
      acknowledged ? "partner_acknowledged" : "partner_declined",
      "partnership",
      success,
      {
        partnershipId,
        partnerId,
        acknowledged,
        acknowledgementType: "partnership",
      },
      partnershipId,
      partnerId,
      "partner",
      failureReason,
      "compliance",
    );
  }

  // Employee acknowledgement audit
  async logEmployeeAcknowledgement(
    employeeId: string,
    acknowledged: boolean,
    success: boolean,
    failureReason?: string,
  ): Promise<string> {
    return this.logEvent(
      acknowledged ? "employee_acknowledged" : "employee_declined",
      "employee",
      success,
      {
        employeeId,
        acknowledged,
        acknowledgementType: "employment_terms",
      },
      employeeId,
      employeeId,
      "employee",
      failureReason,
      "operational",
    );
  }

  // Cash transaction audit
  async logCashTransaction(
    transactionId: string,
    action: "initiated" | "confirmed" | "expired" | "overridden",
    amount: number,
    recipientId: string,
    success: boolean,
    failureReason?: string,
  ): Promise<string> {
    return this.logEvent(
      `cash_transaction_${action}`,
      "cash_transaction",
      success,
      {
        transactionId,
        action,
        amount,
        recipientId,
        currency: "INR",
      },
      transactionId,
      recipientId,
      "user",
      failureReason,
      "financial",
    );
  }

  // Fund disbursement audit
  async logDisbursement(
    disbursementId: string,
    action:
      | "allocated"
      | "payout_created"
      | "payout_confirmed"
      | "bill_submitted"
      | "bill_approved"
      | "float_returned",
    amount: number,
    supervisorId?: string,
    labourId?: string,
    success: boolean,
    failureReason?: string,
  ): Promise<string> {
    return this.logEvent(
      `disbursement_${action}`,
      "fund_disbursement",
      success,
      {
        disbursementId,
        action,
        amount,
        supervisorId,
        labourId,
        currency: "INR",
      },
      disbursementId,
      supervisorId || labourId,
      supervisorId ? "supervisor" : "labour",
      failureReason,
      "financial",
    );
  }

  // Issue lifecycle audit
  async logIssueLifecycle(
    issueId: string,
    action: "created" | "acknowledged" | "assigned" | "resolved" | "closed",
    issueType: string,
    urgency: string,
    reportedBy: string,
    assignedTo?: string,
    success: boolean,
    failureReason?: string,
  ): Promise<string> {
    return this.logEvent(
      `issue_${action}`,
      "machine_issue",
      success,
      {
        issueId,
        action,
        issueType,
        urgency,
        reportedBy,
        assignedTo,
      },
      issueId,
      assignedTo || reportedBy,
      assignedTo ? "supervisor" : "labour",
      failureReason,
      "operational",
    );
  }

  // Professional linking audit
  async logProfessionalLinking(
    professionalId: string,
    organizationId: string,
    action: "invited" | "accepted" | "declined" | "revoked",
    scopes: string[],
    success: boolean,
    failureReason?: string,
  ): Promise<string> {
    return this.logEvent(
      `professional_${action}`,
      "professional_link",
      success,
      {
        professionalId,
        organizationId,
        action,
        scopes,
        linkType: "service_provider",
      },
      professionalId,
      organizationId,
      "organization",
      failureReason,
      "compliance",
    );
  }

  // Punch system audit
  async logPunchEvent(
    employeeId: string,
    action: "punch_in" | "punch_out" | "punch_synced",
    punchId: string,
    success: boolean,
    failureReason?: string,
  ): Promise<string> {
    return this.logEvent(
      `punch_${action}`,
      "attendance",
      success,
      {
        employeeId,
        punchId,
        action,
        punchType: "attendance_tracking",
      },
      punchId,
      employeeId,
      "employee",
      failureReason,
      "operational",
    );
  }

  // Query audit logs
  async queryAuditLogs(query: AuditQuery): Promise<AuditLog[]> {
    try {
      const logs = await this.getAuditLogs();

      let filteredLogs = logs;

      // Apply filters
      if (query.organizationId) {
        filteredLogs = filteredLogs.filter(
          (log) => log.organizationId === query.organizationId,
        );
      }

      if (query.actorId) {
        filteredLogs = filteredLogs.filter(
          (log) => log.actorId === query.actorId,
        );
      }

      if (query.action) {
        filteredLogs = filteredLogs.filter(
          (log) => log.action === query.action,
        );
      }

      if (query.resource) {
        filteredLogs = filteredLogs.filter(
          (log) => log.resource === query.resource,
        );
      }

      if (query.success !== undefined) {
        filteredLogs = filteredLogs.filter(
          (log) => log.success === query.success,
        );
      }

      if (query.startDate) {
        filteredLogs = filteredLogs.filter(
          (log) => log.timestamp >= query.startDate,
        );
      }

      if (query.endDate) {
        filteredLogs = filteredLogs.filter(
          (log) => log.timestamp <= query.endDate,
        );
      }

      if (query.dataRetentionTag) {
        filteredLogs = filteredLogs.filter(
          (log) => log.dataRetentionTag.category === query.dataRetentionTag,
        );
      }

      // Sort by timestamp (newest first)
      filteredLogs.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 100;

      return filteredLogs.slice(offset, offset + limit);
    } catch (error) {
      console.error("Error querying audit logs:", error);
      return [];
    }
  }

  // Get audit statistics
  async getAuditStats(organizationId?: string): Promise<AuditStats> {
    try {
      const logs = await this.getAuditLogs();
      const filteredLogs = organizationId
        ? logs.filter((log) => log.organizationId === organizationId)
        : logs;

      const totalEvents = filteredLogs.length;
      const successCount = filteredLogs.filter((log) => log.success).length;
      const failureCount = totalEvents - successCount;

      const eventsByAction: Record<string, number> = {};
      const eventsByResource: Record<string, number> = {};
      const eventsByActor: Record<string, number> = {};
      const eventsByRetentionTag: Record<string, number> = {};

      filteredLogs.forEach((log) => {
        eventsByAction[log.action] = (eventsByAction[log.action] || 0) + 1;
        eventsByResource[log.resource] =
          (eventsByResource[log.resource] || 0) + 1;
        eventsByActor[log.actorId] = (eventsByActor[log.actorId] || 0) + 1;
        eventsByRetentionTag[log.dataRetentionTag.category] =
          (eventsByRetentionTag[log.dataRetentionTag.category] || 0) + 1;
      });

      return {
        totalEvents,
        successRate: totalEvents > 0 ? (successCount / totalEvents) * 100 : 0,
        failureRate: totalEvents > 0 ? (failureCount / totalEvents) * 100 : 0,
        eventsByAction,
        eventsByResource,
        eventsByActor,
        eventsByRetentionTag,
        recentEvents: filteredLogs.slice(0, 10),
      };
    } catch (error) {
      console.error("Error getting audit stats:", error);
      return {
        totalEvents: 0,
        successRate: 0,
        failureRate: 0,
        eventsByAction: {},
        eventsByResource: {},
        eventsByActor: {},
        eventsByRetentionTag: {},
        recentEvents: [],
      };
    }
  }

  // Export audit logs
  async exportAuditLogs(query: AuditQuery): Promise<string> {
    try {
      const logs = await this.queryAuditLogs(query);

      // Convert to CSV format
      const csvHeaders = [
        "ID",
        "Timestamp",
        "Organization ID",
        "Actor ID",
        "Actor Role",
        "Actor Category",
        "Action",
        "Resource",
        "Resource ID",
        "Target ID",
        "Target Type",
        "Success",
        "Failure Reason",
        "Data Retention Tag",
        "Session ID",
        "Metadata",
      ];

      const csvRows = logs.map((log) => [
        log.id,
        log.timestamp,
        log.organizationId,
        log.actorId,
        log.actorRole,
        log.actorCategory,
        log.action,
        log.resource,
        log.resourceId || "",
        log.targetId || "",
        log.targetType || "",
        log.success,
        log.failureReason || "",
        log.dataRetentionTag.category,
        log.sessionId || "",
        JSON.stringify(log.metadata),
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map((row) => row.map((field) => `"${field}"`).join(","))
        .join("\n");

      return csvContent;
    } catch (error) {
      console.error("Error exporting audit logs:", error);
      return "";
    }
  }

  // Store audit log locally
  private async storeAuditLog(auditLog: AuditLog): Promise<void> {
    try {
      const existingLogs = await this.getAuditLogs();
      const updatedLogs = [auditLog, ...existingLogs].slice(
        0,
        this.MAX_LOCAL_LOGS,
      );

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedLogs));
    } catch (error) {
      console.error("Error storing audit log:", error);
    }
  }

  // Get audit logs from local storage
  private async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const logsJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      return logsJson ? JSON.parse(logsJson) : [];
    } catch (error) {
      console.error("Error getting audit logs:", error);
      return [];
    }
  }

  // Track analytics event
  private async trackAnalyticsEvent(auditLog: AuditLog): Promise<void> {
    try {
      await analytics.track({
        event: auditLog.action,
        properties: {
          organizationId: auditLog.organizationId,
          actorId: auditLog.actorId,
          actorRole: auditLog.actorRole,
          actorCategory: auditLog.actorCategory,
          resource: auditLog.resource,
          resourceId: auditLog.resourceId,
          targetId: auditLog.targetId,
          targetType: auditLog.targetType,
          success: auditLog.success,
          failureReason: auditLog.failureReason,
          dataRetentionTag: auditLog.dataRetentionTag.category,
          sessionId: auditLog.sessionId,
          ...auditLog.metadata,
        },
        timestamp: new Date(auditLog.timestamp),
      });
    } catch (error) {
      console.error("Error tracking analytics event:", error);
    }
  }

  // Send to server (mock implementation)
  private async sendToServer(auditLog: AuditLog): Promise<void> {
    try {
      // In production, this would send to the server
      console.log("📤 Sending audit log to server:", auditLog.id);
    } catch (error) {
      console.error("Error sending audit log to server:", error);
    }
  }

  // Generate session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Clean up old logs based on retention policy
  async cleanupOldLogs(): Promise<void> {
    try {
      const logs = await this.getAuditLogs();
      const now = new Date();

      const filteredLogs = logs.filter((log) => {
        const logDate = new Date(log.timestamp);
        const daysDiff =
          (now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24);

        // Keep logs that haven't exceeded retention period
        return daysDiff <= log.dataRetentionTag.retentionPeriod;
      });

      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(filteredLogs),
      );

      console.log(
        `🧹 Cleaned up ${logs.length - filteredLogs.length} old audit logs`,
      );
    } catch (error) {
      console.error("Error cleaning up old logs:", error);
    }
  }
}

export const auditService = new AuditService();
