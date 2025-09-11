import AsyncStorage from "@react-native-async-storage/async-storage";
import { analytics } from "../analytics/AnalyticsService";
import { auditService } from "./AuditService";

export interface CategoryChangeAudit {
  id: string;
  userId: string;
  oldCategory: string;
  newCategory: string;
  timestamp: string;
  actor: string;
  reason?: string;
  blocked: boolean;
}

export interface CategoryChangePolicy {
  canChange: boolean;
  timeRemaining?: number; // milliseconds
  deadline?: Date;
  reason?: string;
}

class CategoryChangeService {
  private readonly AUDIT_KEY = "category_change_audit";
  private readonly CHANGE_DEADLINE_HOURS = 72;

  async canChangeCategory(
    userId: string,
    registeredAt: string,
  ): Promise<CategoryChangePolicy> {
    try {
      const registrationTime = new Date(registeredAt);
      const now = new Date();
      const deadline = new Date(
        registrationTime.getTime() +
          this.CHANGE_DEADLINE_HOURS * 60 * 60 * 1000,
      );

      const timeRemaining = deadline.getTime() - now.getTime();

      if (timeRemaining <= 0) {
        return {
          canChange: false,
          reason: "Category change deadline has expired (72 hours)",
          deadline,
        };
      }

      return {
        canChange: true,
        timeRemaining,
        deadline,
      };
    } catch (error) {
      console.error("Error checking category change policy:", error);
      return {
        canChange: false,
        reason: "Error checking change eligibility",
      };
    }
  }

  async changeCategory(
    userId: string,
    oldCategory: string,
    newCategory: string,
    registeredAt: string,
    reason?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if change is allowed
      const policy = await this.canChangeCategory(userId, registeredAt);
      if (!policy.canChange) {
        // Log blocked attempt to audit service
        await auditService.logCategoryChange(
          oldCategory,
          newCategory,
          false,
          policy.reason,
        );

        // Track blocked attempt
        analytics.track({
          event: "category_change_blocked",
          properties: {
            userId,
            oldCategory,
            newCategory,
            reason: policy.reason,
            timeRemaining: policy.timeRemaining,
          },
          timestamp: new Date(),
        });

        return {
          success: false,
          error: policy.reason,
        };
      }

      // Create audit log entry
      const auditEntry: CategoryChangeAudit = {
        id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        oldCategory,
        newCategory,
        timestamp: new Date().toISOString(),
        actor: userId, // In a real app, this would be the actual actor
        reason,
        blocked: false,
      };

      // Save audit log
      await this.addAuditEntry(auditEntry);

      // Log to comprehensive audit service
      await auditService.logCategoryChange(
        oldCategory,
        newCategory,
        true,
        undefined,
      );

      // Track successful change
      analytics.track({
        event: "category_change_confirmed",
        properties: {
          userId,
          oldCategory,
          newCategory,
          timeRemaining: policy.timeRemaining,
          reason,
        },
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error changing category:", error);
      return {
        success: false,
        error: "Failed to change category",
      };
    }
  }

  async getAuditHistory(userId: string): Promise<CategoryChangeAudit[]> {
    try {
      const stored = await AsyncStorage.getItem(this.AUDIT_KEY);
      if (!stored) return [];

      const allAudits: CategoryChangeAudit[] = JSON.parse(stored);
      return allAudits.filter((audit) => audit.userId === userId);
    } catch (error) {
      console.error("Error getting audit history:", error);
      return [];
    }
  }

  private async addAuditEntry(audit: CategoryChangeAudit): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.AUDIT_KEY);
      const audits: CategoryChangeAudit[] = stored ? JSON.parse(stored) : [];
      audits.push(audit);
      await AsyncStorage.setItem(this.AUDIT_KEY, JSON.stringify(audits));
    } catch (error) {
      console.error("Error saving audit entry:", error);
    }
  }

  formatTimeRemaining(milliseconds: number): string {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }

  async openCategoryChange(
    userId: string,
    registeredAt: string,
  ): Promise<void> {
    analytics.track({
      event: "category_change_opened",
      properties: {
        userId,
        registeredAt,
        timeSinceRegistration: Date.now() - new Date(registeredAt).getTime(),
      },
      timestamp: new Date(),
    });
  }
}

export const categoryChangeService = new CategoryChangeService();
