import { appState } from "../state/AppState";
import { analytics } from "../analytics/AnalyticsService";

export interface Permission {
  resource: string;
  action: string;
  scope?: string;
}

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
  requiredRole?: string;
  requiredScope?: string;
}

export interface PermissionAuditLog {
  id: string;
  userId: string;
  organizationId: string;
  resource: string;
  action: string;
  allowed: boolean;
  reason?: string;
  screen: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Permission Matrix Definition
export const PERMISSION_MATRIX = {
  // Owner/Partner: all org features
  owner: {
    employees: ["create", "read", "update", "delete", "invite", "acknowledge"],
    attendance: ["read", "update", "export"],
    cash_transactions: ["create", "read", "update", "delete", "override"],
    cash_ledger: ["read", "export"],
    fund_disbursement: [
      "create",
      "read",
      "update",
      "delete",
      "allocate",
      "approve",
    ],
    machine_issues: ["read", "update", "assign", "resolve"],
    organizations: ["create", "read", "update", "delete", "invite", "manage"],
    partnerships: ["create", "read", "update", "delete", "acknowledge"],
    professional_invites: ["create", "read", "update", "delete", "revoke"],
    punch_system: ["read", "override"],
    reports: ["read", "export"],
    settings: ["read", "update"],
  },

  // Manager/Supervisor: employees:r, attendance:rw for team, cash_payouts:rw within float, issues:rw
  manager: {
    employees: ["read", "invite", "acknowledge"],
    attendance: ["read", "update"],
    cash_transactions: ["create", "read"],
    cash_ledger: ["read"],
    fund_disbursement: ["read", "create_payout", "submit_bill"],
    machine_issues: ["read", "update", "assign", "resolve"],
    punch_system: ["read"],
    reports: ["read"],
  },

  supervisor: {
    employees: ["read", "invite", "acknowledge"],
    attendance: ["read", "update"],
    cash_transactions: ["create", "read"],
    cash_ledger: ["read"],
    fund_disbursement: ["read", "create_payout", "submit_bill"],
    machine_issues: ["read", "update", "assign", "resolve"],
    punch_system: ["read"],
    reports: ["read"],
  },

  // Accountant: invoices/POs:rw, cash_ledger:r, attendance:r
  accountant: {
    invoices: ["create", "read", "update", "delete"],
    purchase_orders: ["create", "read", "update", "delete"],
    cash_ledger: ["read", "export"],
    attendance: ["read"],
    reports: ["read", "export"],
  },

  // Labour: self attendance:rw, issues:create, cash_ack:confirm, no employees access
  labour: {
    attendance: ["read", "update"], // self only
    machine_issues: ["create", "read"], // own issues only
    cash_transactions: ["confirm"], // confirmation only
    punch_system: ["punch_in", "punch_out", "read"], // own punches only
  },

  // Professionals: per service link scopes only
  professional: {
    // Scopes are defined per service link
    // Default: no access until linked
  },
};

// Service Link Scopes
export const SERVICE_SCOPES = {
  view_invoices: {
    resource: "invoices",
    actions: ["read"],
    description: "View client invoices",
  },
  upload_legal_docs: {
    resource: "documents",
    actions: ["create", "read", "update"],
    description: "Upload and manage legal documents",
  },
  file_gst_returns: {
    resource: "gst_returns",
    actions: ["create", "read", "update"],
    description: "File and manage GST returns",
  },
  upload_compliance_docs: {
    resource: "compliance",
    actions: ["create", "read", "update"],
    description: "Upload compliance documents",
  },
  view_employee_data: {
    resource: "employees",
    actions: ["read"],
    description: "View employee information",
  },
  view_attendance: {
    resource: "attendance",
    actions: ["read"],
    description: "View attendance records",
  },
  view_cash_transactions: {
    resource: "cash_transactions",
    actions: ["read"],
    description: "View cash transaction history",
  },
  view_fund_disbursements: {
    resource: "fund_disbursements",
    actions: ["read"],
    description: "View fund disbursement records",
  },
  view_financial_reports: {
    resource: "financial_reports",
    actions: ["read"],
    description: "View financial reports and analytics",
  },
};

class PermissionsService {
  private auditLogs: PermissionAuditLog[] = [];

  // Check if user has permission for a specific action
  async checkPermission(
    resource: string,
    action: string,
    screen: string,
    metadata?: Record<string, any>,
  ): Promise<PermissionCheck> {
    try {
      const user = appState.getUser();
      const organizationId = appState.getCurrentOrganizationId();

      if (!user || !organizationId) {
        return this.denyPermission(
          "User not authenticated or no organization context",
          screen,
          metadata,
        );
      }

      const userRole = this.getUserRole(user);
      const permissions = this.getUserPermissions(userRole, user);

      // Check if user has permission
      const hasPermission = this.hasPermission(
        permissions,
        resource,
        action,
        user,
        organizationId,
      );

      if (!hasPermission.allowed) {
        // Log permission denial
        await this.logPermissionDenial(
          user.id,
          organizationId,
          resource,
          action,
          screen,
          hasPermission.reason,
          metadata,
        );

        // Track analytics
        analytics.track({
          event: "permission_denied",
          properties: {
            userId: user.id,
            organizationId,
            resource,
            action,
            screen,
            reason: hasPermission.reason,
            userRole: user.category,
            metadata,
          },
          timestamp: new Date(),
        });

        return hasPermission;
      }

      // Log successful permission check
      await this.logPermissionGrant(
        user.id,
        organizationId,
        resource,
        action,
        screen,
        metadata,
      );

      return { allowed: true };
    } catch (error) {
      console.error("Error checking permission:", error);
      return this.denyPermission("Permission check failed", screen, metadata);
    }
  }

  // Check if user can access a specific screen
  async canAccessScreen(
    screen: string,
    metadata?: Record<string, any>,
  ): Promise<PermissionCheck> {
    const screenPermissions = this.getScreenPermissions(screen);

    if (!screenPermissions) {
      return { allowed: true }; // No specific permissions required
    }

    return this.checkPermission(
      screenPermissions.resource,
      screenPermissions.action,
      screen,
      metadata,
    );
  }

  // Check if user can perform an action on a specific resource
  async canPerformAction(
    resource: string,
    action: string,
    screen: string,
    metadata?: Record<string, any>,
  ): Promise<PermissionCheck> {
    return this.checkPermission(resource, action, screen, metadata);
  }

  // Get user's role for permission checking
  private getUserRole(user: any): string {
    if (!user.category) return "labour"; // Default fallback

    // Map user categories to permission roles
    switch (user.category) {
      case "owner":
      case "partner":
      case "director":
        return "owner";
      case "manager":
        return "manager";
      case "supervisor":
        return "supervisor";
      case "accountant":
        return "accountant";
      case "labour":
      case "operator":
        return "labour";
      case "ca":
      case "lawyer":
      case "advocate":
      case "professional":
        return "professional";
      default:
        return "labour";
    }
  }

  // Get user's permissions based on role and context
  private getUserPermissions(role: string, user: any): any {
    if (role === "professional") {
      // For professionals, permissions are based on service link scopes
      return this.getProfessionalPermissions(user);
    }

    return PERMISSION_MATRIX[role as keyof typeof PERMISSION_MATRIX] || {};
  }

  // Get professional permissions based on service link scopes
  private getProfessionalPermissions(user: any): any {
    // This would be populated from the professional service
    // For now, return empty permissions (no access by default)
    return {};
  }

  // Check if user has specific permission
  private hasPermission(
    permissions: any,
    resource: string,
    action: string,
    user: any,
    organizationId: string,
  ): PermissionCheck {
    // Check if resource exists in permissions
    if (!permissions[resource]) {
      return this.denyPermission(
        `No access to resource: ${resource}`,
        "permission_check",
        { resource, action },
      );
    }

    // Check if action is allowed for resource
    const allowedActions = permissions[resource];
    if (!allowedActions.includes(action)) {
      return this.denyPermission(
        `Action '${action}' not allowed on resource '${resource}'`,
        "permission_check",
        { resource, action, allowedActions },
      );
    }

    // Additional context-specific checks
    return this.performContextChecks(resource, action, user, organizationId);
  }

  // Perform context-specific permission checks
  private performContextChecks(
    resource: string,
    action: string,
    user: any,
    organizationId: string,
  ): PermissionCheck {
    const userRole = this.getUserRole(user);

    // Labour-specific restrictions
    if (userRole === "labour") {
      // Labour can only access their own data
      if (resource === "attendance" && action === "update") {
        return { allowed: true }; // Self-attendance is allowed
      }

      if (resource === "machine_issues" && action === "create") {
        return { allowed: true }; // Can create issues
      }

      if (resource === "cash_transactions" && action === "confirm") {
        return { allowed: true }; // Can confirm cash transactions
      }

      if (resource === "punch_system") {
        return { allowed: true }; // Can punch in/out
      }
    }

    // Manager/Supervisor restrictions
    if (userRole === "manager" || userRole === "supervisor") {
      // Can only manage their team's attendance
      if (resource === "attendance" && action === "update") {
        return { allowed: true }; // Team attendance management
      }

      // Can only create payouts within their float
      if (resource === "fund_disbursement" && action === "create_payout") {
        return { allowed: true }; // Float-based payout creation
      }
    }

    // Accountant restrictions
    if (userRole === "accountant") {
      // Can only read, not modify attendance
      if (resource === "attendance" && action === "read") {
        return { allowed: true };
      }

      // Can manage invoices and POs
      if (resource === "invoices" || resource === "purchase_orders") {
        return { allowed: true };
      }
    }

    // Owner/Partner - full access
    if (userRole === "owner") {
      return { allowed: true };
    }

    return { allowed: true };
  }

  // Get screen-specific permissions
  private getScreenPermissions(
    screen: string,
  ): { resource: string; action: string } | null {
    const screenPermissionMap: Record<
      string,
      { resource: string; action: string }
    > = {
      employees: { resource: "employees", action: "read" },
      "employees/create": { resource: "employees", action: "create" },
      "employees/invite": { resource: "employees", action: "invite" },
      attendance: { resource: "attendance", action: "read" },
      "punch-card": { resource: "punch_system", action: "punch_in" },
      "machine-issues": { resource: "machine_issues", action: "create" },
      "issue-management": { resource: "machine_issues", action: "read" },
      "cash-transactions": { resource: "cash_transactions", action: "create" },
      "cash-ledger": { resource: "cash_ledger", action: "read" },
      "fund-disbursement": { resource: "fund_disbursement", action: "read" },
      "supervisor-disbursement": {
        resource: "fund_disbursement",
        action: "create_payout",
      },
      "professional-invites": {
        resource: "professional_invites",
        action: "create",
      },
      "professional-dashboard": {
        resource: "professional_invites",
        action: "read",
      },
      "client-workspace": { resource: "professional_invites", action: "read" },
    };

    return screenPermissionMap[screen] || null;
  }

  // Deny permission with reason
  private denyPermission(
    reason: string,
    screen: string,
    metadata?: Record<string, any>,
  ): PermissionCheck {
    return {
      allowed: false,
      reason,
      metadata,
    };
  }

  // Log permission denial
  private async logPermissionDenial(
    userId: string,
    organizationId: string,
    resource: string,
    action: string,
    screen: string,
    reason: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const auditLog: PermissionAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      organizationId,
      resource,
      action,
      allowed: false,
      reason,
      screen,
      timestamp: new Date().toISOString(),
      metadata,
    };

    this.auditLogs.push(auditLog);

    // In a real app, this would be sent to the server
    console.log("🔒 Permission Denied:", auditLog);
  }

  // Log permission grant
  private async logPermissionGrant(
    userId: string,
    organizationId: string,
    resource: string,
    action: string,
    screen: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const auditLog: PermissionAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      organizationId,
      resource,
      action,
      allowed: true,
      screen,
      timestamp: new Date().toISOString(),
      metadata,
    };

    this.auditLogs.push(auditLog);
  }

  // Get audit logs
  getAuditLogs(): PermissionAuditLog[] {
    return [...this.auditLogs];
  }

  // Get audit logs for specific user
  getAuditLogsForUser(userId: string): PermissionAuditLog[] {
    return this.auditLogs.filter((log) => log.userId === userId);
  }

  // Get audit logs for specific organization
  getAuditLogsForOrganization(organizationId: string): PermissionAuditLog[] {
    return this.auditLogs.filter(
      (log) => log.organizationId === organizationId,
    );
  }

  // Check if user can access a specific feature
  async canAccessFeature(
    feature: string,
    screen: string,
    metadata?: Record<string, any>,
  ): Promise<PermissionCheck> {
    const featurePermissions: Record<
      string,
      { resource: string; action: string }
    > = {
      add_employee: { resource: "employees", action: "create" },
      invite_employee: { resource: "employees", action: "invite" },
      manage_attendance: { resource: "attendance", action: "update" },
      create_cash_transaction: {
        resource: "cash_transactions",
        action: "create",
      },
      view_cash_ledger: { resource: "cash_ledger", action: "read" },
      allocate_float: { resource: "fund_disbursement", action: "allocate" },
      create_payout: { resource: "fund_disbursement", action: "create_payout" },
      report_issue: { resource: "machine_issues", action: "create" },
      manage_issues: { resource: "machine_issues", action: "update" },
      punch_in: { resource: "punch_system", action: "punch_in" },
      punch_out: { resource: "punch_system", action: "punch_out" },
      invite_professional: {
        resource: "professional_invites",
        action: "create",
      },
      view_client_data: { resource: "professional_invites", action: "read" },
    };

    const permission = featurePermissions[feature];
    if (!permission) {
      return { allowed: true }; // Feature not restricted
    }

    return this.checkPermission(
      permission.resource,
      permission.action,
      screen,
      metadata,
    );
  }

  // Get user's available features
  async getAvailableFeatures(screen: string): Promise<string[]> {
    const user = appState.getUser();
    if (!user) return [];

    const allFeatures = [
      "add_employee",
      "invite_employee",
      "manage_attendance",
      "create_cash_transaction",
      "view_cash_ledger",
      "allocate_float",
      "create_payout",
      "report_issue",
      "manage_issues",
      "punch_in",
      "punch_out",
      "invite_professional",
      "view_client_data",
    ];

    const availableFeatures: string[] = [];

    for (const feature of allFeatures) {
      const canAccess = await this.canAccessFeature(feature, screen);
      if (canAccess.allowed) {
        availableFeatures.push(feature);
      }
    }

    return availableFeatures;
  }
}

export const permissionsService = new PermissionsService();
