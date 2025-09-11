import { appState } from "../state/AppState";
import { employeeService } from "./EmployeeService";
import { punchService } from "./PunchService";
import { machineIssueService } from "./MachineIssueService";
import { cashTransactionService } from "./CashTransactionService";
import { fundDisbursementService } from "./FundDisbursementService";
import { professionalService } from "./ProfessionalService";
import { partnershipService } from "./PartnershipService";
import { analytics } from "../analytics/AnalyticsService";

export interface DashboardWidget {
  id: string;
  title: string;
  subtitle?: string;
  value: string | number;
  icon: string;
  color: string;
  action: string;
  route: string;
  params?: Record<string, any>;
  emptyState?: {
    title: string;
    subtitle: string;
    action: string;
    route: string;
  };
}

export interface DashboardData {
  widgets: DashboardWidget[];
  quickActions: QuickAction[];
  stats: DashboardStats;
}

export interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  route: string;
  params?: Record<string, any>;
}

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  todayAttendance: number;
  pendingIssues: number;
  totalCashTransactions: number;
  pendingCashConfirmations: number;
  totalFloatAllocated: number;
  remainingFloat: number;
  activeClients: number;
  pendingPartnerAcknowledgements: number;
}

class DashboardService {
  // Get role-aware dashboard data
  async getDashboardData(): Promise<DashboardData> {
    try {
      const user = appState.getUser();
      const currentOrgId = appState.getCurrentOrganizationId();

      if (!user || !currentOrgId) {
        return this.getEmptyDashboard();
      }

      const category = user.category;
      const stats = await this.getDashboardStats(currentOrgId, user.id);

      let widgets: DashboardWidget[] = [];
      let quickActions: QuickAction[] = [];

      switch (category) {
        case "owner":
        case "partner":
        case "director":
          widgets = await this.getOwnerPartnerWidgets(
            currentOrgId,
            user.id,
            stats,
          );
          quickActions = this.getOwnerPartnerQuickActions();
          break;
        case "supervisor":
        case "manager":
          widgets = await this.getSupervisorWidgets(
            currentOrgId,
            user.id,
            stats,
          );
          quickActions = this.getSupervisorQuickActions();
          break;
        case "labour":
        case "operator":
          widgets = await this.getLabourWidgets(currentOrgId, user.id, stats);
          quickActions = this.getLabourQuickActions();
          break;
        case "ca":
        case "lawyer":
        case "advocate":
        case "professional":
          widgets = await this.getProfessionalWidgets(
            currentOrgId,
            user.id,
            stats,
          );
          quickActions = this.getProfessionalQuickActions();
          break;
        default:
          widgets = await this.getDefaultWidgets(currentOrgId, user.id, stats);
          quickActions = this.getDefaultQuickActions();
      }

      // Track dashboard view
      analytics.track({
        event: "dashboard_view",
        properties: {
          userId: user.id,
          category: user.category,
          organizationId: currentOrgId,
          widgetCount: widgets.length,
          quickActionCount: quickActions.length,
        },
        timestamp: new Date(),
      });

      return {
        widgets,
        quickActions,
        stats,
      };
    } catch (error) {
      console.error("Error getting dashboard data:", error);
      return this.getEmptyDashboard();
    }
  }

  // Owner/Partner Widgets
  private async getOwnerPartnerWidgets(
    orgId: string,
    userId: string,
    stats: DashboardStats,
  ): Promise<DashboardWidget[]> {
    const widgets: DashboardWidget[] = [];

    // Today's Attendance
    widgets.push({
      id: "attendance_today",
      title: "Today's Attendance",
      subtitle: `${stats.todayAttendance} of ${stats.activeEmployees} employees`,
      value: stats.todayAttendance,
      icon: "👥",
      color: "#4CAF50",
      action: "View Details",
      route: "/attendance",
      emptyState: {
        title: "No attendance today",
        subtitle: "Employees will appear here once they punch in",
        action: "View Employees",
        route: "/employees",
      },
    });

    // Cash Summary
    widgets.push({
      id: "cash_summary",
      title: "Cash Summary",
      subtitle: `${stats.pendingCashConfirmations} pending confirmations`,
      value: stats.totalCashTransactions,
      icon: "💰",
      color: "#FF9800",
      action: "View Ledger",
      route: "/cash-ledger",
      emptyState: {
        title: "No cash transactions",
        subtitle: "Start by creating your first cash transaction",
        action: "Create Transaction",
        route: "/cash-transactions",
      },
    });

    // Open Issues
    widgets.push({
      id: "open_issues",
      title: "Open Issues",
      subtitle: "Machine and miscellaneous problems",
      value: stats.pendingIssues,
      icon: "🔧",
      color: "#f44336",
      action: "Manage Issues",
      route: "/issue-management",
      emptyState: {
        title: "No open issues",
        subtitle: "All issues have been resolved",
        action: "View All Issues",
        route: "/issue-management",
      },
    });

    // Pending Partner Acknowledgements
    if (stats.pendingPartnerAcknowledgements > 0) {
      widgets.push({
        id: "pending_partner_acks",
        title: "Partner Acknowledgements",
        subtitle: "Awaiting partner confirmations",
        value: stats.pendingPartnerAcknowledgements,
        icon: "🤝",
        color: "#9C27B0",
        action: "View Details",
        route: "/partnership-registration",
        emptyState: {
          title: "No pending acknowledgements",
          subtitle: "All partners have acknowledged",
          action: "View Partnership",
          route: "/partnership-registration",
        },
      });
    }

    // Disbursement Status
    widgets.push({
      id: "disbursement_status",
      title: "Fund Disbursement",
      subtitle: `₹${stats.totalFloatAllocated} allocated, ₹${stats.remainingFloat} remaining`,
      value: stats.totalFloatAllocated,
      icon: "💸",
      color: "#2196F3",
      action: "Manage Disbursements",
      route: "/fund-disbursement",
      emptyState: {
        title: "No disbursements yet",
        subtitle: "Start by allocating float to supervisors",
        action: "Allocate Float",
        route: "/fund-disbursement",
      },
    });

    return widgets;
  }

  // Supervisor Widgets
  private async getSupervisorWidgets(
    orgId: string,
    userId: string,
    stats: DashboardStats,
  ): Promise<DashboardWidget[]> {
    const widgets: DashboardWidget[] = [];

    // Float Remaining
    widgets.push({
      id: "float_remaining",
      title: "Float Remaining",
      subtitle: "Available for payouts",
      value: `₹${stats.remainingFloat}`,
      icon: "💵",
      color: "#4CAF50",
      action: "View Details",
      route: "/supervisor-disbursement",
      emptyState: {
        title: "No float allocated",
        subtitle: "Request float allocation from partner",
        action: "Request Float",
        route: "/supervisor-disbursement",
      },
    });

    // Pending Payouts
    const pendingPayouts = await this.getPendingPayoutsCount(orgId, userId);
    widgets.push({
      id: "pending_payouts",
      title: "Pending Payouts",
      subtitle: "Awaiting labour confirmation",
      value: pendingPayouts,
      icon: "⏳",
      color: "#FF9800",
      action: "View Payouts",
      route: "/supervisor-disbursement",
      emptyState: {
        title: "No pending payouts",
        subtitle: "All payouts have been confirmed",
        action: "Create Payout",
        route: "/supervisor-disbursement",
      },
    });

    // Team Attendance Today
    widgets.push({
      id: "team_attendance",
      title: "Team Attendance",
      subtitle: `${stats.todayAttendance} employees punched in`,
      value: stats.todayAttendance,
      icon: "👥",
      color: "#2196F3",
      action: "View Attendance",
      route: "/attendance",
      emptyState: {
        title: "No attendance today",
        subtitle: "Team members will appear here once they punch in",
        action: "View Team",
        route: "/employees",
      },
    });

    // Open Machine Issues
    widgets.push({
      id: "open_machine_issues",
      title: "Machine Issues",
      subtitle: "Problems reported by team",
      value: stats.pendingIssues,
      icon: "🔧",
      color: "#f44336",
      action: "Manage Issues",
      route: "/issue-management",
      emptyState: {
        title: "No open issues",
        subtitle: "All issues have been resolved",
        action: "View All Issues",
        route: "/issue-management",
      },
    });

    return widgets;
  }

  // Labour Widgets
  private async getLabourWidgets(
    orgId: string,
    userId: string,
    stats: DashboardStats,
  ): Promise<DashboardWidget[]> {
    const widgets: DashboardWidget[] = [];

    // Today's Shift Card
    const todayShift = await this.getTodayShiftInfo(userId);
    widgets.push({
      id: "today_shift",
      title: "Today's Shift",
      subtitle: todayShift.status,
      value: todayShift.hours,
      icon: "⏰",
      color: todayShift.color,
      action: "Punch Card",
      route: "/punch-card",
      params: { employeeId: userId },
      emptyState: {
        title: "No shift today",
        subtitle: "You are not scheduled to work today",
        action: "View Schedule",
        route: "/punch-card",
      },
    });

    // Last Punch
    const lastPunch = await this.getLastPunchInfo(userId);
    widgets.push({
      id: "last_punch",
      title: "Last Punch",
      subtitle: lastPunch.type,
      value: lastPunch.time,
      icon: lastPunch.icon,
      color: lastPunch.color,
      action: "Punch Card",
      route: "/punch-card",
      params: { employeeId: userId },
      emptyState: {
        title: "No punch records",
        subtitle: "Start by punching in for your shift",
        action: "Punch In",
        route: "/punch-card",
      },
    });

    // Outstanding Cash Confirmations
    const pendingConfirmations =
      await this.getPendingCashConfirmationsCount(userId);
    widgets.push({
      id: "cash_confirmations",
      title: "Cash Confirmations",
      subtitle: "Awaiting your confirmation",
      value: pendingConfirmations,
      icon: "💰",
      color: "#FF9800",
      action: "View Confirmations",
      route: "/cash-confirmation",
      emptyState: {
        title: "No pending confirmations",
        subtitle: "All cash transactions have been confirmed",
        action: "View History",
        route: "/cash-ledger",
      },
    });

    // My Issues Status
    const myIssues = await this.getMyIssuesCount(userId);
    widgets.push({
      id: "my_issues",
      title: "My Issues",
      subtitle: "Problems I reported",
      value: myIssues,
      icon: "🔧",
      color: "#f44336",
      action: "View Issues",
      route: "/machine-issues",
      emptyState: {
        title: "No issues reported",
        subtitle: "Report machine problems as they occur",
        action: "Report Issue",
        route: "/machine-issues",
      },
    });

    return widgets;
  }

  // Professional Widgets
  private async getProfessionalWidgets(
    orgId: string,
    userId: string,
    stats: DashboardStats,
  ): Promise<DashboardWidget[]> {
    const widgets: DashboardWidget[] = [];

    // Client List
    widgets.push({
      id: "client_list",
      title: "Client Organizations",
      subtitle: `${stats.activeClients} active clients`,
      value: stats.activeClients,
      icon: "🏢",
      color: "#4CAF50",
      action: "View Clients",
      route: "/professional-dashboard",
      emptyState: {
        title: "No clients yet",
        subtitle: "You will see client organizations here once they invite you",
        action: "View Invites",
        route: "/professional-accept",
      },
    });

    // Quick Access - Invoices
    widgets.push({
      id: "invoices_access",
      title: "Invoices",
      subtitle: "View client invoices",
      value: "📄",
      icon: "📄",
      color: "#2196F3",
      action: "View Invoices",
      route: "/client-workspace",
      params: { tab: "invoices" },
      emptyState: {
        title: "No invoice access",
        subtitle: "Request invoice access from clients",
        action: "Request Access",
        route: "/professional-dashboard",
      },
    });

    // Quick Access - Documents
    widgets.push({
      id: "documents_access",
      title: "Legal Documents",
      subtitle: "Upload and manage documents",
      value: "📁",
      icon: "📁",
      color: "#9C27B0",
      action: "Manage Documents",
      route: "/client-workspace",
      params: { tab: "documents" },
      emptyState: {
        title: "No document access",
        subtitle: "Request document access from clients",
        action: "Request Access",
        route: "/professional-dashboard",
      },
    });

    // Quick Access - GST Returns
    widgets.push({
      id: "gst_access",
      title: "GST Returns",
      subtitle: "File and manage GST returns",
      value: "📊",
      icon: "📊",
      color: "#FF9800",
      action: "Manage GST",
      route: "/client-workspace",
      params: { tab: "gst" },
      emptyState: {
        title: "No GST access",
        subtitle: "Request GST access from clients",
        action: "Request Access",
        route: "/professional-dashboard",
      },
    });

    return widgets;
  }

  // Default Widgets (for unknown categories)
  private async getDefaultWidgets(
    orgId: string,
    userId: string,
    stats: DashboardStats,
  ): Promise<DashboardWidget[]> {
    return [
      {
        id: "welcome",
        title: "Welcome",
        subtitle: "Complete your profile to get started",
        value: "👋",
        icon: "👋",
        color: "#4CAF50",
        action: "Complete Profile",
        route: "/profile",
      },
    ];
  }

  // Quick Actions
  private getOwnerPartnerQuickActions(): QuickAction[] {
    return [
      {
        id: "add_employee",
        title: "Add Employee",
        icon: "👤",
        color: "#4CAF50",
        route: "/employees",
      },
      {
        id: "allocate_float",
        title: "Allocate Float",
        icon: "💵",
        color: "#2196F3",
        route: "/fund-disbursement",
      },
      {
        id: "create_cash_tx",
        title: "Cash Transaction",
        icon: "💰",
        color: "#FF9800",
        route: "/cash-transactions",
      },
      {
        id: "invite_professional",
        title: "Invite Professional",
        icon: "🔗",
        color: "#9C27B0",
        route: "/professional-invites",
      },
    ];
  }

  private getSupervisorQuickActions(): QuickAction[] {
    return [
      {
        id: "create_payout",
        title: "Create Payout",
        icon: "💸",
        color: "#4CAF50",
        route: "/supervisor-disbursement",
      },
      {
        id: "submit_bill",
        title: "Submit Bill",
        icon: "📄",
        color: "#2196F3",
        route: "/supervisor-disbursement",
      },
      {
        id: "view_team",
        title: "View Team",
        icon: "👥",
        color: "#FF9800",
        route: "/employees",
      },
      {
        id: "manage_issues",
        title: "Manage Issues",
        icon: "🔧",
        color: "#f44336",
        route: "/issue-management",
      },
    ];
  }

  private getLabourQuickActions(): QuickAction[] {
    return [
      {
        id: "punch_card",
        title: "Punch Card",
        icon: "⏰",
        color: "#4CAF50",
        route: "/punch-card",
        params: { employeeId: "current" },
      },
      {
        id: "report_issue",
        title: "Report Issue",
        icon: "🔧",
        color: "#f44336",
        route: "/machine-issues",
      },
      {
        id: "view_attendance",
        title: "View Attendance",
        icon: "📊",
        color: "#2196F3",
        route: "/punch-card",
        params: { employeeId: "current" },
      },
      {
        id: "cash_confirmations",
        title: "Cash Confirmations",
        icon: "💰",
        color: "#FF9800",
        route: "/cash-confirmation",
      },
    ];
  }

  private getProfessionalQuickActions(): QuickAction[] {
    return [
      {
        id: "view_clients",
        title: "View Clients",
        icon: "🏢",
        color: "#4CAF50",
        route: "/professional-dashboard",
      },
      {
        id: "client_workspace",
        title: "Client Workspace",
        icon: "💼",
        color: "#2196F3",
        route: "/client-workspace",
      },
      {
        id: "view_invites",
        title: "View Invites",
        icon: "📨",
        color: "#FF9800",
        route: "/professional-accept",
      },
    ];
  }

  private getDefaultQuickActions(): QuickAction[] {
    return [
      {
        id: "complete_profile",
        title: "Complete Profile",
        icon: "👤",
        color: "#4CAF50",
        route: "/profile",
      },
    ];
  }

  // Helper Methods
  private async getDashboardStats(
    orgId: string,
    userId: string,
  ): Promise<DashboardStats> {
    try {
      const employees = await employeeService.getEmployees(orgId);
      const activeEmployees = employees.filter(
        (emp) => emp.status === "active",
      ).length;

      const todayAttendance = await this.getTodayAttendanceCount(orgId);
      const pendingIssues = await this.getPendingIssuesCount(orgId);

      const cashTransactions =
        await cashTransactionService.getTransactions(orgId);
      const pendingCashConfirmations = cashTransactions.filter(
        (tx) => tx.status === "pending",
      ).length;

      const disbursementStats =
        await fundDisbursementService.getDisbursementStats(orgId);

      const professionalClients = await professionalService.getClients(userId);
      const activeClients = professionalClients.filter(
        (client) => client.status === "active",
      ).length;

      const partnershipInvites = await partnershipService.getInvites(orgId);
      const pendingPartnerAcknowledgements = partnershipInvites.filter(
        (invite) => invite.status === "pending",
      ).length;

      return {
        totalEmployees: employees.length,
        activeEmployees,
        todayAttendance,
        pendingIssues,
        totalCashTransactions: cashTransactions.length,
        pendingCashConfirmations,
        totalFloatAllocated: disbursementStats.totalAllocated,
        remainingFloat: disbursementStats.totalRemaining,
        activeClients,
        pendingPartnerAcknowledgements,
      };
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        todayAttendance: 0,
        pendingIssues: 0,
        totalCashTransactions: 0,
        pendingCashConfirmations: 0,
        totalFloatAllocated: 0,
        remainingFloat: 0,
        activeClients: 0,
        pendingPartnerAcknowledgements: 0,
      };
    }
  }

  private async getTodayAttendanceCount(orgId: string): Promise<number> {
    try {
      const today = new Date().toISOString().split("T")[0];
      const employees = await employeeService.getEmployees(orgId);
      let count = 0;

      for (const employee of employees) {
        if (employee.status === "active") {
          const punches = await punchService.getEmployeePunches(employee.id);
          const todayPunches = punches.filter(
            (punch) => punch.punchIn && punch.punchIn.startsWith(today),
          );
          if (todayPunches.length > 0) {
            count++;
          }
        }
      }

      return count;
    } catch (error) {
      console.error("Error getting today attendance count:", error);
      return 0;
    }
  }

  private async getPendingIssuesCount(orgId: string): Promise<number> {
    try {
      const issues = await machineIssueService.getIssues(orgId);
      return issues.filter(
        (issue) => issue.status === "open" || issue.status === "in_progress",
      ).length;
    } catch (error) {
      console.error("Error getting pending issues count:", error);
      return 0;
    }
  }

  private async getPendingPayoutsCount(
    orgId: string,
    supervisorId: string,
  ): Promise<number> {
    try {
      const payouts = await fundDisbursementService.getPayoutRequests(
        orgId,
        supervisorId,
      );
      return payouts.filter((payout) => payout.status === "pending").length;
    } catch (error) {
      console.error("Error getting pending payouts count:", error);
      return 0;
    }
  }

  private async getTodayShiftInfo(
    userId: string,
  ): Promise<{ status: string; hours: string; color: string }> {
    try {
      const punches = await punchService.getEmployeePunches(userId);
      const today = new Date().toISOString().split("T")[0];
      const todayPunches = punches.filter(
        (punch) => punch.punchIn && punch.punchIn.startsWith(today),
      );

      if (todayPunches.length === 0) {
        return {
          status: "Not punched in",
          hours: "0h 0m",
          color: "#f44336",
        };
      }

      const lastPunch = todayPunches[todayPunches.length - 1];
      if (lastPunch.punchOut) {
        return {
          status: "Shift completed",
          hours: lastPunch.totalHours || "0h 0m",
          color: "#4CAF50",
        };
      } else {
        return {
          status: "Currently working",
          hours: lastPunch.currentHours || "0h 0m",
          color: "#FF9800",
        };
      }
    } catch (error) {
      console.error("Error getting today shift info:", error);
      return {
        status: "Unknown",
        hours: "0h 0m",
        color: "#999",
      };
    }
  }

  private async getLastPunchInfo(
    userId: string,
  ): Promise<{ type: string; time: string; icon: string; color: string }> {
    try {
      const punches = await punchService.getEmployeePunches(userId);
      if (punches.length === 0) {
        return {
          type: "No punches",
          time: "Never",
          icon: "⏰",
          color: "#999",
        };
      }

      const lastPunch = punches[punches.length - 1];
      if (lastPunch.punchOut) {
        return {
          type: "Punch Out",
          time: new Date(lastPunch.punchOut).toLocaleTimeString(),
          icon: "⏰",
          color: "#4CAF50",
        };
      } else {
        return {
          type: "Punch In",
          time: new Date(lastPunch.punchIn!).toLocaleTimeString(),
          icon: "⏰",
          color: "#FF9800",
        };
      }
    } catch (error) {
      console.error("Error getting last punch info:", error);
      return {
        type: "Unknown",
        time: "Unknown",
        icon: "⏰",
        color: "#999",
      };
    }
  }

  private async getPendingCashConfirmationsCount(
    userId: string,
  ): Promise<number> {
    try {
      const transactions = await cashTransactionService.getTransactions();
      return transactions.filter(
        (tx) => tx.status === "pending" && tx.recipientId === userId,
      ).length;
    } catch (error) {
      console.error("Error getting pending cash confirmations count:", error);
      return 0;
    }
  }

  private async getMyIssuesCount(userId: string): Promise<number> {
    try {
      const issues = await machineIssueService.getIssues();
      return issues.filter((issue) => issue.reportedBy === userId).length;
    } catch (error) {
      console.error("Error getting my issues count:", error);
      return 0;
    }
  }

  private getEmptyDashboard(): DashboardData {
    return {
      widgets: [],
      quickActions: [],
      stats: {
        totalEmployees: 0,
        activeEmployees: 0,
        todayAttendance: 0,
        pendingIssues: 0,
        totalCashTransactions: 0,
        pendingCashConfirmations: 0,
        totalFloatAllocated: 0,
        remainingFloat: 0,
        activeClients: 0,
        pendingPartnerAcknowledgements: 0,
      },
    };
  }

  // Widget tap tracking
  trackWidgetTap(widgetId: string, action: string) {
    analytics.track({
      event: "widget_tap",
      properties: {
        widgetId,
        action,
        userId: appState.getUser()?.id,
        organizationId: appState.getCurrentOrganizationId(),
      },
      timestamp: new Date(),
    });
  }
}

export const dashboardService = new DashboardService();
