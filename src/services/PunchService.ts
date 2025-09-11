import AsyncStorage from "@react-native-async-storage/async-storage";
import { analytics } from "../analytics/AnalyticsService";
import { request } from "../net/http";
import { employeeService, Employee } from "./EmployeeService";

export interface PunchRecord {
  id: string;
  employeeId: string;
  organizationId: string;
  type: "in" | "out";
  clientTime: string; // Local device timestamp
  serverTime?: string; // Server timestamp when synced
  status: "pending" | "synced" | "rejected";
  location?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
  createdAt: string;
  syncedAt?: string;
  rejectionReason?: string;
}

export interface ShiftInfo {
  employeeId: string;
  currentShift?: {
    punchInTime: string;
    punchOutTime?: string;
    duration?: number; // in minutes
    isActive: boolean;
  };
  todayPunches: PunchRecord[];
  totalHoursToday: number;
  totalHoursThisWeek: number;
  totalHoursThisMonth: number;
}

export interface SalaryInfo {
  employeeId: string;
  salaryStartAt: string;
  timeSinceStart: number; // in minutes
  currentPayCycle: {
    startDate: string;
    endDate: string;
    totalHours: number;
    totalEarnings: number;
  };
}

class PunchService {
  private readonly PUNCHES_KEY = "punch_records";
  private readonly PENDING_PUNCHES_KEY = "pending_punches";
  private readonly SYNC_INTERVAL = 30000; // 30 seconds

  async punchIn(
    employeeId: string,
    location?: { latitude: number; longitude: number },
    notes?: string,
  ): Promise<{ success: boolean; error?: string; punchId?: string }> {
    try {
      // Check if employee is acknowledged
      const employee = await employeeService.getEmployee(employeeId);
      if (!employee) {
        return { success: false, error: "Employee not found" };
      }

      if (employee.status !== "active") {
        return {
          success: false,
          error: "Employee must be acknowledged before punching in",
        };
      }

      // Check if already punched in
      const currentShift = await this.getCurrentShift(employeeId);
      if (currentShift?.isActive) {
        return {
          success: false,
          error: "Already punched in. Please punch out first.",
        };
      }

      const punchRecord: PunchRecord = {
        id: `punch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        employeeId,
        organizationId: employee.organizationId,
        type: "in",
        clientTime: new Date().toISOString(),
        status: "pending",
        location,
        notes,
        createdAt: new Date().toISOString(),
      };

      // Try to sync immediately if online
      const syncResult = await this.syncPunch(punchRecord);
      if (syncResult.success) {
        punchRecord.status = "synced";
        punchRecord.serverTime = syncResult.serverTime;
        punchRecord.syncedAt = new Date().toISOString();
      } else {
        // Queue for offline sync
        await this.queuePunch(punchRecord);
      }

      // Save punch record
      await this.savePunchRecord(punchRecord);

      // Track punch event
      analytics.track({
        event: "punch_in",
        properties: {
          employeeId,
          organizationId: employee.organizationId,
          punchId: punchRecord.id,
          isOffline: punchRecord.status === "pending",
        },
        timestamp: new Date(),
      });

      return { success: true, punchId: punchRecord.id };
    } catch (error) {
      console.error("Error punching in:", error);
      return { success: false, error: "Failed to punch in" };
    }
  }

  async punchOut(
    employeeId: string,
    location?: { latitude: number; longitude: number },
    notes?: string,
  ): Promise<{ success: boolean; error?: string; punchId?: string }> {
    try {
      // Check if employee is acknowledged
      const employee = await employeeService.getEmployee(employeeId);
      if (!employee) {
        return { success: false, error: "Employee not found" };
      }

      if (employee.status !== "active") {
        return {
          success: false,
          error: "Employee must be acknowledged before punching out",
        };
      }

      // Check if punched in
      const currentShift = await this.getCurrentShift(employeeId);
      if (!currentShift?.isActive) {
        return {
          success: false,
          error: "Not punched in. Please punch in first.",
        };
      }

      const punchRecord: PunchRecord = {
        id: `punch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        employeeId,
        organizationId: employee.organizationId,
        type: "out",
        clientTime: new Date().toISOString(),
        status: "pending",
        location,
        notes,
        createdAt: new Date().toISOString(),
      };

      // Try to sync immediately if online
      const syncResult = await this.syncPunch(punchRecord);
      if (syncResult.success) {
        punchRecord.status = "synced";
        punchRecord.serverTime = syncResult.serverTime;
        punchRecord.syncedAt = new Date().toISOString();
      } else {
        // Queue for offline sync
        await this.queuePunch(punchRecord);
      }

      // Save punch record
      await this.savePunchRecord(punchRecord);

      // Track punch event
      analytics.track({
        event: "punch_out",
        properties: {
          employeeId,
          organizationId: employee.organizationId,
          punchId: punchRecord.id,
          isOffline: punchRecord.status === "pending",
        },
        timestamp: new Date(),
      });

      return { success: true, punchId: punchRecord.id };
    } catch (error) {
      console.error("Error punching out:", error);
      return { success: false, error: "Failed to punch out" };
    }
  }

  async getCurrentShift(employeeId: string): Promise<{
    punchInTime: string;
    punchOutTime?: string;
    duration?: number;
    isActive: boolean;
  } | null> {
    try {
      const todayPunches = await this.getTodayPunches(employeeId);
      const punchIn = todayPunches.find(
        (p) => p.type === "in" && p.status === "synced",
      );
      const punchOut = todayPunches.find(
        (p) => p.type === "out" && p.status === "synced",
      );

      if (!punchIn) return null;

      const isActive = !punchOut;
      const duration = punchOut
        ? Math.floor(
            (new Date(punchOut.clientTime).getTime() -
              new Date(punchIn.clientTime).getTime()) /
              (1000 * 60),
          )
        : Math.floor(
            (new Date().getTime() - new Date(punchIn.clientTime).getTime()) /
              (1000 * 60),
          );

      return {
        punchInTime: punchIn.clientTime,
        punchOutTime: punchOut?.clientTime,
        duration,
        isActive,
      };
    } catch (error) {
      console.error("Error getting current shift:", error);
      return null;
    }
  }

  async getTodayPunches(employeeId: string): Promise<PunchRecord[]> {
    try {
      const allPunches = await this.getPunchRecords(employeeId);
      const today = new Date().toISOString().split("T")[0];

      return allPunches.filter(
        (punch) =>
          punch.clientTime.startsWith(today) && punch.status === "synced",
      );
    } catch (error) {
      console.error("Error getting today punches:", error);
      return [];
    }
  }

  async getShiftInfo(employeeId: string): Promise<ShiftInfo> {
    try {
      const currentShift = await this.getCurrentShift(employeeId);
      const todayPunches = await this.getTodayPunches(employeeId);

      // Calculate total hours
      const totalHoursToday = this.calculateTotalHours(todayPunches);
      const totalHoursThisWeek = await this.calculateWeeklyHours(employeeId);
      const totalHoursThisMonth = await this.calculateMonthlyHours(employeeId);

      return {
        employeeId,
        currentShift,
        todayPunches,
        totalHoursToday,
        totalHoursThisWeek,
        totalHoursThisMonth,
      };
    } catch (error) {
      console.error("Error getting shift info:", error);
      return {
        employeeId,
        todayPunches: [],
        totalHoursToday: 0,
        totalHoursThisWeek: 0,
        totalHoursThisMonth: 0,
      };
    }
  }

  async getSalaryInfo(employeeId: string): Promise<SalaryInfo | null> {
    try {
      const employee = await employeeService.getEmployee(employeeId);
      if (!employee || !employee.acknowledgedAt) {
        return null;
      }

      const salaryStartAt = employee.acknowledgedAt;
      const timeSinceStart = Math.floor(
        (new Date().getTime() - new Date(salaryStartAt).getTime()) /
          (1000 * 60),
      );

      // Calculate current pay cycle (assuming monthly)
      const startDate = new Date(salaryStartAt);
      const currentDate = new Date();
      const payCycleStart = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        1,
      );
      const payCycleEnd = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + 1,
        0,
      );

      const totalHours = await this.calculateMonthlyHours(employeeId);
      const totalEarnings = totalHours * employee.wageBase;

      return {
        employeeId,
        salaryStartAt,
        timeSinceStart,
        currentPayCycle: {
          startDate: payCycleStart.toISOString(),
          endDate: payCycleEnd.toISOString(),
          totalHours,
          totalEarnings,
        },
      };
    } catch (error) {
      console.error("Error getting salary info:", error);
      return null;
    }
  }

  async syncPendingPunches(): Promise<{ synced: number; failed: number }> {
    try {
      const pendingPunches = await this.getPendingPunches();
      let synced = 0;
      let failed = 0;

      for (const punch of pendingPunches) {
        const result = await this.syncPunch(punch);
        if (result.success) {
          punch.status = "synced";
          punch.serverTime = result.serverTime;
          punch.syncedAt = new Date().toISOString();
          await this.savePunchRecord(punch);
          await this.removePendingPunch(punch.id);
          synced++;
        } else {
          failed++;
        }
      }

      // Track sync event
      analytics.track({
        event: "offline_punch_synced",
        properties: {
          syncedCount: synced,
          failedCount: failed,
        },
        timestamp: new Date(),
      });

      return { synced, failed };
    } catch (error) {
      console.error("Error syncing pending punches:", error);
      return { synced: 0, failed: 0 };
    }
  }

  async getPunchRecords(employeeId: string): Promise<PunchRecord[]> {
    try {
      const stored = await AsyncStorage.getItem(this.PUNCHES_KEY);
      if (!stored) return [];

      const punches: PunchRecord[] = JSON.parse(stored);
      return punches.filter((punch) => punch.employeeId === employeeId);
    } catch (error) {
      console.error("Error getting punch records:", error);
      return [];
    }
  }

  async getPendingPunches(): Promise<PunchRecord[]> {
    try {
      const stored = await AsyncStorage.getItem(this.PENDING_PUNCHES_KEY);
      if (!stored) return [];

      return JSON.parse(stored);
    } catch (error) {
      console.error("Error getting pending punches:", error);
      return [];
    }
  }

  private async syncPunch(
    punch: PunchRecord,
  ): Promise<{ success: boolean; serverTime?: string; error?: string }> {
    try {
      const response = await request("/employees/punch", {
        method: "POST",
        body: JSON.stringify({
          employeeId: punch.employeeId,
          type: punch.type,
          clientTime: punch.clientTime,
          location: punch.location,
          notes: punch.notes,
        }),
      });

      return {
        success: true,
        serverTime: response.data.serverTime,
      };
    } catch (error) {
      console.error("Error syncing punch:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
      };
    }
  }

  private async queuePunch(punch: PunchRecord): Promise<void> {
    try {
      const pendingPunches = await this.getPendingPunches();
      pendingPunches.push(punch);
      await AsyncStorage.setItem(
        this.PENDING_PUNCHES_KEY,
        JSON.stringify(pendingPunches),
      );

      // Track offline punch event
      analytics.track({
        event: "offline_punch_queued",
        properties: {
          employeeId: punch.employeeId,
          punchId: punch.id,
          type: punch.type,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error queuing punch:", error);
    }
  }

  private async removePendingPunch(punchId: string): Promise<void> {
    try {
      const pendingPunches = await this.getPendingPunches();
      const filtered = pendingPunches.filter((p) => p.id !== punchId);
      await AsyncStorage.setItem(
        this.PENDING_PUNCHES_KEY,
        JSON.stringify(filtered),
      );
    } catch (error) {
      console.error("Error removing pending punch:", error);
    }
  }

  private async savePunchRecord(punch: PunchRecord): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.PUNCHES_KEY);
      const punches: PunchRecord[] = stored ? JSON.parse(stored) : [];

      const existingIndex = punches.findIndex((p) => p.id === punch.id);
      if (existingIndex >= 0) {
        punches[existingIndex] = punch;
      } else {
        punches.push(punch);
      }

      await AsyncStorage.setItem(this.PUNCHES_KEY, JSON.stringify(punches));
    } catch (error) {
      console.error("Error saving punch record:", error);
    }
  }

  private calculateTotalHours(punches: PunchRecord[]): number {
    let totalMinutes = 0;
    let punchInTime: Date | null = null;

    for (const punch of punches.sort(
      (a, b) =>
        new Date(a.clientTime).getTime() - new Date(b.clientTime).getTime(),
    )) {
      if (punch.type === "in") {
        punchInTime = new Date(punch.clientTime);
      } else if (punch.type === "out" && punchInTime) {
        totalMinutes +=
          (new Date(punch.clientTime).getTime() - punchInTime.getTime()) /
          (1000 * 60);
        punchInTime = null;
      }
    }

    return Math.round((totalMinutes / 60) * 100) / 100; // Round to 2 decimal places
  }

  private async calculateWeeklyHours(employeeId: string): Promise<number> {
    try {
      const allPunches = await this.getPunchRecords(employeeId);
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weeklyPunches = allPunches.filter(
        (p) => new Date(p.clientTime) >= oneWeekAgo && p.status === "synced",
      );
      return this.calculateTotalHours(weeklyPunches);
    } catch (error) {
      console.error("Error calculating weekly hours:", error);
      return 0;
    }
  }

  private async calculateMonthlyHours(employeeId: string): Promise<number> {
    try {
      const allPunches = await this.getPunchRecords(employeeId);
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const monthlyPunches = allPunches.filter(
        (p) => new Date(p.clientTime) >= oneMonthAgo && p.status === "synced",
      );
      return this.calculateTotalHours(monthlyPunches);
    } catch (error) {
      console.error("Error calculating monthly hours:", error);
      return 0;
    }
  }

  startSyncInterval(): void {
    setInterval(async () => {
      await this.syncPendingPunches();
    }, this.SYNC_INTERVAL);
  }
}

export const punchService = new PunchService();
