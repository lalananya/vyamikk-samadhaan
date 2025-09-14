// Fund Management Service - Based on Fintech Payments & Cash System Blueprint
// Version 1 Implementation

import {
    UserBalance,
    FundTransaction,
    AddFundsRequest,
    WithdrawFundsRequest,
    BankAccount,
    CardDetails,
    TreasuryOperation,
    FundDashboard,
    TransactionFees,
    TransactionMetadata,
    PaymentMethod,
    TransactionType,
    TransactionStatus,
    FundSource
} from '../types/FundManagement';
import { appState } from '../state/AppState';

class FundManagementService {
    private static instance: FundManagementService;
    private balances: Map<string, UserBalance> = new Map();
    private transactions: Map<string, FundTransaction> = new Map();
    private addFundsRequests: Map<string, AddFundsRequest> = new Map();
    private withdrawFundsRequests: Map<string, WithdrawFundsRequest> = new Map();
    private bankAccounts: Map<string, BankAccount> = new Map();
    private cards: Map<string, CardDetails> = new Map();
    private treasuryOperations: Map<string, TreasuryOperation> = new Map();

    private constructor() {
        this.initializeDefaultData();
    }

    public static getInstance(): FundManagementService {
        if (!FundManagementService.instance) {
            FundManagementService.instance = new FundManagementService();
        }
        return FundManagementService.instance;
    }

    private initializeDefaultData() {
        // Initialize with some sample data for development
        const userId = 'demo-user';
        this.balances.set(userId, {
            userId,
            availableBalance: 1000.00,
            pendingBalance: 0.00,
            holdBalance: 0.00,
            currency: 'INR',
            lastUpdated: new Date().toISOString(),
            accountStatus: 'active'
        });
    }

    // Balance Management
    async getUserBalance(userId: string): Promise<UserBalance> {
        const balance = this.balances.get(userId);
        if (!balance) {
            // Initialize balance for new user
            const newBalance: UserBalance = {
                userId,
                availableBalance: 0.00,
                pendingBalance: 0.00,
                holdBalance: 0.00,
                currency: 'INR',
                lastUpdated: new Date().toISOString(),
                accountStatus: 'active'
            };
            this.balances.set(userId, newBalance);
            return newBalance;
        }
        return balance;
    }

    async updateBalance(userId: string, amount: number, type: 'add' | 'subtract' | 'hold' | 'release'): Promise<UserBalance> {
        const balance = await this.getUserBalance(userId);
        const now = new Date().toISOString();

        switch (type) {
            case 'add':
                balance.availableBalance += amount;
                break;
            case 'subtract':
                balance.availableBalance -= amount;
                break;
            case 'hold':
                balance.availableBalance -= amount;
                balance.holdBalance += amount;
                break;
            case 'release':
                balance.holdBalance -= amount;
                balance.availableBalance += amount;
                break;
        }

        balance.lastUpdated = now;
        this.balances.set(userId, balance);
        return balance;
    }

    // Add Funds Flow
    async initiateAddFunds(request: Omit<AddFundsRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<AddFundsRequest> {
        const user = appState.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        const requestId = this.generateId();
        const now = new Date().toISOString();

        const addFundsRequest: AddFundsRequest = {
            ...request,
            id: requestId,
            userId: user.id,
            status: 'pending',
            createdAt: now,
            updatedAt: now,
            verificationRequired: this.requiresVerification(request.amount, request.method),
            verificationMethod: this.getVerificationMethod(request.method)
        };

        this.addFundsRequests.set(requestId, addFundsRequest);

        // Create transaction record
        const transaction: FundTransaction = {
            id: this.generateId(),
            userId: user.id,
            type: 'add_funds',
            method: request.method,
            source: request.source,
            amount: request.amount,
            currency: request.currency,
            status: 'pending',
            description: request.description || `Add funds via ${request.method}`,
            createdAt: now,
            updatedAt: now,
            fees: this.calculateFees(request.amount, request.method),
            metadata: this.generateMetadata(request)
        };

        this.transactions.set(transaction.id, transaction);

        return addFundsRequest;
    }

    async processAddFunds(requestId: string, verificationCode?: string): Promise<FundTransaction> {
        const request = this.addFundsRequests.get(requestId);
        if (!request) {
            throw new Error('Add funds request not found');
        }

        const user = appState.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Simulate verification check
        if (request.verificationRequired && !verificationCode) {
            throw new Error('Verification code required');
        }

        // Find the transaction
        const transaction = Array.from(this.transactions.values()).find(t =>
            t.userId === user.id && t.type === 'add_funds' && t.amount === request.amount
        );

        if (!transaction) {
            throw new Error('Transaction not found');
        }

        // Simulate payment processing
        const success = await this.simulatePaymentProcessing(request.method, request.amount);

        if (success) {
            // Update transaction status
            transaction.status = 'settled';
            transaction.settledAt = new Date().toISOString();
            transaction.updatedAt = new Date().toISOString();

            // Update user balance
            await this.updateBalance(user.id, request.amount, 'add');

            // Update request status
            request.status = 'settled';
            request.updatedAt = new Date().toISOString();
        } else {
            transaction.status = 'failed';
            transaction.failedAt = new Date().toISOString();
            transaction.failureReason = 'Payment processing failed';
            transaction.updatedAt = new Date().toISOString();

            request.status = 'failed';
            request.updatedAt = new Date().toISOString();
        }

        this.transactions.set(transaction.id, transaction);
        this.addFundsRequests.set(requestId, request);

        return transaction;
    }

    // Withdraw Funds Flow
    async initiateWithdrawFunds(request: Omit<WithdrawFundsRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'fees' | 'netAmount'>): Promise<WithdrawFundsRequest> {
        const user = appState.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        const requestId = this.generateId();
        const now = new Date().toISOString();

        // Calculate fees
        const fees = this.calculateWithdrawalFees(request.amount);
        const netAmount = request.amount - fees.totalFees;

        const withdrawFundsRequest: WithdrawFundsRequest = {
            ...request,
            id: requestId,
            userId: user.id,
            status: 'pending',
            fees,
            netAmount,
            createdAt: now,
            updatedAt: now,
            verificationRequired: this.requiresVerification(request.amount, 'bank_transfer_ach'),
            verificationMethod: '2fa'
        };

        this.withdrawFundsRequests.set(requestId, withdrawFundsRequest);

        // Create transaction record
        const transaction: FundTransaction = {
            id: this.generateId(),
            userId: user.id,
            type: 'withdraw_funds',
            method: 'bank_transfer_ach',
            source: 'ach',
            amount: request.amount,
            currency: request.currency,
            status: 'pending',
            description: request.description || `Withdraw funds to bank account`,
            createdAt: now,
            updatedAt: now,
            fees,
            metadata: {
                bankAccountLast4: '****1234', // This would come from bank account lookup
                treasuryReference: this.generateTreasuryReference()
            }
        };

        this.transactions.set(transaction.id, transaction);

        return withdrawFundsRequest;
    }

    async processWithdrawFunds(requestId: string, verificationCode?: string): Promise<FundTransaction> {
        const request = this.withdrawFundsRequests.get(requestId);
        if (!request) {
            throw new Error('Withdraw funds request not found');
        }

        const user = appState.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Check balance
        const balance = await this.getUserBalance(user.id);
        if (balance.availableBalance < request.amount) {
            throw new Error('Insufficient funds');
        }

        // Simulate verification check
        if (request.verificationRequired && !verificationCode) {
            throw new Error('Verification code required');
        }

        // Find the transaction
        const transaction = Array.from(this.transactions.values()).find(t =>
            t.userId === user.id && t.type === 'withdraw_funds' && t.amount === request.amount
        );

        if (!transaction) {
            throw new Error('Transaction not found');
        }

        // Hold the funds
        await this.updateBalance(user.id, request.amount, 'hold');

        // Create treasury operation
        const treasuryOp: TreasuryOperation = {
            id: this.generateId(),
            userId: user.id,
            transactionId: transaction.id,
            operationType: 'withdrawal',
            amount: request.amount,
            currency: request.currency,
            status: 'processing',
            referenceId: request.treasuryReference || this.generateTreasuryReference(),
            createdAt: new Date().toISOString()
        };

        this.treasuryOperations.set(treasuryOp.id, treasuryOp);

        // Simulate treasury processing
        const success = await this.simulateTreasuryProcessing(request.amount);

        if (success) {
            // Update transaction status
            transaction.status = 'settled';
            transaction.settledAt = new Date().toISOString();
            transaction.updatedAt = new Date().toISOString();

            // Release hold and subtract from balance
            await this.updateBalance(user.id, request.amount, 'release');
            await this.updateBalance(user.id, request.amount, 'subtract');

            // Update treasury operation
            treasuryOp.status = 'completed';
            treasuryOp.completedAt = new Date().toISOString();

            // Update request status
            request.status = 'settled';
            request.processedAt = new Date().toISOString();
            request.updatedAt = new Date().toISOString();
        } else {
            // Release hold on failure
            await this.updateBalance(user.id, request.amount, 'release');

            transaction.status = 'failed';
            transaction.failedAt = new Date().toISOString();
            transaction.failureReason = 'Treasury processing failed';
            transaction.updatedAt = new Date().toISOString();

            treasuryOp.status = 'failed';
            treasuryOp.failureReason = 'Treasury processing failed';

            request.status = 'failed';
            request.updatedAt = new Date().toISOString();
        }

        this.transactions.set(transaction.id, transaction);
        this.treasuryOperations.set(treasuryOp.id, treasuryOp);
        this.withdrawFundsRequests.set(requestId, request);

        return transaction;
    }

    // Bank Account Management
    async addBankAccount(account: Omit<BankAccount, 'id' | 'createdAt' | 'isVerified'>): Promise<BankAccount> {
        const user = appState.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        const accountId = this.generateId();
        const now = new Date().toISOString();

        const bankAccount: BankAccount = {
            ...account,
            id: accountId,
            userId: user.id,
            isVerified: false,
            createdAt: now
        };

        this.bankAccounts.set(accountId, bankAccount);
        return bankAccount;
    }

    async getBankAccounts(userId: string): Promise<BankAccount[]> {
        return Array.from(this.bankAccounts.values()).filter(account => account.userId === userId);
    }

    // Transaction History
    async getTransactionHistory(userId: string, limit: number = 20, offset: number = 0): Promise<FundTransaction[]> {
        const userTransactions = Array.from(this.transactions.values())
            .filter(transaction => transaction.userId === userId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(offset, offset + limit);

        return userTransactions;
    }

    // Dashboard Data
    async getFundDashboard(userId: string): Promise<FundDashboard> {
        const balance = await this.getUserBalance(userId);
        const recentTransactions = await this.getTransactionHistory(userId, 10);
        const pendingTransactions = Array.from(this.transactions.values())
            .filter(t => t.userId === userId && t.status === 'pending');

        const bankAccounts = await this.getBankAccounts(userId);
        const cards = Array.from(this.cards.values()).filter(c => c.userId === userId);

        const quickActions: any[] = [
            {
                id: 'add_funds',
                title: 'Add Funds',
                description: 'Add money to your account',
                icon: 'add-circle-outline',
                action: 'add_funds',
                enabled: true,
                requiresVerification: false
            },
            {
                id: 'withdraw_funds',
                title: 'Withdraw Funds',
                description: 'Withdraw money to your bank',
                icon: 'remove-circle-outline',
                action: 'withdraw_funds',
                enabled: balance.availableBalance > 0,
                requiresVerification: true
            },
            {
                id: 'view_history',
                title: 'Transaction History',
                description: 'View all transactions',
                icon: 'list-outline',
                action: 'view_history',
                enabled: true,
                requiresVerification: false
            },
            {
                id: 'manage_accounts',
                title: 'Manage Accounts',
                description: 'Manage bank accounts and cards',
                icon: 'card-outline',
                action: 'manage_accounts',
                enabled: true,
                requiresVerification: false
            }
        ];

        return {
            balance,
            recentTransactions,
            pendingTransactions,
            linkedAccounts: {
                bankAccounts,
                cards,
            },
            quickActions,
            notifications: [] // TODO: Implement notifications
        };
    }

    // Helper Methods
    private requiresVerification(amount: number, method: PaymentMethod): boolean {
        // Require verification for amounts over 1000 or certain methods
        return amount > 1000 || method === 'bank_transfer_ach';
    }

    private getVerificationMethod(method: PaymentMethod): '2fa' | 'sms' | 'email' | 'biometric' {
        switch (method) {
            case 'credit_card':
            case 'debit_card':
                return '2fa';
            case 'bank_transfer_ach':
                return '2fa';
            default:
                return 'sms';
        }
    }

    private calculateFees(amount: number, method: PaymentMethod): TransactionFees {
        let processingFee = 0;
        let networkFee = 0;

        switch (method) {
            case 'credit_card':
            case 'debit_card':
                processingFee = amount * 0.029; // 2.9%
                break;
            case 'bank_transfer_ach':
                processingFee = 0; // Free ACH
                break;
        }

        const totalFees = processingFee + networkFee;
        const netAmount = amount - totalFees;

        return {
            processingFee,
            networkFee,
            totalFees,
            netAmount
        };
    }

    private calculateWithdrawalFees(amount: number): TransactionFees {
        const processingFee = Math.max(amount * 0.01, 1.00); // 1% or minimum $1
        const totalFees = processingFee;
        const netAmount = amount - totalFees;

        return {
            processingFee,
            totalFees,
            netAmount
        };
    }

    private generateMetadata(request: any): TransactionMetadata {
        const metadata: TransactionMetadata = {
            idempotencyKey: this.generateId(),
            riskScore: Math.random() * 100,
            amlStatus: 'pending'
        };

        if (request.cardDetails) {
            metadata.cardLast4 = request.cardDetails.last4;
        }
        if (request.bankAccount) {
            metadata.bankAccountLast4 = request.bankAccount.accountNumber.slice(-4);
        }

        return metadata;
    }

    private async simulatePaymentProcessing(method: PaymentMethod, amount: number): Promise<boolean> {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simulate 95% success rate
        return Math.random() > 0.05;
    }

    private async simulateTreasuryProcessing(amount: number): Promise<boolean> {
        // Simulate treasury processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Simulate 98% success rate
        return Math.random() > 0.02;
    }

    private generateTreasuryReference(): string {
        return 'TXN' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase();
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}

export const fundManagementService = FundManagementService.getInstance();
