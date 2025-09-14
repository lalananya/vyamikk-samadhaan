import AsyncStorage from "@react-native-async-storage/async-storage";
import { analytics } from "../analytics/AnalyticsService";
import { request } from "../net/http";

export interface Employee {
  id: string;
  organizationId: string;
  name: string;
  mobile?: string;
  code: string;
  category: "labour" | "supervisor" | "accountant";
  wageBase: number; // ₹/hr
  otPolicy: "none" | "1.5x" | "2x";
  incentives?: string;
  doj: string; // Date of Joining
  status: "pending" | "active" | "inactive";
  acknowledgedAt?: string;
  salaryStartAt?: string; // When salary counting starts
  assignedStartAt?: string; // Preset start time if any
  inviteToken?: string;
  createdAt: string;
  createdBy: string;
}

export interface EmployeeInvite {
  id: string;
  employeeId: string;
  organizationId: string;
  employeeName: string;
  mobile: string;
  inviteToken: string;
  status: "pending" | "accepted" | "expired";
  sentAt: string;
  expiresAt: string;
  acknowledgedAt?: string;
}

export interface BulkEmployeeData {
  name: string;
  mobile?: string;
  code: string;
  category: "labour" | "supervisor" | "accountant";
  wageBase: number;
  otPolicy: "none" | "1.5x" | "2x";
  incentives?: string;
  doj: string;
}

class EmployeeService {
  private readonly EMPLOYEES_KEY = "employees";
  private readonly INVITES_KEY = "employee_invites";

  async addEmployee(data: {
    organizationId: string;
    name: string;
    mobile?: string;
    code: string;
    category: "labour" | "supervisor" | "accountant";
    wageBase: number;
    otPolicy: "none" | "1.5x" | "2x";
    incentives?: string;
    doj: string;
    createdBy: string;
  }): Promise<Employee> {
    try {
      // Validate category
      if (
        ["ca", "lawyer", "advocate", "professional"].includes(data.category)
      ) {
        throw new Error(
          "CA/Lawyer/Advocate/Professional employees cannot be added via Employees module. Use Services for external professionals.",
        );
      }

      // Call API to create employee
      const response = await request("/employees", {
        method: "POST",
        body: JSON.stringify(data),
      });

      const employee: Employee = {
        id: response.data.employeeId,
        organizationId: data.organizationId,
        name: data.name,
        mobile: data.mobile,
        code: data.code,
        category: data.category,
        wageBase: data.wageBase,
        otPolicy: data.otPolicy,
        incentives: data.incentives,
        doj: data.doj,
        status: "pending",
        inviteToken: this.generateInviteToken(),
        createdAt: response.data.createdAt,
        createdBy: data.createdBy,
      };

      // Save employee locally
      await this.saveEmployee(employee);

      // Send acknowledgement invite if mobile provided
      if (data.mobile) {
        await this.sendEmployeeInvite(employee);
      }

      // Track employee creation
      analytics.track({
        event: "employee_added",
        properties: {
          employeeId: employee.id,
          organizationId: data.organizationId,
          category: data.category,
          hasMobile: !!data.mobile,
        },
        timestamp: new Date(),
      });

      return employee;
    } catch (error) {
      console.error("Error adding employee:", error);
      throw new Error("Failed to add employee");
    }
  }

  async bulkAddEmployees(
    organizationId: string,
    employees: BulkEmployeeData[],
    createdBy: string,
  ): Promise<{
    success: Employee[];
    failed: { data: BulkEmployeeData; error: string }[];
  }> {
    try {
      const success: Employee[] = [];
      const failed: { data: BulkEmployeeData; error: string }[] = [];

      for (const empData of employees) {
        try {
          const employee = await this.addEmployee({
            organizationId,
            createdBy,
            ...empData,
          });
          success.push(employee);
        } catch (error) {
          failed.push({
            data: empData,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Track bulk add
      analytics.track({
        event: "employees_bulk_added",
        properties: {
          organizationId,
          totalCount: employees.length,
          successCount: success.length,
          failedCount: failed.length,
        },
        timestamp: new Date(),
      });

      return { success, failed };
    } catch (error) {
      console.error("Error bulk adding employees:", error);
      throw new Error("Failed to bulk add employees");
    }
  }

  async sendEmployeeInvite(employee: Employee): Promise<void> {
    try {
      if (!employee.mobile) {
        throw new Error("Employee mobile number required for invite");
      }

      const invite: EmployeeInvite = {
        id: `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        employeeId: employee.id,
        organizationId: employee.organizationId,
        employeeName: employee.name,
        mobile: employee.mobile,
        inviteToken: employee.inviteToken!,
        status: "pending",
        sentAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      };

      // Save invite
      await this.saveInvite(invite);

      // Track invite sent
      analytics.track({
        event: "employee_invite_sent",
        properties: {
          employeeId: employee.id,
          organizationId: employee.organizationId,
          employeeName: employee.name,
          mobile: employee.mobile,
        },
        timestamp: new Date(),
      });

      // In a real app, this would send actual SMS
      console.log(
        `📱 Employee invite sent to ${employee.mobile} for ${employee.name}`,
      );
    } catch (error) {
      console.error("Error sending employee invite:", error);
      throw new Error("Failed to send employee invite");
    }
  }

  async acknowledgeEmployee(
    inviteToken: string,
    employeeId: string,
    acknowledged: boolean,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const invite = await this.getInviteByToken(inviteToken);
      if (!invite) {
        return { success: false, error: "Invalid invite token" };
      }

      if (invite.employeeId !== employeeId) {
        return { success: false, error: "Token does not match employee" };
      }

      if (invite.status !== "pending") {
        return { success: false, error: "Invite already processed" };
      }

      // Call API to acknowledge employee
      const response = await request("/employees/acknowledge", {
        method: "POST",
        body: JSON.stringify({
          employeeId,
          acknowledged,
          inviteToken,
        }),
      });

      // Update invite status
      invite.status = acknowledged ? "accepted" : "expired";
      invite.acknowledgedAt = response.data.acknowledgedAt;
      await this.saveInvite(invite);

      // Update employee status
      const employee = await this.getEmployee(employeeId);
      if (employee) {
        employee.status = acknowledged ? "active" : "inactive";
        employee.acknowledgedAt = invite.acknowledgedAt;

        // Set salary start time when acknowledged
        if (acknowledged) {
          const acknowledgedTime = new Date(invite.acknowledgedAt);
          const assignedTime = employee.assignedStartAt
            ? new Date(employee.assignedStartAt)
            : null;
          employee.salaryStartAt =
            assignedTime && assignedTime > acknowledgedTime
              ? employee.assignedStartAt
              : invite.acknowledgedAt;
        }

        await this.saveEmployee(employee);
      }

      // Track acknowledgement
      analytics.track({
        event: acknowledged ? "employee_ack_accepted" : "employee_ack_declined",
        properties: {
          employeeId,
          organizationId: invite.organizationId,
          employeeName: invite.employeeName,
        },
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error acknowledging employee:", error);
      return { success: false, error: "Failed to acknowledge employee" };
    }
  }

  async getEmployees(organizationId: string): Promise<Employee[]> {
    try {
      const stored = await AsyncStorage.getItem(this.EMPLOYEES_KEY);
      if (!stored) return [];

      const employees: Employee[] = JSON.parse(stored);
      return employees.filter((emp) => emp.organizationId === organizationId);
    } catch (error) {
      console.error("Error getting employees:", error);
      return [];
    }
  }

  async getEmployee(employeeId: string): Promise<Employee | null> {
    try {
      const stored = await AsyncStorage.getItem(this.EMPLOYEES_KEY);
      if (!stored) return null;

      const employees: Employee[] = JSON.parse(stored);
      return employees.find((emp) => emp.id === employeeId) || null;
    } catch (error) {
      console.error("Error getting employee:", error);
      return null;
    }
  }

  async getInviteByToken(token: string): Promise<EmployeeInvite | null> {
    try {
      const stored = await AsyncStorage.getItem(this.INVITES_KEY);
      if (!stored) return null;

      const invites: EmployeeInvite[] = JSON.parse(stored);
      return invites.find((inv) => inv.inviteToken === token) || null;
    } catch (error) {
      console.error("Error getting invite by token:", error);
      return null;
    }
  }

  async getPendingEmployees(organizationId: string): Promise<Employee[]> {
    try {
      const employees = await this.getEmployees(organizationId);
      return employees.filter((emp) => emp.status === "pending");
    } catch (error) {
      console.error("Error getting pending employees:", error);
      return [];
    }
  }

  async getActiveEmployees(organizationId: string): Promise<Employee[]> {
    try {
      const employees = await this.getEmployees(organizationId);
      return employees.filter((emp) => emp.status === "active");
    } catch (error) {
      console.error("Error getting active employees:", error);
      return [];
    }
  }

  async resendInvite(
    employeeId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const employee = await this.getEmployee(employeeId);
      if (!employee) {
        return { success: false, error: "Employee not found" };
      }

      if (!employee.mobile) {
        return { success: false, error: "Employee mobile number required" };
      }

      // Generate new invite token
      employee.inviteToken = this.generateInviteToken();
      await this.saveEmployee(employee);

      // Send new invite
      await this.sendEmployeeInvite(employee);

      return { success: true };
    } catch (error) {
      console.error("Error resending invite:", error);
      return { success: false, error: "Failed to resend invite" };
    }
  }

  generateCSVTemplate(): string {
    return (
      "Name,Mobile,Code,Category,Wage Base,OT Policy,Incentives,DOJ\n" +
      "John Doe,+919876543210,EMP001,labour,200,1.5x,Performance bonus,2024-01-15\n" +
      "Jane Smith,+919876543211,EMP002,supervisor,300,2x,Team lead bonus,2024-01-15"
    );
  }

  parseCSVData(csvText: string): BulkEmployeeData[] {
    try {
      const lines = csvText.trim().split("\n");
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

      const employees: BulkEmployeeData[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        if (values.length !== headers.length) continue;

        const employee: BulkEmployeeData = {
          name: values[0] || "",
          mobile: values[1] || undefined,
          code: values[2] || "",
          category:
            (values[3] as "labour" | "supervisor" | "accountant") || "labour",
          wageBase: parseFloat(values[4]) || 0,
          otPolicy: (values[5] as "none" | "1.5x" | "2x") || "none",
          incentives: values[6] || undefined,
          doj: values[7] || new Date().toISOString().split("T")[0],
        };

        // Validate required fields
        if (employee.name && employee.code) {
          employees.push(employee);
        }
      }

      return employees;
    } catch (error) {
      console.error("Error parsing CSV data:", error);
      throw new Error("Invalid CSV format");
    }
  }

  private async saveEmployee(employee: Employee): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.EMPLOYEES_KEY);
      const employees: Employee[] = stored ? JSON.parse(stored) : [];

      const existingIndex = employees.findIndex(
        (emp) => emp.id === employee.id,
      );
      if (existingIndex >= 0) {
        employees[existingIndex] = employee;
      } else {
        employees.push(employee);
      }

      await AsyncStorage.setItem(this.EMPLOYEES_KEY, JSON.stringify(employees));
    } catch (error) {
      console.error("Error saving employee:", error);
    }
  }

  private async saveInvite(invite: EmployeeInvite): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.INVITES_KEY);
      const invites: EmployeeInvite[] = stored ? JSON.parse(stored) : [];

      const existingIndex = invites.findIndex((inv) => inv.id === invite.id);
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

  private generateInviteToken(): string {
    return Math.random().toString(36).substr(2, 15) + Date.now().toString(36);
  }
}

export const employeeService = new EmployeeService();
