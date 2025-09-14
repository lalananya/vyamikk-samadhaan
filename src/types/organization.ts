// Core organization and RBAC types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: "msme" | "enterprise" | "ngo";
  industry?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  settings: OrganizationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationSettings {
  timezone: string;
  currency: string;
  workingDays: number[]; // 0-6 (Sunday-Saturday)
  workingHours: {
    start: string; // "09:00"
    end: string; // "18:00"
  };
  attendance: {
    allowSelfCheckIn: boolean;
    requireLocation: boolean;
    allowOvertime: boolean;
  };
  billing: {
    autoGenerateInvoices: boolean;
    invoicePrefix: string;
    paymentTerms: number; // days
  };
}

export interface Member {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
  status: "active" | "inactive" | "pending" | "suspended";
  joinedAt: Date;
  lastActiveAt?: Date;
  invitedBy?: string;
  permissions: string[];
  metadata: Record<string, any>;
}

export interface Role {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  isSystem: boolean; // Built-in roles vs custom
  permissions: Permission[];
  level: number; // Higher number = more permissions
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  resource: string; // 'employees', 'attendance', 'billing', etc.
  action: string; // 'create', 'read', 'update', 'delete', 'manage'
  scope: "organization" | "department" | "self";
  description?: string;
}

export interface Invite {
  id: string;
  organizationId: string;
  email: string;
  phone?: string;
  roleId: string;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  status: "pending" | "accepted" | "expired" | "revoked";
  acceptedAt?: Date;
  createdAt: Date;
  metadata: Record<string, any>;
}

// Predefined role definitions
export const SYSTEM_ROLES = {
  OWNER: {
    name: "Owner",
    description: "Full access to organization and all features",
    level: 100,
    permissions: ["*"], // All permissions
  },
  MANAGER: {
    name: "Manager",
    description: "Manage employees, shifts, and basic operations",
    level: 80,
    permissions: [
      "employees:manage",
      "attendance:manage",
      "shifts:manage",
      "reports:read",
      "settings:read",
    ],
  },
  ACCOUNTANT: {
    name: "Accountant",
    description: "Handle billing, invoices, and financial operations",
    level: 60,
    permissions: [
      "billing:manage",
      "invoices:manage",
      "payments:manage",
      "reports:read",
      "employees:read",
    ],
  },
  OPERATOR: {
    name: "Operator",
    description: "Basic operations and self-attendance",
    level: 40,
    permissions: ["attendance:self", "profile:manage", "notifications:read"],
  },
} as const;

// Permission scopes
export const PERMISSION_SCOPES = {
  ORGANIZATION: "organization",
  DEPARTMENT: "department",
  SELF: "self",
} as const;

// Resource types
export const RESOURCES = {
  EMPLOYEES: "employees",
  ATTENDANCE: "attendance",
  SHIFTS: "shifts",
  BILLING: "billing",
  INVOICES: "invoices",
  REPORTS: "reports",
  SETTINGS: "settings",
  ORGANIZATION: "organization",
} as const;

// Action types
export const ACTIONS = {
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
  MANAGE: "manage",
} as const;
