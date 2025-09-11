import AsyncStorage from "@react-native-async-storage/async-storage";
import { analytics } from "../analytics/AnalyticsService";
import { request } from "../net/http";

export interface Partner {
  id: string;
  fullName: string;
  mobile: string;
  email?: string;
  shareRatio: string;
  isOperatingPartner: boolean;
  status: "pending" | "accepted" | "declined";
  acknowledgedAt?: string;
  inviteToken?: string;
}

export interface PartnershipRegistration {
  id: string;
  organizationId: string;
  gstin: string;
  tradeName: string;
  principalPlace: {
    city: string;
    state: string;
  };
  panOfFirm?: string;
  partners: Partner[];
  operatingPartnerId: string;
  status: "draft" | "awaiting_acknowledgements" | "activated" | "rejected";
  createdAt: string;
  activatedAt?: string;
  softActivationThreshold: number; // Minimum partners required for activation
}

export interface PartnerAcknowledgement {
  id: string;
  partnershipId: string;
  partnerId: string;
  partnerName: string;
  operatingPartnerName: string;
  status: "pending" | "accepted" | "declined";
  acknowledgedAt?: string;
  declinedReason?: string;
  inviteToken: string;
  expiresAt: string;
}

class PartnershipService {
  private readonly PARTNERSHIP_KEY = "partnership_registrations";
  private readonly ACKNOWLEDGEMENT_KEY = "partner_acknowledgements";

  async createPartnershipRegistration(data: {
    organizationId: string;
    gstin: string;
    tradeName: string;
    principalPlace: { city: string; state: string };
    panOfFirm?: string;
    partners: Omit<
      Partner,
      "id" | "status" | "acknowledgedAt" | "inviteToken"
    >[];
    operatingPartnerId: string;
  }): Promise<PartnershipRegistration> {
    try {
      // Call API to create partnership registration
      const response = await request("/partnership/register", {
        method: "POST",
        body: JSON.stringify({
          organizationId: data.organizationId,
          gstin: data.gstin,
          tradeName: data.tradeName,
          principalPlace: data.principalPlace,
          panOfFirm: data.panOfFirm,
          partners: data.partners,
          operatingPartnerId: data.operatingPartnerId,
        }),
      });

      const partnership: PartnershipRegistration = {
        id: response.data.partnershipId,
        organizationId: response.data.organizationId,
        gstin: data.gstin,
        tradeName: data.tradeName,
        principalPlace: data.principalPlace,
        panOfFirm: data.panOfFirm,
        partners: data.partners.map((partner) => ({
          ...partner,
          id: `partner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: "pending" as const,
          inviteToken: this.generateInviteToken(),
        })),
        operatingPartnerId: data.operatingPartnerId,
        status: "awaiting_acknowledgements",
        createdAt: response.data.createdAt,
        softActivationThreshold: 0, // For now, allow activation with 0 acknowledgements
      };

      // Save partnership registration locally
      await this.savePartnershipRegistration(partnership);

      // Create acknowledgement requests for all partners except operating partner
      const acknowledgements = partnership.partners
        .filter((partner) => partner.id !== partnership.operatingPartnerId)
        .map((partner) =>
          this.createAcknowledgementRequest(partnership, partner),
        );

      // Save acknowledgements
      for (const acknowledgement of acknowledgements) {
        await this.saveAcknowledgement(acknowledgement);
      }

      // Track partnership creation
      analytics.track({
        event: "partnership_registration_created",
        properties: {
          partnershipId: partnership.id,
          organizationId: data.organizationId,
          partnerCount: data.partners.length,
          operatingPartnerId: data.operatingPartnerId,
        },
        timestamp: new Date(),
      });

      return partnership;
    } catch (error) {
      console.error("Error creating partnership registration:", error);
      throw new Error("Failed to create partnership registration");
    }
  }

  async sendPartnerInvites(partnershipId: string): Promise<void> {
    try {
      const partnership = await this.getPartnershipRegistration(partnershipId);
      if (!partnership) {
        throw new Error("Partnership not found");
      }

      const acknowledgements =
        await this.getAcknowledgementsForPartnership(partnershipId);

      // Track invite sending
      analytics.track({
        event: "partner_invites_sent",
        properties: {
          partnershipId,
          inviteCount: acknowledgements.length,
        },
        timestamp: new Date(),
      });

      // In a real app, this would send actual SMS/email invites
      console.log(
        `📧 Sent ${acknowledgements.length} partner invites for partnership ${partnershipId}`,
      );
    } catch (error) {
      console.error("Error sending partner invites:", error);
      throw new Error("Failed to send partner invites");
    }
  }

  async acknowledgePartnership(
    inviteToken: string,
    partnerId: string,
    acknowledged: boolean,
    reason?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const acknowledgement = await this.getAcknowledgementByToken(inviteToken);
      if (!acknowledgement) {
        return { success: false, error: "Invalid invite token" };
      }

      if (acknowledgement.partnerId !== partnerId) {
        return { success: false, error: "Token does not match partner" };
      }

      // Check if already acknowledged
      if (acknowledgement.status !== "pending") {
        return { success: false, error: "Already acknowledged" };
      }

      // Call API to acknowledge partnership
      const response = await request("/partnership/acknowledge", {
        method: "POST",
        body: JSON.stringify({
          partnershipId: acknowledgement.partnershipId,
          partnerId,
          acknowledged,
          reason,
        }),
      });

      // Update acknowledgement locally
      acknowledgement.status = acknowledged ? "accepted" : "declined";
      acknowledgement.acknowledgedAt = response.data.acknowledgedAt;
      if (!acknowledged && reason) {
        acknowledgement.declinedReason = reason;
      }

      await this.saveAcknowledgement(acknowledgement);

      // Update partner status in partnership
      const partnership = await this.getPartnershipRegistration(
        acknowledgement.partnershipId,
      );
      if (partnership) {
        const partner = partnership.partners.find((p) => p.id === partnerId);
        if (partner) {
          partner.status = acknowledged ? "accepted" : "declined";
          partner.acknowledgedAt = acknowledgement.acknowledgedAt;
          await this.savePartnershipRegistration(partnership);
        }
      }

      // Track acknowledgement
      analytics.track({
        event: acknowledged ? "partner_ack_accepted" : "partner_ack_declined",
        properties: {
          partnershipId: acknowledgement.partnershipId,
          partnerId,
          acknowledged,
          reason,
        },
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error acknowledging partnership:", error);
      return { success: false, error: "Failed to acknowledge partnership" };
    }
  }

  async reassignOperatingPartner(
    partnershipId: string,
    newOperatingPartnerId: string,
    currentUserId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const partnership = await this.getPartnershipRegistration(partnershipId);
      if (!partnership) {
        return { success: false, error: "Partnership not found" };
      }

      // Check if current user is authorized to reassign (should be owner or current operating partner)
      const currentOperatingPartner = partnership.partners.find(
        (p) => p.id === partnership.operatingPartnerId,
      );
      if (currentOperatingPartner?.mobile !== currentUserId) {
        return {
          success: false,
          error: "Not authorized to reassign operating partner",
        };
      }

      // Update operating partner
      const oldOperatingPartnerId = partnership.operatingPartnerId;
      partnership.operatingPartnerId = newOperatingPartnerId;

      // Reset all partner statuses to pending
      partnership.partners.forEach((partner) => {
        partner.status = "pending";
        partner.acknowledgedAt = undefined;
        partner.inviteToken = this.generateInviteToken();
      });

      // Create new acknowledgement requests
      const acknowledgements = partnership.partners
        .filter((partner) => partner.id !== newOperatingPartnerId)
        .map((partner) =>
          this.createAcknowledgementRequest(partnership, partner),
        );

      // Save new acknowledgements
      for (const acknowledgement of acknowledgements) {
        await this.saveAcknowledgement(acknowledgement);
      }

      // Save updated partnership
      await this.savePartnershipRegistration(partnership);

      // Track reassignment
      analytics.track({
        event: "operating_partner_reassigned",
        properties: {
          partnershipId,
          oldOperatingPartnerId,
          newOperatingPartnerId,
        },
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error reassigning operating partner:", error);
      return { success: false, error: "Failed to reassign operating partner" };
    }
  }

  async checkActivationStatus(partnershipId: string): Promise<{
    canActivate: boolean;
    acknowledgedCount: number;
    requiredCount: number;
    status: string;
  }> {
    try {
      const partnership = await this.getPartnershipRegistration(partnershipId);
      if (!partnership) {
        throw new Error("Partnership not found");
      }

      const acknowledgedCount = partnership.partners.filter(
        (p) => p.status === "accepted",
      ).length;
      const requiredCount = partnership.softActivationThreshold;

      const canActivate = acknowledgedCount >= requiredCount;

      return {
        canActivate,
        acknowledgedCount,
        requiredCount,
        status: canActivate
          ? "ready_for_activation"
          : "awaiting_acknowledgements",
      };
    } catch (error) {
      console.error("Error checking activation status:", error);
      throw new Error("Failed to check activation status");
    }
  }

  async activatePartnership(
    partnershipId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const partnership = await this.getPartnershipRegistration(partnershipId);
      if (!partnership) {
        return { success: false, error: "Partnership not found" };
      }

      const activationStatus = await this.checkActivationStatus(partnershipId);
      if (!activationStatus.canActivate) {
        return { success: false, error: "Not enough partner acknowledgements" };
      }

      partnership.status = "activated";
      partnership.activatedAt = new Date().toISOString();
      await this.savePartnershipRegistration(partnership);

      // Track activation
      analytics.track({
        event: "org_activated",
        properties: {
          partnershipId,
          organizationId: partnership.organizationId,
          acknowledgedCount: activationStatus.acknowledgedCount,
        },
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error activating partnership:", error);
      return { success: false, error: "Failed to activate partnership" };
    }
  }

  async getPartnershipRegistration(
    partnershipId: string,
  ): Promise<PartnershipRegistration | null> {
    try {
      const stored = await AsyncStorage.getItem(this.PARTNERSHIP_KEY);
      if (!stored) return null;

      const partnerships: PartnershipRegistration[] = JSON.parse(stored);
      return partnerships.find((p) => p.id === partnershipId) || null;
    } catch (error) {
      console.error("Error getting partnership registration:", error);
      return null;
    }
  }

  async getAcknowledgementByToken(
    token: string,
  ): Promise<PartnerAcknowledgement | null> {
    try {
      const stored = await AsyncStorage.getItem(this.ACKNOWLEDGEMENT_KEY);
      if (!stored) return null;

      const acknowledgements: PartnerAcknowledgement[] = JSON.parse(stored);
      return acknowledgements.find((a) => a.inviteToken === token) || null;
    } catch (error) {
      console.error("Error getting acknowledgement by token:", error);
      return null;
    }
  }

  async getAcknowledgementsForPartnership(
    partnershipId: string,
  ): Promise<PartnerAcknowledgement[]> {
    try {
      const stored = await AsyncStorage.getItem(this.ACKNOWLEDGEMENT_KEY);
      if (!stored) return [];

      const acknowledgements: PartnerAcknowledgement[] = JSON.parse(stored);
      return acknowledgements.filter((a) => a.partnershipId === partnershipId);
    } catch (error) {
      console.error("Error getting acknowledgements for partnership:", error);
      return [];
    }
  }

  private async savePartnershipRegistration(
    partnership: PartnershipRegistration,
  ): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.PARTNERSHIP_KEY);
      const partnerships: PartnershipRegistration[] = stored
        ? JSON.parse(stored)
        : [];

      const existingIndex = partnerships.findIndex(
        (p) => p.id === partnership.id,
      );
      if (existingIndex >= 0) {
        partnerships[existingIndex] = partnership;
      } else {
        partnerships.push(partnership);
      }

      await AsyncStorage.setItem(
        this.PARTNERSHIP_KEY,
        JSON.stringify(partnerships),
      );
    } catch (error) {
      console.error("Error saving partnership registration:", error);
    }
  }

  private async saveAcknowledgement(
    acknowledgement: PartnerAcknowledgement,
  ): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.ACKNOWLEDGEMENT_KEY);
      const acknowledgements: PartnerAcknowledgement[] = stored
        ? JSON.parse(stored)
        : [];

      const existingIndex = acknowledgements.findIndex(
        (a) => a.id === acknowledgement.id,
      );
      if (existingIndex >= 0) {
        acknowledgements[existingIndex] = acknowledgement;
      } else {
        acknowledgements.push(acknowledgement);
      }

      await AsyncStorage.setItem(
        this.ACKNOWLEDGEMENT_KEY,
        JSON.stringify(acknowledgements),
      );
    } catch (error) {
      console.error("Error saving acknowledgement:", error);
    }
  }

  private createAcknowledgementRequest(
    partnership: PartnershipRegistration,
    partner: Partner,
  ): PartnerAcknowledgement {
    const operatingPartner = partnership.partners.find(
      (p) => p.id === partnership.operatingPartnerId,
    );

    return {
      id: `ack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      partnershipId: partnership.id,
      partnerId: partner.id,
      partnerName: partner.fullName,
      operatingPartnerName: operatingPartner?.fullName || "Unknown",
      status: "pending",
      inviteToken: partner.inviteToken!,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };
  }

  private generateInviteToken(): string {
    return Math.random().toString(36).substr(2, 15) + Date.now().toString(36);
  }
}

export const partnershipService = new PartnershipService();
