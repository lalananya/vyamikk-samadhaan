import AsyncStorage from "@react-native-async-storage/async-storage";
import { analytics } from "../analytics/AnalyticsService";
import { request } from "../net/http";
import { appState } from "../state/AppState";
import { auditService } from "./AuditService";

export interface CashTransaction {
  id: string;
  organizationId: string;
  initiatorId: string;
  initiatorName: string;
  recipientId: string;
  recipientName: string;
  recipientPhone?: string;
  amount: number;
  purpose: "advance" | "salary" | "expense" | "other";
  referenceNote: string;
  status: "pending" | "completed" | "expired" | "overridden";
  otpCode: string;
  otpExpiresAt: string;
  confirmedAt?: string;
  confirmedBy?: string;
  overriddenAt?: string;
  overriddenBy?: string;
  overrideReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashTransactionFilters {
  status?: string[];
  purpose?: string[];
  initiatorId?: string;
  recipientId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  amountRange?: {
    min: number;
    max: number;
  };
}

export interface CashLedgerEntry {
  personId: string;
  personName: string;
  personPhone?: string;
  totalReceived: number;
  totalPaid: number;
  netBalance: number;
  transactionCount: number;
  lastTransactionAt: string;
}

export interface CashTransactionStats {
  totalTransactions: number;
  totalAmount: number;
  pendingAmount: number;
  completedAmount: number;
  expiredAmount: number;
  overriddenAmount: number;
  pendingCount: number;
  completedCount: number;
  expiredCount: number;
  overriddenCount: number;
}

const PURPOSE_LABELS = {
  advance: "Advance",
  salary: "Salary",
  expense: "Expense",
  other: "Other",
};

const STATUS_LABELS = {
  pending: "Pending",
  completed: "Completed",
  expired: "Expired",
  overridden: "Overridden",
};

const OTP_EXPIRY_MINUTES = 15;

class CashTransactionService {
  private readonly TRANSACTIONS_KEY = "cash_transactions";
  private readonly LEDGER_KEY = "cash_ledger";

  async initiateTransaction(data: {
    organizationId: string;
    initiatorId: string;
    initiatorName: string;
    recipientId: string;
    recipientName: string;
    recipientPhone?: string;
    amount: number;
    purpose: "advance" | "salary" | "expense" | "other";
    referenceNote: string;
  }): Promise<CashTransaction> {
    try {
      // Generate OTP
      const otpCode = this.generateOTP();
      const otpExpiresAt = new Date(
        Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
      ).toISOString();

      // Call API to initiate transaction
      const response = await request("/cash-transactions", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          otpCode,
          otpExpiresAt,
        }),
      });

      const transaction: CashTransaction = {
        id: response.data.transactionId,
        organizationId: data.organizationId,
        initiatorId: data.initiatorId,
        initiatorName: data.initiatorName,
        recipientId: data.recipientId,
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        amount: data.amount,
        purpose: data.purpose,
        referenceNote: data.referenceNote,
        status: "pending",
        otpCode,
        otpExpiresAt,
        createdAt: response.data.createdAt,
        updatedAt: response.data.createdAt,
      };

      // Save transaction locally
      await this.saveTransaction(transaction);

      // Track transaction initiation
      analytics.track({
        event: "cash_tx_initiated",
        properties: {
          transactionId: transaction.id,
          organizationId: data.organizationId,
          initiatorId: data.initiatorId,
          recipientId: data.recipientId,
          amount: data.amount,
          purpose: data.purpose,
          hasRecipientPhone: !!data.recipientPhone,
        },
        timestamp: new Date(),
      });

      // Log to audit service
      await auditService.logCashTransaction(
        transaction.id,
        "initiated",
        transaction.amount,
        transaction.recipientId,
        true,
      );

      return transaction;
    } catch (error) {
      console.error("Error initiating transaction:", error);
      throw new Error("Failed to initiate cash transaction");
    }
  }

  async confirmTransaction(
    transactionId: string,
    otpCode: string,
    confirmedBy: string,
    confirmedByName: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const transaction = await this.getTransaction(transactionId);
      if (!transaction) {
        return { success: false, error: "Transaction not found" };
      }

      if (transaction.status !== "pending") {
        return { success: false, error: "Transaction is not pending" };
      }

      // Check if OTP is expired
      if (new Date() > new Date(transaction.otpExpiresAt)) {
        // Mark as expired
        transaction.status = "expired";
        transaction.updatedAt = new Date().toISOString();
        await this.saveTransaction(transaction);

        analytics.track({
          event: "cash_tx_expired",
          properties: {
            transactionId,
            organizationId: transaction.organizationId,
            amount: transaction.amount,
            purpose: transaction.purpose,
          },
          timestamp: new Date(),
        });

        // Log to audit service
        await auditService.logCashTransaction(
          transaction.id,
          "expired",
          transaction.amount,
          transaction.recipientId,
          false,
          "OTP has expired",
        );

        return { success: false, error: "OTP has expired" };
      }

      // Verify OTP
      if (transaction.otpCode !== otpCode) {
        return { success: false, error: "Invalid OTP code" };
      }

      // Call API to confirm transaction
      const response = await request(
        `/cash-transactions/${transactionId}/confirm`,
        {
          method: "POST",
          body: JSON.stringify({
            otpCode,
            confirmedBy,
            confirmedByName,
          }),
        },
      );

      // Update transaction locally
      transaction.status = "completed";
      transaction.confirmedAt = response.data.confirmedAt;
      transaction.confirmedBy = confirmedBy;
      transaction.updatedAt = response.data.confirmedAt;
      await this.saveTransaction(transaction);

      // Update ledger
      await this.updateLedger(transaction);

      // Track confirmation
      analytics.track({
        event: "cash_tx_confirmed",
        properties: {
          transactionId,
          organizationId: transaction.organizationId,
          confirmedBy,
          amount: transaction.amount,
          purpose: transaction.purpose,
        },
        timestamp: new Date(),
      });

      // Log to audit service
      await auditService.logCashTransaction(
        transaction.id,
        "confirmed",
        transaction.amount,
        transaction.recipientId,
        true,
      );

      return { success: true };
    } catch (error) {
      console.error("Error confirming transaction:", error);
      return { success: false, error: "Failed to confirm transaction" };
    }
  }

  async overrideTransaction(
    transactionId: string,
    overriddenBy: string,
    overriddenByName: string,
    reason: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const transaction = await this.getTransaction(transactionId);
      if (!transaction) {
        return { success: false, error: "Transaction not found" };
      }

      if (
        transaction.status !== "pending" &&
        transaction.status !== "expired"
      ) {
        return { success: false, error: "Transaction cannot be overridden" };
      }

      // Call API to override transaction
      const response = await request(
        `/cash-transactions/${transactionId}/override`,
        {
          method: "POST",
          body: JSON.stringify({
            overriddenBy,
            overriddenByName,
            reason,
          }),
        },
      );

      // Update transaction locally
      transaction.status = "overridden";
      transaction.overriddenAt = response.data.overriddenAt;
      transaction.overriddenBy = overriddenBy;
      transaction.overrideReason = reason;
      transaction.updatedAt = response.data.overriddenAt;
      await this.saveTransaction(transaction);

      // Update ledger
      await this.updateLedger(transaction);

      // Track override
      analytics.track({
        event: "cash_tx_overridden",
        properties: {
          transactionId,
          organizationId: transaction.organizationId,
          overriddenBy,
          amount: transaction.amount,
          purpose: transaction.purpose,
          reason,
        },
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error overriding transaction:", error);
      return { success: false, error: "Failed to override transaction" };
    }
  }

  async getTransactions(
    organizationId: string,
    filters?: CashTransactionFilters,
  ): Promise<CashTransaction[]> {
    try {
      const stored = await AsyncStorage.getItem(this.TRANSACTIONS_KEY);
      if (!stored) return [];

      const transactions: CashTransaction[] = JSON.parse(stored);
      let filteredTransactions = transactions.filter(
        (tx) => tx.organizationId === organizationId,
      );

      // Apply filters
      if (filters) {
        if (filters.status && filters.status.length > 0) {
          filteredTransactions = filteredTransactions.filter((tx) =>
            filters.status!.includes(tx.status),
          );
        }
        if (filters.purpose && filters.purpose.length > 0) {
          filteredTransactions = filteredTransactions.filter((tx) =>
            filters.purpose!.includes(tx.purpose),
          );
        }
        if (filters.initiatorId) {
          filteredTransactions = filteredTransactions.filter(
            (tx) => tx.initiatorId === filters.initiatorId,
          );
        }
        if (filters.recipientId) {
          filteredTransactions = filteredTransactions.filter(
            (tx) => tx.recipientId === filters.recipientId,
          );
        }
        if (filters.dateRange) {
          filteredTransactions = filteredTransactions.filter((tx) => {
            const txDate = new Date(tx.createdAt);
            const startDate = new Date(filters.dateRange!.start);
            const endDate = new Date(filters.dateRange!.end);
            return txDate >= startDate && txDate <= endDate;
          });
        }
        if (filters.amountRange) {
          filteredTransactions = filteredTransactions.filter((tx) => {
            return (
              tx.amount >= filters.amountRange!.min &&
              tx.amount <= filters.amountRange!.max
            );
          });
        }
      }

      // Sort by creation date (newest first)
      return filteredTransactions.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } catch (error) {
      console.error("Error getting transactions:", error);
      return [];
    }
  }

  async getTransaction(transactionId: string): Promise<CashTransaction | null> {
    try {
      const stored = await AsyncStorage.getItem(this.TRANSACTIONS_KEY);
      if (!stored) return null;

      const transactions: CashTransaction[] = JSON.parse(stored);
      return transactions.find((tx) => tx.id === transactionId) || null;
    } catch (error) {
      console.error("Error getting transaction:", error);
      return null;
    }
  }

  async getPendingTransactions(
    organizationId: string,
  ): Promise<CashTransaction[]> {
    try {
      const transactions = await this.getTransactions(organizationId);
      return transactions.filter((tx) => tx.status === "pending");
    } catch (error) {
      console.error("Error getting pending transactions:", error);
      return [];
    }
  }

  async getExpiredTransactions(
    organizationId: string,
  ): Promise<CashTransaction[]> {
    try {
      const transactions = await this.getTransactions(organizationId);
      return transactions.filter((tx) => tx.status === "expired");
    } catch (error) {
      console.error("Error getting expired transactions:", error);
      return [];
    }
  }

  async getTransactionStats(
    organizationId: string,
  ): Promise<CashTransactionStats> {
    try {
      const transactions = await this.getTransactions(organizationId);

      const stats: CashTransactionStats = {
        totalTransactions: transactions.length,
        totalAmount: transactions.reduce((sum, tx) => sum + tx.amount, 0),
        pendingAmount: transactions
          .filter((tx) => tx.status === "pending")
          .reduce((sum, tx) => sum + tx.amount, 0),
        completedAmount: transactions
          .filter((tx) => tx.status === "completed")
          .reduce((sum, tx) => sum + tx.amount, 0),
        expiredAmount: transactions
          .filter((tx) => tx.status === "expired")
          .reduce((sum, tx) => sum + tx.amount, 0),
        overriddenAmount: transactions
          .filter((tx) => tx.status === "overridden")
          .reduce((sum, tx) => sum + tx.amount, 0),
        pendingCount: transactions.filter((tx) => tx.status === "pending")
          .length,
        completedCount: transactions.filter((tx) => tx.status === "completed")
          .length,
        expiredCount: transactions.filter((tx) => tx.status === "expired")
          .length,
        overriddenCount: transactions.filter((tx) => tx.status === "overridden")
          .length,
      };

      return stats;
    } catch (error) {
      console.error("Error getting transaction stats:", error);
      return {
        totalTransactions: 0,
        totalAmount: 0,
        pendingAmount: 0,
        completedAmount: 0,
        expiredAmount: 0,
        overriddenAmount: 0,
        pendingCount: 0,
        completedCount: 0,
        expiredCount: 0,
        overriddenCount: 0,
      };
    }
  }

  async getCashLedger(
    organizationId: string,
    dateRange?: { start: string; end: string },
  ): Promise<CashLedgerEntry[]> {
    try {
      const transactions = await this.getTransactions(organizationId, {
        dateRange,
      });

      // Group by person
      const personMap = new Map<string, CashLedgerEntry>();

      transactions.forEach((tx) => {
        const personId = tx.recipientId;
        const personName = tx.recipientName;
        const personPhone = tx.recipientPhone;

        if (!personMap.has(personId)) {
          personMap.set(personId, {
            personId,
            personName,
            personPhone,
            totalReceived: 0,
            totalPaid: 0,
            netBalance: 0,
            transactionCount: 0,
            lastTransactionAt: tx.createdAt,
          });
        }

        const entry = personMap.get(personId)!;
        entry.transactionCount++;
        entry.lastTransactionAt =
          tx.createdAt > entry.lastTransactionAt
            ? tx.createdAt
            : entry.lastTransactionAt;

        if (tx.status === "completed" || tx.status === "overridden") {
          entry.totalReceived += tx.amount;
        }
      });

      // Calculate net balance
      personMap.forEach((entry) => {
        entry.netBalance = entry.totalReceived - entry.totalPaid;
      });

      return Array.from(personMap.values()).sort((a, b) =>
        b.lastTransactionAt.localeCompare(a.lastTransactionAt),
      );
    } catch (error) {
      console.error("Error getting cash ledger:", error);
      return [];
    }
  }

  async duplicateTransaction(
    originalTransactionId: string,
  ): Promise<CashTransaction | null> {
    try {
      const original = await this.getTransaction(originalTransactionId);
      if (!original || original.status !== "expired") {
        return null;
      }

      const user = appState.getUser();
      if (!user) return null;

      const duplicatedTransaction = await this.initiateTransaction({
        organizationId: original.organizationId,
        initiatorId: user.id,
        initiatorName: user.phone, // Using phone as name for now
        recipientId: original.recipientId,
        recipientName: original.recipientName,
        recipientPhone: original.recipientPhone,
        amount: original.amount,
        purpose: original.purpose,
        referenceNote: `Duplicated from ${original.id} - ${original.referenceNote}`,
      });

      return duplicatedTransaction;
    } catch (error) {
      console.error("Error duplicating transaction:", error);
      return null;
    }
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async saveTransaction(transaction: CashTransaction): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.TRANSACTIONS_KEY);
      const transactions: CashTransaction[] = stored ? JSON.parse(stored) : [];

      const existingIndex = transactions.findIndex(
        (tx) => tx.id === transaction.id,
      );
      if (existingIndex >= 0) {
        transactions[existingIndex] = transaction;
      } else {
        transactions.push(transaction);
      }

      await AsyncStorage.setItem(
        this.TRANSACTIONS_KEY,
        JSON.stringify(transactions),
      );
    } catch (error) {
      console.error("Error saving transaction:", error);
    }
  }

  private async updateLedger(transaction: CashTransaction): Promise<void> {
    try {
      // This would typically update a separate ledger system
      // For now, we'll just log the update
      console.log("Ledger updated for transaction:", transaction.id);
    } catch (error) {
      console.error("Error updating ledger:", error);
    }
  }

  // Helper methods for UI
  getPurposeLabel(purpose: string): string {
    return PURPOSE_LABELS[purpose as keyof typeof PURPOSE_LABELS] || purpose;
  }

  getStatusLabel(status: string): string {
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case "pending":
        return "#ff9800";
      case "completed":
        return "#4CAF50";
      case "expired":
        return "#f44336";
      case "overridden":
        return "#9C27B0";
      default:
        return "#999";
    }
  }

  getPurposeColor(purpose: string): string {
    switch (purpose) {
      case "advance":
        return "#2196F3";
      case "salary":
        return "#4CAF50";
      case "expense":
        return "#FF9800";
      case "other":
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

export const cashTransactionService = new CashTransactionService();
