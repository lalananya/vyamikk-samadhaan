// Analytics events for Organizations & RBAC
export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: Date;
  userId?: string;
  organizationId?: string;
}

export interface OrganizationEvent extends AnalyticsEvent {
  event:
    | "organization_created"
    | "organization_updated"
    | "organization_switched";
  properties: {
    organizationId: string;
    organizationName: string;
    organizationType: "msme" | "enterprise" | "ngo";
    organizationSlug: string;
    industry?: string;
  };
}

export interface MemberEvent extends AnalyticsEvent {
  event:
    | "member_invited"
    | "member_accepted"
    | "member_joined"
    | "member_removed"
    | "member_role_changed";
  properties: {
    organizationId: string;
    memberId: string;
    roleId: string;
    roleName: string;
    invitedBy?: string;
    memberEmail?: string;
    memberPhone?: string;
  };
}

export interface InviteEvent extends AnalyticsEvent {
  event:
    | "invite_sent"
    | "invite_accepted"
    | "invite_expired"
    | "invite_revoked";
  properties: {
    organizationId: string;
    inviteId: string;
    inviteToken: string;
    invitedEmail: string;
    invitedPhone?: string;
    roleId: string;
    roleName: string;
    expiresAt: string;
    invitedBy: string;
  };
}

export interface RoleEvent extends AnalyticsEvent {
  event:
    | "role_created"
    | "role_updated"
    | "role_deleted"
    | "permission_granted"
    | "permission_revoked";
  properties: {
    organizationId: string;
    roleId: string;
    roleName: string;
    roleLevel: number;
    isSystem: boolean;
    permissions: string[];
    createdBy?: string;
  };
}

export interface PermissionEvent extends AnalyticsEvent {
  event: "permission_checked" | "access_denied" | "access_granted";
  properties: {
    organizationId: string;
    resource: string;
    action: string;
    permission: string;
    userId: string;
    userRole: string;
    success: boolean;
    reason?: string;
  };
}

// Event type union
export type RBACEvent =
  | OrganizationEvent
  | MemberEvent
  | InviteEvent
  | RoleEvent
  | PermissionEvent;

// Event constants
export const RBAC_EVENTS = {
  // Organization events
  ORGANIZATION_CREATED: "organization_created",
  ORGANIZATION_UPDATED: "organization_updated",
  ORGANIZATION_SWITCHED: "organization_switched",

  // Member events
  MEMBER_INVITED: "member_invited",
  MEMBER_ACCEPTED: "member_accepted",
  MEMBER_JOINED: "member_joined",
  MEMBER_REMOVED: "member_removed",
  MEMBER_ROLE_CHANGED: "member_role_changed",

  // Invite events
  INVITE_SENT: "invite_sent",
  INVITE_ACCEPTED: "invite_accepted",
  INVITE_EXPIRED: "invite_expired",
  INVITE_REVOKED: "invite_revoked",

  // Role events
  ROLE_CREATED: "role_created",
  ROLE_UPDATED: "role_updated",
  ROLE_DELETED: "role_deleted",
  PERMISSION_GRANTED: "permission_granted",
  PERMISSION_REVOKED: "permission_revoked",

  // Permission events
  PERMISSION_CHECKED: "permission_checked",
  ACCESS_DENIED: "access_denied",
  ACCESS_GRANTED: "access_granted",
} as const;

// Event properties helpers
export const createOrganizationEvent = (
  event: OrganizationEvent["event"],
  properties: OrganizationEvent["properties"],
  userId?: string,
  organizationId?: string,
): OrganizationEvent => ({
  event,
  properties,
  timestamp: new Date(),
  userId,
  organizationId,
});

export const createMemberEvent = (
  event: MemberEvent["event"],
  properties: MemberEvent["properties"],
  userId?: string,
  organizationId?: string,
): MemberEvent => ({
  event,
  properties,
  timestamp: new Date(),
  userId,
  organizationId,
});

export const createInviteEvent = (
  event: InviteEvent["event"],
  properties: InviteEvent["properties"],
  userId?: string,
  organizationId?: string,
): InviteEvent => ({
  event,
  properties,
  timestamp: new Date(),
  userId,
  organizationId,
});

export const createRoleEvent = (
  event: RoleEvent["event"],
  properties: RoleEvent["properties"],
  userId?: string,
  organizationId?: string,
): RoleEvent => ({
  event,
  properties,
  timestamp: new Date(),
  userId,
  organizationId,
});

export const createPermissionEvent = (
  event: PermissionEvent["event"],
  properties: PermissionEvent["properties"],
  userId?: string,
  organizationId?: string,
): PermissionEvent => ({
  event,
  properties,
  timestamp: new Date(),
  userId,
  organizationId,
});
