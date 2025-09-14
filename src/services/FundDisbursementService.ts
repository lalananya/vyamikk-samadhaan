import AsyncStorage from "@react-native-async-storage/async-storage";
import { analytics } from "../analytics/AnalyticsService";
import { request } from "../net/http";
import { appState } from "../state/AppState";
import { cashTransactionService } from "./CashTransactionService";

export interface FloatAllocation {
  id: string;
  organizationId: string;
  partnerId: string;
  partnerName: string;
  supervisorId: string;
  supervisorName: string;
  amount: number;
  purpose: string;
  status: "active" | "returned" | "expired";
  allocatedAt: string;
  returnedAt?: string;
  remainingAmount: number;
}

export interface PayoutRequest {
  id: string;
  organizationId: string;
  supervisorId: string;
  supervisorName: string;
  labourId: string;
  labourName: string;
  labourPhone?: string;
  amount: number;
  purpose: "salary_advance" | "full_salary" | "bonus" | "other";
  referenceNote: string;
  status: "pending" | "confirmed" | "expired" | "cancelled";
  otpCode: string;
  otpExpiresAt: string;
  confirmedAt?: string;
  confirmedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillSubmission {
  id: string;
  organizationId: string;
  supervisorId: string;
  supervisorName: string;
  amount: number;
  purpose: string;
  description: string;
  documentUri?: string;
  documentType?: "image" | "pdf";
  status: "pending" | "approved" | "rejected" | "paid";
  submittedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  paidAt?: string;
  paidBy?: string;
  paymentMethod?: "cash" | "bank_transfer" | "cheque";
  otpCode?: string;
  otpExpiresAt?: string;
  confirmedAt?: string;
  confirmedBy?: string;
}

export interface FloatReturn {
  id: string;
  organizationId: string;
  supervisorId: string;
  supervisorName: string;
  partnerId: string;
  partnerName: string;
  amount: number;
  reason: string;
  status: "pending" | "confirmed" | "expired";
  otpCode: string;
  otpExpiresAt: string;
  confirmedAt?: string;
  confirmedBy?: string;
  createdAt: string;
}

export interface DisbursementStats {
  totalAllocated: number;
  totalUsed: number;
  totalRemaining: number;
  totalReturned: number;
  activeAllocations: number;
  pendingPayouts: number;
  pendingBills: number;
  pendingReturns: number;
}

const PURPOSE_LABELS = {
  salary_advance: "Salary Advance",
  full_salary: "Full Salary",
  bonus: "Bonus",
  other: "Other",
};

const BILL_PURPOSE_LABELS = {
  electricity: "Electricity Bill",
  water: "Water Bill",
  rent: "Rent",
  maintenance: "Maintenance",
  consumables: "Consumables",
  other: "Other",
};

const STATUS_LABELS = {
  active: "Active",
  returned: "Returned",
  expired: "Expired",
  pending: "Pending",
  confirmed: "Confirmed",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
  cancelled: "Cancelled",
};

const OTP_EXPIRY_MINUTES = 15;

class FundDisbursementService {
  private readonly FLOAT_ALLOCATIONS_KEY = "float_allocations";
  private readonly PAYOUT_REQUESTS_KEY = "payout_requests";
  private readonly BILL_SUBMISSIONS_KEY = "bill_submissions";
  private readonly FLOAT_RETURNS_KEY = "float_returns";

  // Float Allocation Methods
  async allocateFloat(data: {
    organizationId: string;
    partnerId: string;
    partnerName: string;
    supervisorId: string;
    supervisorName: string;
    amount: number;
    purpose: string;
  }): Promise<FloatAllocation> {
    try {
      // Call API to allocate float
      const response = await request("/fund-disbursement/allocate-float", {
        method: "POST",
        body: JSON.stringify(data),
      });

      const allocation: FloatAllocation = {
        id: response.data.allocationId,
        organizationId: data.organizationId,
        partnerId: data.partnerId,
        partnerName: data.partnerName,
        supervisorId: data.supervisorId,
        supervisorName: data.supervisorName,
        amount: data.amount,
        purpose: data.purpose,
        status: "active",
        allocatedAt: response.data.allocatedAt,
        remainingAmount: data.amount,
      };

      // Save allocation locally
      await this.saveFloatAllocation(allocation);

      // Track allocation
      analytics.track({
        event: "float_allocated",
        properties: {
          allocationId: allocation.id,
          organizationId: data.organizationId,
          partnerId: data.partnerId,
          supervisorId: data.supervisorId,
          amount: data.amount,
          purpose: data.purpose,
        },
        timestamp: new Date(),
      });

      return allocation;
    } catch (error) {
      console.error("Error allocating float:", error);
      throw new Error("Failed to allocate float");
    }
  }

  async getFloatAllocations(
    organizationId: string,
  ): Promise<FloatAllocation[]> {
    try {
      const stored = await AsyncStorage.getItem(this.FLOAT_ALLOCATIONS_KEY);
      if (!stored) return [];

      const allocations: FloatAllocation[] = JSON.parse(stored);
      return allocations
        .filter((allocation) => allocation.organizationId === organizationId)
        .sort(
          (a, b) =>
            new Date(b.allocatedAt).getTime() -
            new Date(a.allocatedAt).getTime(),
        );
    } catch (error) {
      console.error("Error getting float allocations:", error);
      return [];
    }
  }

  async getSupervisorFloatAllocation(
    organizationId: string,
    supervisorId: string,
  ): Promise<FloatAllocation | null> {
    try {
      const allocations = await this.getFloatAllocations(organizationId);
      return (
        allocations.find(
          (allocation) =>
            allocation.supervisorId === supervisorId &&
            allocation.status === "active",
        ) || null
      );
    } catch (error) {
      console.error("Error getting supervisor float allocation:", error);
      return null;
    }
  }

  // Payout Request Methods
  async createPayoutRequest(data: {
    organizationId: string;
    supervisorId: string;
    supervisorName: string;
    labourId: string;
    labourName: string;
    labourPhone?: string;
    amount: number;
    purpose: "salary_advance" | "full_salary" | "bonus" | "other";
    referenceNote: string;
  }): Promise<{ success: boolean; payout?: PayoutRequest; error?: string }> {
    try {
      // Check if supervisor has sufficient float
      const allocation = await this.getSupervisorFloatAllocation(
        data.organizationId,
        data.supervisorId,
      );
      if (!allocation) {
        return { success: false, error: "No active float allocation found" };
      }

      if (allocation.remainingAmount < data.amount) {
        return {
          success: false,
          error: `Insufficient float. Available: ₹${allocation.remainingAmount}, Requested: ₹${data.amount}`,
        };
      }

      // Generate OTP
      const otpCode = this.generateOTP();
      const otpExpiresAt = new Date(
        Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
      ).toISOString();

      // Call API to create payout request
      const response = await request("/fund-disbursement/payout-request", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          otpCode,
          otpExpiresAt,
        }),
      });

      const payout: PayoutRequest = {
        id: response.data.payoutId,
        organizationId: data.organizationId,
        supervisorId: data.supervisorId,
        supervisorName: data.supervisorName,
        labourId: data.labourId,
        labourName: data.labourName,
        labourPhone: data.labourPhone,
        amount: data.amount,
        purpose: data.purpose,
        referenceNote: data.referenceNote,
        status: "pending",
        otpCode,
        otpExpiresAt,
        createdAt: response.data.createdAt,
        updatedAt: response.data.createdAt,
      };

      // Save payout request locally
      await this.savePayoutRequest(payout);

      // Track payout initiation
      analytics.track({
        event: "payout_initiated",
        properties: {
          payoutId: payout.id,
          organizationId: data.organizationId,
          supervisorId: data.supervisorId,
          labourId: data.labourId,
          amount: data.amount,
          purpose: data.purpose,
        },
        timestamp: new Date(),
      });

      return { success: true, payout };
    } catch (error) {
      console.error("Error creating payout request:", error);
      return { success: false, error: "Failed to create payout request" };
    }
  }

  async confirmPayoutRequest(
    payoutId: string,
    otpCode: string,
    confirmedBy: string,
    confirmedByName: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const payout = await this.getPayoutRequest(payoutId);
      if (!payout) {
        return { success: false, error: "Payout request not found" };
      }

      if (payout.status !== "pending") {
        return { success: false, error: "Payout request is not pending" };
      }

      // Check if OTP is expired
      if (new Date() > new Date(payout.otpExpiresAt)) {
        // Mark as expired
        payout.status = "expired";
        payout.updatedAt = new Date().toISOString();
        await this.savePayoutRequest(payout);

        analytics.track({
          event: "payout_expired",
          properties: {
            payoutId,
            organizationId: payout.organizationId,
            amount: payout.amount,
            purpose: payout.purpose,
          },
          timestamp: new Date(),
        });

        return { success: false, error: "OTP has expired" };
      }

      // Verify OTP
      if (payout.otpCode !== otpCode) {
        return { success: false, error: "Invalid OTP code" };
      }

      // Call API to confirm payout
      const response = await request(
        `/fund-disbursement/payout-request/${payoutId}/confirm`,
        {
          method: "POST",
          body: JSON.stringify({
            otpCode,
            confirmedBy,
            confirmedByName,
          }),
        },
      );

      // Update payout locally
      payout.status = "confirmed";
      payout.confirmedAt = response.data.confirmedAt;
      payout.confirmedBy = confirmedBy;
      payout.updatedAt = response.data.confirmedAt;
      await this.savePayoutRequest(payout);

      // Update float allocation
      await this.updateFloatAllocation(
        payout.organizationId,
        payout.supervisorId,
        payout.amount,
      );

      // Track confirmation
      analytics.track({
        event: "payout_confirmed",
        properties: {
          payoutId,
          organizationId: payout.organizationId,
          confirmedBy,
          amount: payout.amount,
          purpose: payout.purpose,
        },
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error confirming payout request:", error);
      return { success: false, error: "Failed to confirm payout request" };
    }
  }

  async getPayoutRequests(
    organizationId: string,
    supervisorId?: string,
  ): Promise<PayoutRequest[]> {
    try {
      const stored = await AsyncStorage.getItem(this.PAYOUT_REQUESTS_KEY);
      if (!stored) return [];

      const payouts: PayoutRequest[] = JSON.parse(stored);
      let filteredPayouts = payouts.filter(
        (payout) => payout.organizationId === organizationId,
      );

      if (supervisorId) {
        filteredPayouts = filteredPayouts.filter(
          (payout) => payout.supervisorId === supervisorId,
        );
      }

      return filteredPayouts.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } catch (error) {
      console.error("Error getting payout requests:", error);
      return [];
    }
  }

  async getPayoutRequest(payoutId: string): Promise<PayoutRequest | null> {
    try {
      const stored = await AsyncStorage.getItem(this.PAYOUT_REQUESTS_KEY);
      if (!stored) return null;

      const payouts: PayoutRequest[] = JSON.parse(stored);
      return payouts.find((payout) => payout.id === payoutId) || null;
    } catch (error) {
      console.error("Error getting payout request:", error);
      return null;
    }
  }

  // Bill Submission Methods
  async submitBill(data: {
    organizationId: string;
    supervisorId: string;
    supervisorName: string;
    amount: number;
    purpose: string;
    description: string;
    documentUri?: string;
    documentType?: "image" | "pdf";
  }): Promise<BillSubmission> {
    try {
      // Call API to submit bill
      const response = await request("/fund-disbursement/bill-submission", {
        method: "POST",
        body: JSON.stringify(data),
      });

      const bill: BillSubmission = {
        id: response.data.billId,
        organizationId: data.organizationId,
        supervisorId: data.supervisorId,
        supervisorName: data.supervisorName,
        amount: data.amount,
        purpose: data.purpose,
        description: data.description,
        documentUri: data.documentUri,
        documentType: data.documentType,
        status: "pending",
        submittedAt: response.data.submittedAt,
      };

      // Save bill submission locally
      await this.saveBillSubmission(bill);

      // Track bill submission
      analytics.track({
        event: "bill_submitted",
        properties: {
          billId: bill.id,
          organizationId: data.organizationId,
          supervisorId: data.supervisorId,
          amount: data.amount,
          purpose: data.purpose,
          hasDocument: !!data.documentUri,
        },
        timestamp: new Date(),
      });

      return bill;
    } catch (error) {
      console.error("Error submitting bill:", error);
      throw new Error("Failed to submit bill");
    }
  }

  async approveBill(
    billId: string,
    approvedBy: string,
    approvedByName: string,
    paymentMethod?: "cash" | "bank_transfer" | "cheque",
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const bill = await this.getBillSubmission(billId);
      if (!bill) {
        return { success: false, error: "Bill submission not found" };
      }

      if (bill.status !== "pending") {
        return { success: false, error: "Bill submission is not pending" };
      }

      // Call API to approve bill
      const response = await request(
        `/fund-disbursement/bill-submission/${billId}/approve`,
        {
          method: "POST",
          body: JSON.stringify({
            approvedBy,
            approvedByName,
            paymentMethod,
          }),
        },
      );

      // Update bill locally
      bill.status = "approved";
      bill.approvedAt = response.data.approvedAt;
      bill.approvedBy = approvedBy;
      bill.paymentMethod = paymentMethod;
      await this.saveBillSubmission(bill);

      // Track approval
      analytics.track({
        event: "bill_approved",
        properties: {
          billId,
          organizationId: bill.organizationId,
          approvedBy,
          amount: bill.amount,
          purpose: bill.purpose,
          paymentMethod,
        },
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error approving bill:", error);
      return { success: false, error: "Failed to approve bill" };
    }
  }

  async getBillSubmissions(
    organizationId: string,
    supervisorId?: string,
  ): Promise<BillSubmission[]> {
    try {
      const stored = await AsyncStorage.getItem(this.BILL_SUBMISSIONS_KEY);
      if (!stored) return [];

      const bills: BillSubmission[] = JSON.parse(stored);
      let filteredBills = bills.filter(
        (bill) => bill.organizationId === organizationId,
      );

      if (supervisorId) {
        filteredBills = filteredBills.filter(
          (bill) => bill.supervisorId === supervisorId,
        );
      }

      return filteredBills.sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      );
    } catch (error) {
      console.error("Error getting bill submissions:", error);
      return [];
    }
  }

  async getBillSubmission(billId: string): Promise<BillSubmission | null> {
    try {
      const stored = await AsyncStorage.getItem(this.BILL_SUBMISSIONS_KEY);
      if (!stored) return null;

      const bills: BillSubmission[] = JSON.parse(stored);
      return bills.find((bill) => bill.id === billId) || null;
    } catch (error) {
      console.error("Error getting bill submission:", error);
      return null;
    }
  }

  // Float Return Methods
  async returnFloat(data: {
    organizationId: string;
    supervisorId: string;
    supervisorName: string;
    partnerId: string;
    partnerName: string;
    amount: number;
    reason: string;
  }): Promise<FloatReturn> {
    try {
      // Check if supervisor has sufficient remaining float
      const allocation = await this.getSupervisorFloatAllocation(
        data.organizationId,
        data.supervisorId,
      );
      if (!allocation) {
        throw new Error("No active float allocation found");
      }

      if (allocation.remainingAmount < data.amount) {
        throw new Error(
          `Insufficient remaining float. Available: ₹${allocation.remainingAmount}, Requested: ₹${data.amount}`,
        );
      }

      // Generate OTP
      const otpCode = this.generateOTP();
      const otpExpiresAt = new Date(
        Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
      ).toISOString();

      // Call API to return float
      const response = await request("/fund-disbursement/return-float", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          otpCode,
          otpExpiresAt,
        }),
      });

      const floatReturn: FloatReturn = {
        id: response.data.returnId,
        organizationId: data.organizationId,
        supervisorId: data.supervisorId,
        supervisorName: data.supervisorName,
        partnerId: data.partnerId,
        partnerName: data.partnerName,
        amount: data.amount,
        reason: data.reason,
        status: "pending",
        otpCode,
        otpExpiresAt,
        createdAt: response.data.createdAt,
      };

      // Save float return locally
      await this.saveFloatReturn(floatReturn);

      // Track float return
      analytics.track({
        event: "float_returned",
        properties: {
          returnId: floatReturn.id,
          organizationId: data.organizationId,
          supervisorId: data.supervisorId,
          partnerId: data.partnerId,
          amount: data.amount,
          reason: data.reason,
        },
        timestamp: new Date(),
      });

      return floatReturn;
    } catch (error) {
      console.error("Error returning float:", error);
      throw new Error("Failed to return float");
    }
  }

  async confirmFloatReturn(
    returnId: string,
    otpCode: string,
    confirmedBy: string,
    confirmedByName: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const floatReturn = await this.getFloatReturn(returnId);
      if (!floatReturn) {
        return { success: false, error: "Float return not found" };
      }

      if (floatReturn.status !== "pending") {
        return { success: false, error: "Float return is not pending" };
      }

      // Check if OTP is expired
      if (new Date() > new Date(floatReturn.otpExpiresAt)) {
        // Mark as expired
        floatReturn.status = "expired";
        await this.saveFloatReturn(floatReturn);

        return { success: false, error: "OTP has expired" };
      }

      // Verify OTP
      if (floatReturn.otpCode !== otpCode) {
        return { success: false, error: "Invalid OTP code" };
      }

      // Call API to confirm float return
      const response = await request(
        `/fund-disbursement/return-float/${returnId}/confirm`,
        {
          method: "POST",
          body: JSON.stringify({
            otpCode,
            confirmedBy,
            confirmedByName,
          }),
        },
      );

      // Update float return locally
      floatReturn.status = "confirmed";
      floatReturn.confirmedAt = response.data.confirmedAt;
      floatReturn.confirmedBy = confirmedBy;
      await this.saveFloatReturn(floatReturn);

      // Update float allocation
      await this.updateFloatAllocation(
        floatReturn.organizationId,
        floatReturn.supervisorId,
        -floatReturn.amount,
      );

      return { success: true };
    } catch (error) {
      console.error("Error confirming float return:", error);
      return { success: false, error: "Failed to confirm float return" };
    }
  }

  async getFloatReturns(
    organizationId: string,
    supervisorId?: string,
  ): Promise<FloatReturn[]> {
    try {
      const stored = await AsyncStorage.getItem(this.FLOAT_RETURNS_KEY);
      if (!stored) return [];

      const returns: FloatReturn[] = JSON.parse(stored);
      let filteredReturns = returns.filter(
        (ret) => ret.organizationId === organizationId,
      );

      if (supervisorId) {
        filteredReturns = filteredReturns.filter(
          (ret) => ret.supervisorId === supervisorId,
        );
      }

      return filteredReturns.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } catch (error) {
      console.error("Error getting float returns:", error);
      return [];
    }
  }

  async getFloatReturn(returnId: string): Promise<FloatReturn | null> {
    try {
      const stored = await AsyncStorage.getItem(this.FLOAT_RETURNS_KEY);
      if (!stored) return null;

      const returns: FloatReturn[] = JSON.parse(stored);
      return returns.find((ret) => ret.id === returnId) || null;
    } catch (error) {
      console.error("Error getting float return:", error);
      return null;
    }
  }

  // Statistics Methods
  async getDisbursementStats(
    organizationId: string,
    supervisorId?: string,
  ): Promise<DisbursementStats> {
    try {
      const allocations = await this.getFloatAllocations(organizationId);
      const payouts = await this.getPayoutRequests(
        organizationId,
        supervisorId,
      );
      const bills = await this.getBillSubmissions(organizationId, supervisorId);
      const returns = await this.getFloatReturns(organizationId, supervisorId);

      const filteredAllocations = supervisorId
        ? allocations.filter((a) => a.supervisorId === supervisorId)
        : allocations;

      const totalAllocated = filteredAllocations.reduce(
        (sum, a) => sum + a.amount,
        0,
      );
      const totalUsed = filteredAllocations.reduce(
        (sum, a) => sum + (a.amount - a.remainingAmount),
        0,
      );
      const totalRemaining = filteredAllocations.reduce(
        (sum, a) => sum + a.remainingAmount,
        0,
      );
      const totalReturned = returns
        .filter((r) => r.status === "confirmed")
        .reduce((sum, r) => sum + r.amount, 0);

      return {
        totalAllocated,
        totalUsed,
        totalRemaining,
        totalReturned,
        activeAllocations: filteredAllocations.filter(
          (a) => a.status === "active",
        ).length,
        pendingPayouts: payouts.filter((p) => p.status === "pending").length,
        pendingBills: bills.filter((b) => b.status === "pending").length,
        pendingReturns: returns.filter((r) => r.status === "pending").length,
      };
    } catch (error) {
      console.error("Error getting disbursement stats:", error);
      return {
        totalAllocated: 0,
        totalUsed: 0,
        totalRemaining: 0,
        totalReturned: 0,
        activeAllocations: 0,
        pendingPayouts: 0,
        pendingBills: 0,
        pendingReturns: 0,
      };
    }
  }

  // Helper Methods
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async updateFloatAllocation(
    organizationId: string,
    supervisorId: string,
    amount: number,
  ): Promise<void> {
    try {
      const allocation = await this.getSupervisorFloatAllocation(
        organizationId,
        supervisorId,
      );
      if (allocation) {
        allocation.remainingAmount = Math.max(
          0,
          allocation.remainingAmount - amount,
        );
        if (allocation.remainingAmount === 0) {
          allocation.status = "returned";
          allocation.returnedAt = new Date().toISOString();
        }
        await this.saveFloatAllocation(allocation);
      }
    } catch (error) {
      console.error("Error updating float allocation:", error);
    }
  }

  private async saveFloatAllocation(
    allocation: FloatAllocation,
  ): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.FLOAT_ALLOCATIONS_KEY);
      const allocations: FloatAllocation[] = stored ? JSON.parse(stored) : [];

      const existingIndex = allocations.findIndex(
        (a) => a.id === allocation.id,
      );
      if (existingIndex >= 0) {
        allocations[existingIndex] = allocation;
      } else {
        allocations.push(allocation);
      }

      await AsyncStorage.setItem(
        this.FLOAT_ALLOCATIONS_KEY,
        JSON.stringify(allocations),
      );
    } catch (error) {
      console.error("Error saving float allocation:", error);
    }
  }

  private async savePayoutRequest(payout: PayoutRequest): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.PAYOUT_REQUESTS_KEY);
      const payouts: PayoutRequest[] = stored ? JSON.parse(stored) : [];

      const existingIndex = payouts.findIndex((p) => p.id === payout.id);
      if (existingIndex >= 0) {
        payouts[existingIndex] = payout;
      } else {
        payouts.push(payout);
      }

      await AsyncStorage.setItem(
        this.PAYOUT_REQUESTS_KEY,
        JSON.stringify(payouts),
      );
    } catch (error) {
      console.error("Error saving payout request:", error);
    }
  }

  private async saveBillSubmission(bill: BillSubmission): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.BILL_SUBMISSIONS_KEY);
      const bills: BillSubmission[] = stored ? JSON.parse(stored) : [];

      const existingIndex = bills.findIndex((b) => b.id === bill.id);
      if (existingIndex >= 0) {
        bills[existingIndex] = bill;
      } else {
        bills.push(bill);
      }

      await AsyncStorage.setItem(
        this.BILL_SUBMISSIONS_KEY,
        JSON.stringify(bills),
      );
    } catch (error) {
      console.error("Error saving bill submission:", error);
    }
  }

  private async saveFloatReturn(floatReturn: FloatReturn): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.FLOAT_RETURNS_KEY);
      const returns: FloatReturn[] = stored ? JSON.parse(stored) : [];

      const existingIndex = returns.findIndex((r) => r.id === floatReturn.id);
      if (existingIndex >= 0) {
        returns[existingIndex] = floatReturn;
      } else {
        returns.push(floatReturn);
      }

      await AsyncStorage.setItem(
        this.FLOAT_RETURNS_KEY,
        JSON.stringify(returns),
      );
    } catch (error) {
      console.error("Error saving float return:", error);
    }
  }

  // UI Helper Methods
  getPurposeLabel(purpose: string): string {
    return PURPOSE_LABELS[purpose as keyof typeof PURPOSE_LABELS] || purpose;
  }

  getBillPurposeLabel(purpose: string): string {
    return (
      BILL_PURPOSE_LABELS[purpose as keyof typeof BILL_PURPOSE_LABELS] ||
      purpose
    );
  }

  getStatusLabel(status: string): string {
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case "active":
        return "#4CAF50";
      case "pending":
        return "#ff9800";
      case "confirmed":
        return "#4CAF50";
      case "approved":
        return "#4CAF50";
      case "rejected":
        return "#f44336";
      case "paid":
        return "#2196F3";
      case "expired":
        return "#f44336";
      case "cancelled":
        return "#666";
      case "returned":
        return "#9C27B0";
      default:
        return "#999";
    }
  }

  formatAmount(amount: number): string {
    return `₹${amount.toLocaleString("en-IN")}`;
  }

  getOTPDisplay(otpCode: string): string {
    return `**${otpCode.slice(-2)}`;
  }

  isOTPExpired(otpExpiresAt: string): boolean {
    return new Date() > new Date(otpExpiresAt);
  }

  getOTPTimeRemaining(otpExpiresAt: string): {
    minutes: number;
    seconds: number;
    expired: boolean;
  } {
    const now = new Date();
    const expires = new Date(otpExpiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) {
      return { minutes: 0, seconds: 0, expired: true };
    }

    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { minutes, seconds, expired: false };
  }
}

export const fundDisbursementService = new FundDisbursementService();
