// Fund Management Types - Based on Fintech Payments & Cash System Blueprint
// Version 1 Implementation

export type PaymentMethod =
    | 'credit_card'
    | 'debit_card'
    | 'bank_transfer_ach'
    | 'cash_vault';

export type TransactionType =
    | 'add_funds'
    | 'withdraw_funds'
    | 'payment_disbursement'
    | 'cash_acknowledgment'
    | 'refund'
    | 'fee';

export type TransactionStatus =
    | 'pending'
    | 'processing'
    | 'settled'
    | 'failed'
    | 'cancelled'
    | 'hold'
    | 'reversed';

export type FundSource =
    | 'card'
    | 'ach'
    | 'cash';

export interface UserBalance {
    userId: string;
    availableBalance: number;
    pendingBalance: number;
    holdBalance: number;
    currency: string;
    lastUpdated: string;
    accountStatus: 'active' | 'suspended' | 'frozen';
}

export interface FundTransaction {
    id: string;
    userId: string;
    type: TransactionType;
    method: PaymentMethod;
    source: FundSource;
    amount: number;
    currency: string;
    status: TransactionStatus;
    description: string;
    referenceId?: string;
    externalTransactionId?: string;
    createdAt: string;
    updatedAt: string;
    settledAt?: string;
    failedAt?: string;
    failureReason?: string;
    fees?: TransactionFees;
    metadata?: TransactionMetadata;
    webhookData?: any;
}

export interface TransactionFees {
    processingFee: number;
    networkFee?: number;
    currencyConversionFee?: number;
    totalFees: number;
    netAmount: number;
}

export interface TransactionMetadata {
    cardLast4?: string;
    bankAccountLast4?: string;
    cryptoAddress?: string;
    cryptoNetwork?: string;
    achReference?: string;
    treasuryReference?: string;
    idempotencyKey?: string;
    riskScore?: number;
    amlStatus?: 'pending' | 'approved' | 'rejected';
}

export interface BankAccount {
    id: string;
    userId: string;
    accountName: string;
    accountNumber: string;
    routingNumber: string;
    bankName: string;
    accountType: 'checking' | 'savings';
    isVerified: boolean;
    isDefault: boolean;
    createdAt: string;
    lastUsed?: string;
}

export interface CardDetails {
    id: string;
    userId: string;
    last4: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
    isVerified: boolean;
    createdAt: string;
    lastUsed?: string;
}


export interface AddFundsRequest {
    id: string;
    userId: string;
    amount: number;
    currency: string;
    method: PaymentMethod;
    source: FundSource;
    cardDetails?: Partial<CardDetails>;
    bankAccount?: Partial<BankAccount>;
    description?: string;
    status: TransactionStatus;
    createdAt: string;
    updatedAt: string;
    expiresAt?: string;
    verificationRequired: boolean;
    verificationMethod?: '2fa' | 'sms' | 'email' | 'biometric';
}

export interface WithdrawFundsRequest {
    id: string;
    userId: string;
    amount: number;
    currency: string;
    bankAccountId: string;
    description?: string;
    status: TransactionStatus;
    fees: TransactionFees;
    netAmount: number;
    createdAt: string;
    updatedAt: string;
    processedAt?: string;
    treasuryReference?: string;
    verificationRequired: boolean;
    verificationMethod?: '2fa' | 'sms' | 'email' | 'biometric';
}

export interface TreasuryOperation {
    id: string;
    userId: string;
    transactionId: string;
    operationType: 'withdrawal' | 'deposit' | 'hold' | 'release';
    amount: number;
    currency: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    referenceId: string;
    createdAt: string;
    completedAt?: string;
    failureReason?: string;
    webhookData?: any;
}

export interface FundDashboard {
    balance: UserBalance;
    recentTransactions: FundTransaction[];
    pendingTransactions: FundTransaction[];
    linkedAccounts: {
        bankAccounts: BankAccount[];
        cards: CardDetails[];
        cryptoWallets: CryptoWallet[];
    };
    quickActions: QuickAction[];
    notifications: FundNotification[];
}

export interface QuickAction {
    id: string;
    title: string;
    description: string;
    icon: string;
    action: 'add_funds' | 'withdraw_funds' | 'view_history' | 'manage_accounts';
    enabled: boolean;
    requiresVerification: boolean;
}

export interface FundNotification {
    id: string;
    userId: string;
    type: 'transaction_update' | 'balance_change' | 'verification_required' | 'account_alert';
    title: string;
    message: string;
    isRead: boolean;
    actionRequired: boolean;
    actionUrl?: string;
    createdAt: string;
    transactionId?: string;
}

// API Response Types
export interface FundBalanceResponse {
    success: boolean;
    balance: UserBalance;
    message?: string;
}

export interface TransactionResponse {
    success: boolean;
    transaction: FundTransaction;
    message?: string;
}

export interface AddFundsResponse {
    success: boolean;
    transaction: FundTransaction;
    verificationRequired: boolean;
    verificationMethod?: string;
    message?: string;
}

export interface WithdrawFundsResponse {
    success: boolean;
    transaction: FundTransaction;
    verificationRequired: boolean;
    verificationMethod?: string;
    message?: string;
}

export interface BankAccountResponse {
    success: boolean;
    account: BankAccount;
    message?: string;
}

export interface TreasuryResponse {
    success: boolean;
    operation: TreasuryOperation;
    message?: string;
}
