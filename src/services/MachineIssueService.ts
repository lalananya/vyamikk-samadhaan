import AsyncStorage from "@react-native-async-storage/async-storage";
import { analytics } from "../analytics/AnalyticsService";
import { request } from "../net/http";
import { punchService } from "./PunchService";

export interface MachineIssue {
  id: string;
  organizationId: string;
  createdBy: string;
  createdByName: string;
  machineName: string;
  machineId: string;
  problemType: "mechanical" | "electrical" | "safety" | "maintenance" | "other";
  description: string;
  photoUri?: string;
  urgency: "low" | "medium" | "high";
  status: "open" | "in_progress" | "resolved" | "closed";
  assignedTo?: string;
  assignedToName?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  closedAt?: string;
  closedBy?: string;
  notes: string[];
  punchSessionId?: string; // Link to punch session if created within 30 min of punch in
  createdAt: string;
  updatedAt: string;
}

export interface IssueNote {
  id: string;
  issueId: string;
  addedBy: string;
  addedByName: string;
  note: string;
  createdAt: string;
}

export interface IssueFilters {
  status?: string[];
  urgency?: string[];
  problemType?: string[];
  assignedTo?: string;
  createdBy?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface IssueStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  highUrgency: number;
  mediumUrgency: number;
  lowUrgency: number;
}

const PROBLEM_TYPES = {
  mechanical: "Mechanical",
  electrical: "Electrical",
  safety: "Safety",
  maintenance: "Maintenance",
  other: "Other",
};

const URGENCY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const STATUS_LABELS = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

class MachineIssueService {
  private readonly ISSUES_KEY = "machine_issues";
  private readonly ISSUE_NOTES_KEY = "issue_notes";

  async createIssue(data: {
    organizationId: string;
    createdBy: string;
    createdByName: string;
    machineName: string;
    machineId: string;
    problemType:
      | "mechanical"
      | "electrical"
      | "safety"
      | "maintenance"
      | "other";
    description: string;
    photoUri?: string;
    urgency: "low" | "medium" | "high";
  }): Promise<MachineIssue> {
    try {
      // Check if created within 30 minutes of punch in
      const punchSessionId = await this.getRecentPunchSession(data.createdBy);

      // Call API to create issue
      const response = await request("/machine-issues", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          punchSessionId,
        }),
      });

      const issue: MachineIssue = {
        id: response.data.issueId,
        organizationId: data.organizationId,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        machineName: data.machineName,
        machineId: data.machineId,
        problemType: data.problemType,
        description: data.description,
        photoUri: data.photoUri,
        urgency: data.urgency,
        status: "open",
        notes: [],
        punchSessionId,
        createdAt: response.data.createdAt,
        updatedAt: response.data.createdAt,
      };

      // Save issue locally
      await this.saveIssue(issue);

      // Track issue creation
      analytics.track({
        event: "issue_created",
        properties: {
          issueId: issue.id,
          organizationId: data.organizationId,
          problemType: data.problemType,
          urgency: data.urgency,
          hasPhoto: !!data.photoUri,
          linkedToPunch: !!punchSessionId,
        },
        timestamp: new Date(),
      });

      return issue;
    } catch (error) {
      console.error("Error creating issue:", error);
      throw new Error("Failed to create issue");
    }
  }

  async acknowledgeIssue(
    issueId: string,
    acknowledgedBy: string,
    acknowledgedByName: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const issue = await this.getIssue(issueId);
      if (!issue) {
        return { success: false, error: "Issue not found" };
      }

      if (issue.status !== "open") {
        return { success: false, error: "Issue is not in open status" };
      }

      // Call API to acknowledge issue
      const response = await request(`/machine-issues/${issueId}/acknowledge`, {
        method: "POST",
        body: JSON.stringify({
          acknowledgedBy,
          acknowledgedByName,
        }),
      });

      // Update issue locally
      issue.status = "in_progress";
      issue.acknowledgedAt = response.data.acknowledgedAt;
      issue.acknowledgedBy = acknowledgedBy;
      issue.updatedAt = response.data.acknowledgedAt;
      await this.saveIssue(issue);

      // Track acknowledgement
      analytics.track({
        event: "issue_acknowledged",
        properties: {
          issueId,
          organizationId: issue.organizationId,
          acknowledgedBy,
          problemType: issue.problemType,
          urgency: issue.urgency,
        },
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error acknowledging issue:", error);
      return { success: false, error: "Failed to acknowledge issue" };
    }
  }

  async assignIssue(
    issueId: string,
    assignedTo: string,
    assignedToName: string,
    assignedBy: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const issue = await this.getIssue(issueId);
      if (!issue) {
        return { success: false, error: "Issue not found" };
      }

      // Call API to assign issue
      const response = await request(`/machine-issues/${issueId}/assign`, {
        method: "POST",
        body: JSON.stringify({
          assignedTo,
          assignedToName,
          assignedBy,
        }),
      });

      // Update issue locally
      issue.assignedTo = assignedTo;
      issue.assignedToName = assignedToName;
      issue.updatedAt = response.data.updatedAt;
      await this.saveIssue(issue);

      return { success: true };
    } catch (error) {
      console.error("Error assigning issue:", error);
      return { success: false, error: "Failed to assign issue" };
    }
  }

  async updateIssueStatus(
    issueId: string,
    status: "open" | "in_progress" | "resolved" | "closed",
    updatedBy: string,
    updatedByName: string,
    note?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const issue = await this.getIssue(issueId);
      if (!issue) {
        return { success: false, error: "Issue not found" };
      }

      // Call API to update status
      const response = await request(`/machine-issues/${issueId}/status`, {
        method: "POST",
        body: JSON.stringify({
          status,
          updatedBy,
          updatedByName,
          note,
        }),
      });

      // Update issue locally
      issue.status = status;
      issue.updatedAt = response.data.updatedAt;

      // Set specific timestamps based on status
      if (status === "resolved") {
        issue.resolvedAt = response.data.updatedAt;
        issue.resolvedBy = updatedBy;
      } else if (status === "closed") {
        issue.closedAt = response.data.updatedAt;
        issue.closedBy = updatedBy;
      }

      // Add note if provided
      if (note) {
        const issueNote: IssueNote = {
          id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          issueId,
          addedBy: updatedBy,
          addedByName: updatedByName,
          note,
          createdAt: response.data.updatedAt,
        };
        issue.notes.push(issueNote);
        await this.saveIssueNote(issueNote);
      }

      await this.saveIssue(issue);

      // Track status update
      analytics.track({
        event: "issue_status_updated",
        properties: {
          issueId,
          organizationId: issue.organizationId,
          oldStatus: issue.status,
          newStatus: status,
          updatedBy,
          problemType: issue.problemType,
          urgency: issue.urgency,
        },
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error updating issue status:", error);
      return { success: false, error: "Failed to update issue status" };
    }
  }

  async addIssueNote(
    issueId: string,
    note: string,
    addedBy: string,
    addedByName: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const issue = await this.getIssue(issueId);
      if (!issue) {
        return { success: false, error: "Issue not found" };
      }

      // Call API to add note
      const response = await request(`/machine-issues/${issueId}/notes`, {
        method: "POST",
        body: JSON.stringify({
          note,
          addedBy,
          addedByName,
        }),
      });

      // Add note locally
      const issueNote: IssueNote = {
        id: response.data.noteId,
        issueId,
        addedBy,
        addedByName,
        note,
        createdAt: response.data.createdAt,
      };
      issue.notes.push(issueNote);
      issue.updatedAt = response.data.createdAt;
      await this.saveIssue(issue);
      await this.saveIssueNote(issueNote);

      return { success: true };
    } catch (error) {
      console.error("Error adding issue note:", error);
      return { success: false, error: "Failed to add note" };
    }
  }

  async getIssues(
    organizationId: string,
    filters?: IssueFilters,
  ): Promise<MachineIssue[]> {
    try {
      const stored = await AsyncStorage.getItem(this.ISSUES_KEY);
      if (!stored) return [];

      const issues: MachineIssue[] = JSON.parse(stored);
      let filteredIssues = issues.filter(
        (issue) => issue.organizationId === organizationId,
      );

      // Apply filters
      if (filters) {
        if (filters.status && filters.status.length > 0) {
          filteredIssues = filteredIssues.filter((issue) =>
            filters.status!.includes(issue.status),
          );
        }
        if (filters.urgency && filters.urgency.length > 0) {
          filteredIssues = filteredIssues.filter((issue) =>
            filters.urgency!.includes(issue.urgency),
          );
        }
        if (filters.problemType && filters.problemType.length > 0) {
          filteredIssues = filteredIssues.filter((issue) =>
            filters.problemType!.includes(issue.problemType),
          );
        }
        if (filters.assignedTo) {
          filteredIssues = filteredIssues.filter(
            (issue) => issue.assignedTo === filters.assignedTo,
          );
        }
        if (filters.createdBy) {
          filteredIssues = filteredIssues.filter(
            (issue) => issue.createdBy === filters.createdBy,
          );
        }
        if (filters.dateRange) {
          filteredIssues = filteredIssues.filter((issue) => {
            const issueDate = new Date(issue.createdAt);
            const startDate = new Date(filters.dateRange!.start);
            const endDate = new Date(filters.dateRange!.end);
            return issueDate >= startDate && issueDate <= endDate;
          });
        }
      }

      // Sort by creation date (newest first)
      return filteredIssues.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } catch (error) {
      console.error("Error getting issues:", error);
      return [];
    }
  }

  async getIssue(issueId: string): Promise<MachineIssue | null> {
    try {
      const stored = await AsyncStorage.getItem(this.ISSUES_KEY);
      if (!stored) return null;

      const issues: MachineIssue[] = JSON.parse(stored);
      return issues.find((issue) => issue.id === issueId) || null;
    } catch (error) {
      console.error("Error getting issue:", error);
      return null;
    }
  }

  async getIssueStats(organizationId: string): Promise<IssueStats> {
    try {
      const issues = await this.getIssues(organizationId);

      const stats: IssueStats = {
        total: issues.length,
        open: issues.filter((i) => i.status === "open").length,
        in_progress: issues.filter((i) => i.status === "in_progress").length,
        resolved: issues.filter((i) => i.status === "resolved").length,
        closed: issues.filter((i) => i.status === "closed").length,
        highUrgency: issues.filter((i) => i.urgency === "high").length,
        mediumUrgency: issues.filter((i) => i.urgency === "medium").length,
        lowUrgency: issues.filter((i) => i.urgency === "low").length,
      };

      return stats;
    } catch (error) {
      console.error("Error getting issue stats:", error);
      return {
        total: 0,
        open: 0,
        in_progress: 0,
        resolved: 0,
        closed: 0,
        highUrgency: 0,
        mediumUrgency: 0,
        lowUrgency: 0,
      };
    }
  }

  async getMyIssues(
    userId: string,
    organizationId: string,
  ): Promise<MachineIssue[]> {
    try {
      const issues = await this.getIssues(organizationId);
      return issues.filter((issue) => issue.createdBy === userId);
    } catch (error) {
      console.error("Error getting my issues:", error);
      return [];
    }
  }

  private async getRecentPunchSession(userId: string): Promise<string | null> {
    try {
      const shiftInfo = await punchService.getCurrentShift(userId);
      if (!shiftInfo || !shiftInfo.isActive) return null;

      const punchInTime = new Date(shiftInfo.punchInTime);
      const now = new Date();
      const timeDiff = now.getTime() - punchInTime.getTime();
      const minutesDiff = timeDiff / (1000 * 60);

      // Return punch session ID if within 30 minutes
      return minutesDiff <= 30 ? `punch_${shiftInfo.punchInTime}` : null;
    } catch (error) {
      console.error("Error getting recent punch session:", error);
      return null;
    }
  }

  private async saveIssue(issue: MachineIssue): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.ISSUES_KEY);
      const issues: MachineIssue[] = stored ? JSON.parse(stored) : [];

      const existingIndex = issues.findIndex((i) => i.id === issue.id);
      if (existingIndex >= 0) {
        issues[existingIndex] = issue;
      } else {
        issues.push(issue);
      }

      await AsyncStorage.setItem(this.ISSUES_KEY, JSON.stringify(issues));
    } catch (error) {
      console.error("Error saving issue:", error);
    }
  }

  private async saveIssueNote(note: IssueNote): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.ISSUE_NOTES_KEY);
      const notes: IssueNote[] = stored ? JSON.parse(stored) : [];

      const existingIndex = notes.findIndex((n) => n.id === note.id);
      if (existingIndex >= 0) {
        notes[existingIndex] = note;
      } else {
        notes.push(note);
      }

      await AsyncStorage.setItem(this.ISSUE_NOTES_KEY, JSON.stringify(notes));
    } catch (error) {
      console.error("Error saving issue note:", error);
    }
  }

  // Helper methods for UI
  getProblemTypeLabel(type: string): string {
    return PROBLEM_TYPES[type as keyof typeof PROBLEM_TYPES] || type;
  }

  getUrgencyLabel(urgency: string): string {
    return URGENCY_LABELS[urgency as keyof typeof URGENCY_LABELS] || urgency;
  }

  getStatusLabel(status: string): string {
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
  }

  getUrgencyColor(urgency: string): string {
    switch (urgency) {
      case "high":
        return "#ff4444";
      case "medium":
        return "#ff9800";
      case "low":
        return "#4CAF50";
      default:
        return "#999";
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case "open":
        return "#ff4444";
      case "in_progress":
        return "#ff9800";
      case "resolved":
        return "#4CAF50";
      case "closed":
        return "#666";
      default:
        return "#999";
    }
  }
}

export const machineIssueService = new MachineIssueService();
