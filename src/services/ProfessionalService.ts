import AsyncStorage from "@react-native-async-storage/async-storage";
import { analytics } from "../analytics/AnalyticsService";
import { request } from "../net/http";
import { appState } from "../state/AppState";

export interface ProfessionalInvite {
  id: string;
  organizationId: string;
  organizationName: string;
  professionalId: string;
  professionalName: string;
  professionalPhone: string;
  professionalEmail?: string;
  scopes: ProfessionalScope[];
  status: "pending" | "accepted" | "declined" | "revoked";
  invitedAt: string;
  acceptedAt?: string;
  declinedAt?: string;
  revokedAt?: string;
  invitedBy: string;
  invitedByName: string;
  inviteToken: string;
}

export interface ProfessionalScope {
  id: string;
  name: string;
  description: string;
  category: "financial" | "legal" | "compliance" | "general";
  permissions: string[];
}

export interface ProfessionalLink {
  id: string;
  organizationId: string;
  organizationName: string;
  professionalId: string;
  professionalName: string;
  professionalPhone: string;
  professionalEmail?: string;
  scopes: ProfessionalScope[];
  status: "active" | "revoked";
  linkedAt: string;
  revokedAt?: string;
  revokedBy?: string;
  revokedByName?: string;
  lastAccessedAt?: string;
}

export interface ProfessionalClient {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationType: string;
  scopes: ProfessionalScope[];
  linkedAt: string;
  lastAccessedAt?: string;
  status: "active" | "revoked";
}

export interface ProfessionalStats {
  totalInvites: number;
  activeLinks: number;
  pendingInvites: number;
  revokedLinks: number;
  totalScopes: number;
}

const SCOPE_CATEGORIES = {
  financial: "Financial",
  legal: "Legal",
  compliance: "Compliance",
  general: "General",
};

const SCOPE_LABELS = {
  view_invoices: "View Invoices",
  upload_legal_docs: "Upload Legal Documents",
  file_gst_returns: "File GST Returns",
  view_financial_reports: "View Financial Reports",
  upload_compliance_docs: "Upload Compliance Documents",
  view_employee_data: "View Employee Data",
  view_attendance: "View Attendance Records",
  view_cash_transactions: "View Cash Transactions",
  view_fund_disbursements: "View Fund Disbursements",
};

const STATUS_LABELS = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  revoked: "Revoked",
  active: "Active",
};

class ProfessionalService {
  private readonly INVITES_KEY = "professional_invites";
  private readonly LINKS_KEY = "professional_links";
  private readonly CLIENTS_KEY = "professional_clients";

  // Professional Invite Methods
  async inviteProfessional(data: {
    organizationId: string;
    organizationName: string;
    professionalId: string;
    professionalName: string;
    professionalPhone: string;
    professionalEmail?: string;
    scopes: string[];
    invitedBy: string;
    invitedByName: string;
  }): Promise<ProfessionalInvite> {
    try {
      // Generate invite token
      const inviteToken = this.generateInviteToken();

      // Call API to invite professional
      const response = await request("/professional/invite", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          inviteToken,
        }),
      });

      const invite: ProfessionalInvite = {
        id: response.data.inviteId,
        organizationId: data.organizationId,
        organizationName: data.organizationName,
        professionalId: data.professionalId,
        professionalName: data.professionalName,
        professionalPhone: data.professionalPhone,
        professionalEmail: data.professionalEmail,
        scopes: this.getScopesByIds(data.scopes),
        status: "pending",
        invitedAt: response.data.invitedAt,
        invitedBy: data.invitedBy,
        invitedByName: data.invitedByName,
        inviteToken,
      };

      // Save invite locally
      await this.saveInvite(invite);

      // Track invite
      analytics.track({
        event: "pro_invite_sent",
        properties: {
          inviteId: invite.id,
          organizationId: data.organizationId,
          professionalId: data.professionalId,
          professionalPhone: data.professionalPhone,
          scopeCount: data.scopes.length,
        },
        timestamp: new Date(),
      });

      return invite;
    } catch (error) {
      console.error("Error inviting professional:", error);
      throw new Error("Failed to invite professional");
    }
  }

  async acceptInvite(
    inviteToken: string,
    professionalId: string,
    professionalName: string,
    professionalPhone: string,
    professionalEmail?: string,
  ): Promise<{ success: boolean; link?: ProfessionalLink; error?: string }> {
    try {
      const invite = await this.getInviteByToken(inviteToken);
      if (!invite) {
        return { success: false, error: "Invalid invite token" };
      }

      if (invite.status !== "pending") {
        return { success: false, error: "Invite is not pending" };
      }

      // Call API to accept invite
      const response = await request("/professional/accept", {
        method: "POST",
        body: JSON.stringify({
          inviteToken,
          professionalId,
          professionalName,
          professionalPhone,
          professionalEmail,
        }),
      });

      // Create professional link
      const link: ProfessionalLink = {
        id: response.data.linkId,
        organizationId: invite.organizationId,
        organizationName: invite.organizationName,
        professionalId,
        professionalName,
        professionalPhone,
        professionalEmail,
        scopes: invite.scopes,
        status: "active",
        linkedAt: response.data.linkedAt,
        lastAccessedAt: response.data.linkedAt,
      };

      // Create professional client
      const client: ProfessionalClient = {
        id: link.id,
        organizationId: invite.organizationId,
        organizationName: invite.organizationName,
        organizationType: "business", // This should be dynamic
        scopes: invite.scopes,
        linkedAt: response.data.linkedAt,
        lastAccessedAt: response.data.linkedAt,
        status: "active",
      };

      // Update invite status
      invite.status = "accepted";
      invite.acceptedAt = response.data.linkedAt;
      invite.professionalId = professionalId;
      invite.professionalName = professionalName;
      invite.professionalPhone = professionalPhone;
      invite.professionalEmail = professionalEmail;

      // Save data locally
      await this.saveInvite(invite);
      await this.saveLink(link);
      await this.saveClient(client);

      // Track acceptance
      analytics.track({
        event: "pro_link_accepted",
        properties: {
          linkId: link.id,
          organizationId: invite.organizationId,
          professionalId,
          scopeCount: invite.scopes.length,
        },
        timestamp: new Date(),
      });

      return { success: true, link };
    } catch (error) {
      console.error("Error accepting invite:", error);
      return { success: false, error: "Failed to accept invite" };
    }
  }

  async declineInvite(
    inviteToken: string,
    reason?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const invite = await this.getInviteByToken(inviteToken);
      if (!invite) {
        return { success: false, error: "Invalid invite token" };
      }

      if (invite.status !== "pending") {
        return { success: false, error: "Invite is not pending" };
      }

      // Call API to decline invite
      await request("/professional/decline", {
        method: "POST",
        body: JSON.stringify({
          inviteToken,
          reason,
        }),
      });

      // Update invite status
      invite.status = "declined";
      invite.declinedAt = new Date().toISOString();

      // Save invite locally
      await this.saveInvite(invite);

      return { success: true };
    } catch (error) {
      console.error("Error declining invite:", error);
      return { success: false, error: "Failed to decline invite" };
    }
  }

  async revokeLink(
    linkId: string,
    revokedBy: string,
    revokedByName: string,
    reason?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const link = await this.getLink(linkId);
      if (!link) {
        return { success: false, error: "Link not found" };
      }

      if (link.status !== "active") {
        return { success: false, error: "Link is not active" };
      }

      // Call API to revoke link
      await request("/professional/revoke", {
        method: "POST",
        body: JSON.stringify({
          linkId,
          revokedBy,
          revokedByName,
          reason,
        }),
      });

      // Update link status
      link.status = "revoked";
      link.revokedAt = new Date().toISOString();
      link.revokedBy = revokedBy;
      link.revokedByName = revokedByName;

      // Update client status
      const client = await this.getClient(linkId);
      if (client) {
        client.status = "revoked";
        client.revokedAt = link.revokedAt;
        await this.saveClient(client);
      }

      // Save link locally
      await this.saveLink(link);

      // Track revocation
      analytics.track({
        event: "pro_link_revoked",
        properties: {
          linkId,
          organizationId: link.organizationId,
          professionalId: link.professionalId,
          revokedBy,
          reason,
        },
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error revoking link:", error);
      return { success: false, error: "Failed to revoke link" };
    }
  }

  // Data Retrieval Methods
  async getInvites(organizationId: string): Promise<ProfessionalInvite[]> {
    try {
      const stored = await AsyncStorage.getItem(this.INVITES_KEY);
      if (!stored) return [];

      const invites: ProfessionalInvite[] = JSON.parse(stored);
      return invites
        .filter((invite) => invite.organizationId === organizationId)
        .sort(
          (a, b) =>
            new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime(),
        );
    } catch (error) {
      console.error("Error getting invites:", error);
      return [];
    }
  }

  async getInviteByToken(
    inviteToken: string,
  ): Promise<ProfessionalInvite | null> {
    try {
      const stored = await AsyncStorage.getItem(this.INVITES_KEY);
      if (!stored) return null;

      const invites: ProfessionalInvite[] = JSON.parse(stored);
      return (
        invites.find((invite) => invite.inviteToken === inviteToken) || null
      );
    } catch (error) {
      console.error("Error getting invite by token:", error);
      return null;
    }
  }

  async getLinks(organizationId: string): Promise<ProfessionalLink[]> {
    try {
      const stored = await AsyncStorage.getItem(this.LINKS_KEY);
      if (!stored) return [];

      const links: ProfessionalLink[] = JSON.parse(stored);
      return links
        .filter((link) => link.organizationId === organizationId)
        .sort(
          (a, b) =>
            new Date(b.linkedAt).getTime() - new Date(a.linkedAt).getTime(),
        );
    } catch (error) {
      console.error("Error getting links:", error);
      return [];
    }
  }

  async getLink(linkId: string): Promise<ProfessionalLink | null> {
    try {
      const stored = await AsyncStorage.getItem(this.LINKS_KEY);
      if (!stored) return null;

      const links: ProfessionalLink[] = JSON.parse(stored);
      return links.find((link) => link.id === linkId) || null;
    } catch (error) {
      console.error("Error getting link:", error);
      return null;
    }
  }

  async getClients(professionalId: string): Promise<ProfessionalClient[]> {
    try {
      const stored = await AsyncStorage.getItem(this.CLIENTS_KEY);
      if (!stored) return [];

      const clients: ProfessionalClient[] = JSON.parse(stored);
      return clients
        .filter((client) => client.status === "active")
        .sort(
          (a, b) =>
            new Date(b.lastAccessedAt || b.linkedAt).getTime() -
            new Date(a.lastAccessedAt || a.linkedAt).getTime(),
        );
    } catch (error) {
      console.error("Error getting clients:", error);
      return [];
    }
  }

  async getClient(linkId: string): Promise<ProfessionalClient | null> {
    try {
      const stored = await AsyncStorage.getItem(this.CLIENTS_KEY);
      if (!stored) return null;

      const clients: ProfessionalClient[] = JSON.parse(stored);
      return clients.find((client) => client.id === linkId) || null;
    } catch (error) {
      console.error("Error getting client:", error);
      return null;
    }
  }

  async getStats(organizationId: string): Promise<ProfessionalStats> {
    try {
      const invites = await this.getInvites(organizationId);
      const links = await this.getLinks(organizationId);

      return {
        totalInvites: invites.length,
        activeLinks: links.filter((link) => link.status === "active").length,
        pendingInvites: invites.filter((invite) => invite.status === "pending")
          .length,
        revokedLinks: links.filter((link) => link.status === "revoked").length,
        totalScopes: this.getAllScopes().length,
      };
    } catch (error) {
      console.error("Error getting stats:", error);
      return {
        totalInvites: 0,
        activeLinks: 0,
        pendingInvites: 0,
        revokedLinks: 0,
        totalScopes: 0,
      };
    }
  }

  // Scope Management
  getAllScopes(): ProfessionalScope[] {
    return [
      {
        id: "view_invoices",
        name: "View Invoices",
        description: "View and download invoices",
        category: "financial",
        permissions: ["read"],
      },
      {
        id: "upload_legal_docs",
        name: "Upload Legal Documents",
        description: "Upload legal documents and contracts",
        category: "legal",
        permissions: ["create", "read", "update"],
      },
      {
        id: "file_gst_returns",
        name: "File GST Returns",
        description: "File GST returns and compliance",
        category: "compliance",
        permissions: ["read"],
      },
      {
        id: "view_financial_reports",
        name: "View Financial Reports",
        description: "View financial reports and statements",
        category: "financial",
        permissions: ["read"],
      },
      {
        id: "upload_compliance_docs",
        name: "Upload Compliance Documents",
        description: "Upload compliance and regulatory documents",
        category: "compliance",
        permissions: ["create", "read", "update"],
      },
      {
        id: "view_employee_data",
        name: "View Employee Data",
        description: "View employee information and records",
        category: "general",
        permissions: ["read"],
      },
      {
        id: "view_attendance",
        name: "View Attendance Records",
        description: "View attendance and punch records",
        category: "general",
        permissions: ["read"],
      },
      {
        id: "view_cash_transactions",
        name: "View Cash Transactions",
        description: "View cash transaction history",
        category: "financial",
        permissions: ["read"],
      },
      {
        id: "view_fund_disbursements",
        name: "View Fund Disbursements",
        description: "View fund disbursement records",
        category: "financial",
        permissions: ["read"],
      },
    ];
  }

  getScopesByIds(scopeIds: string[]): ProfessionalScope[] {
    const allScopes = this.getAllScopes();
    return allScopes.filter((scope) => scopeIds.includes(scope.id));
  }

  getScopesByCategory(category: string): ProfessionalScope[] {
    return this.getAllScopes().filter((scope) => scope.category === category);
  }

  // Helper Methods
  private generateInviteToken(): string {
    return `pro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveInvite(invite: ProfessionalInvite): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.INVITES_KEY);
      const invites: ProfessionalInvite[] = stored ? JSON.parse(stored) : [];

      const existingIndex = invites.findIndex((i) => i.id === invite.id);
      if (existingIndex >= 0) {
        invites[existingIndex] = invite;
      } else {
        invites.push(invite);
      }

      await AsyncStorage.setItem(this.INVITES_KEY, JSON.stringify(invites));
    } catch (error) {
      console.error("Error saving invite:", error);
    }
  }

  private async saveLink(link: ProfessionalLink): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.LINKS_KEY);
      const links: ProfessionalLink[] = stored ? JSON.parse(stored) : [];

      const existingIndex = links.findIndex((l) => l.id === link.id);
      if (existingIndex >= 0) {
        links[existingIndex] = link;
      } else {
        links.push(link);
      }

      await AsyncStorage.setItem(this.LINKS_KEY, JSON.stringify(links));
    } catch (error) {
      console.error("Error saving link:", error);
    }
  }

  private async saveClient(client: ProfessionalClient): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.CLIENTS_KEY);
      const clients: ProfessionalClient[] = stored ? JSON.parse(stored) : [];

      const existingIndex = clients.findIndex((c) => c.id === client.id);
      if (existingIndex >= 0) {
        clients[existingIndex] = client;
      } else {
        clients.push(client);
      }

      await AsyncStorage.setItem(this.CLIENTS_KEY, JSON.stringify(clients));
    } catch (error) {
      console.error("Error saving client:", error);
    }
  }

  // UI Helper Methods
  getScopeLabel(scopeId: string): string {
    return SCOPE_LABELS[scopeId as keyof typeof SCOPE_LABELS] || scopeId;
  }

  getCategoryLabel(category: string): string {
    return (
      SCOPE_CATEGORIES[category as keyof typeof SCOPE_CATEGORIES] || category
    );
  }

  getStatusLabel(status: string): string {
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case "pending":
        return "#ff9800";
      case "accepted":
        return "#4CAF50";
      case "declined":
        return "#f44336";
      case "revoked":
        return "#666";
      case "active":
        return "#4CAF50";
      default:
        return "#999";
    }
  }

  getCategoryColor(category: string): string {
    switch (category) {
      case "financial":
        return "#4CAF50";
      case "legal":
        return "#2196F3";
      case "compliance":
        return "#FF9800";
      case "general":
        return "#9C27B0";
      default:
        return "#999";
    }
  }

  formatPhone(phone: string): string {
    // Format phone number for display
    if (phone.length === 10) {
      return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
    }
    return phone;
  }

  formatEmail(email: string): string {
    return email.toLowerCase();
  }

  hasScope(client: ProfessionalClient, scopeId: string): boolean {
    return client.scopes.some((scope) => scope.id === scopeId);
  }

  getClientMenus(client: ProfessionalClient): string[] {
    const menus = [];

    if (
      this.hasScope(client, "view_invoices") ||
      this.hasScope(client, "view_financial_reports")
    ) {
      menus.push("Financial Reports");
    }

    if (this.hasScope(client, "upload_legal_docs")) {
      menus.push("Legal Documents");
    }

    if (this.hasScope(client, "file_gst_returns")) {
      menus.push("GST Returns");
    }

    if (this.hasScope(client, "upload_compliance_docs")) {
      menus.push("Compliance");
    }

    if (this.hasScope(client, "view_employee_data")) {
      menus.push("Employee Data");
    }

    if (this.hasScope(client, "view_attendance")) {
      menus.push("Attendance");
    }

    if (this.hasScope(client, "view_cash_transactions")) {
      menus.push("Cash Transactions");
    }

    if (this.hasScope(client, "view_fund_disbursements")) {
      menus.push("Fund Disbursements");
    }

    return menus;
  }
}

export const professionalService = new ProfessionalService();
