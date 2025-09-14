// Payment and Cash Acknowledgment Types
// Based on Vyaamikk Samadhaan Payments & Cash Acknowledgment Blueprint

export type PaymentRole = 'owner' | 'admin' | 'seviscr' | 'vendor' | 'company';

export type DisbursementMethod =
    | 'cash_manual' // LFT/MPS/NEFT
    | 'cash_vault' // Petty cash
    | 'escrow'; // Escrow service

export type PaymentStatus =
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'disbursed'
    | 'acknowledged'
    | 'disputed'
    | 'resolved';

export type AcknowledgmentType =
    | 'company_to_employee'
    | 'company_to_company_dual'
    | 'peer_to_peer_timestamped';

export type NotificationType =
    | 'payment_request'
    | 'payment_approved'
    | 'payment_rejected'
    | 'payment_disbursed'
    | 'acknowledgment_required'
    | 'acknowledgment_received'
    | 'dispute_raised'
    | 'dispute_resolved'
    | 'compliance_required';

export interface PaymentRequest {
    id: string;
    requesterId: string;
    requesterRole: PaymentRole;
    recipientId: string;
    recipientRole: PaymentRole;
    amount: number;
    currency: string;
    description: string;
    disbursementMethod: DisbursementMethod;
    acknowledgmentType: AcknowledgmentType;
    status: PaymentStatus;
    createdAt: string;
    updatedAt: string;
    approvedAt?: string;
    disbursedAt?: string;
    acknowledgedAt?: string;
    disputeReason?: string;
    resolutionNotes?: string;
    complianceData?: ComplianceData;
    attachments?: PaymentAttachment[];
    approvalChain: ApprovalStep[];
    notifications: PaymentNotification[];
}

export interface ApprovalStep {
    id: string;
    approverId: string;
    approverRole: PaymentRole;
    status: 'pending' | 'approved' | 'rejected';
    comments?: string;
    approvedAt?: string;
    rejectedAt?: string;
    order: number; // For multi-stage approval
}

export interface CashAcknowledgment {
    id: string;
    paymentId: string;
    acknowledgmentType: AcknowledgmentType;
    acknowledgedBy: string;
    acknowledgedAt: string;
    amount: number;
    currency: string;
    timestamp: string; // For peer-to-peer timestamped
    dualAcknowledgment?: {
        secondAcknowledger: string;
        secondAcknowledgedAt: string;
    };
    verificationData?: {
        location?: string;
        deviceInfo?: string;
        biometricData?: string;
    };
    status: 'pending' | 'verified' | 'disputed';
    disputeReason?: string;
    resolutionNotes?: string;
}

export interface PaymentNotification {
    id: string;
    paymentId: string;
    recipientId: string;
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    actionRequired: boolean;
    actionUrl?: string;
}

export interface ComplianceData {
    kycStatus: 'pending' | 'verified' | 'rejected';
    amlStatus: 'pending' | 'verified' | 'rejected';
    verificationDocuments: string[];
    riskLevel: 'low' | 'medium' | 'high';
    lastVerified: string;
    nextReviewDate: string;
}

export interface PaymentAttachment {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedAt: string;
    uploadedBy: string;
    category: 'invoice' | 'receipt' | 'contract' | 'compliance' | 'other';
}

export interface DisbursementLedger {
    id: string;
    paymentId: string;
    disbursementMethod: DisbursementMethod;
    amount: number;
    currency: string;
    disbursedBy: string;
    disbursedAt: string;
    bankDetails?: {
        accountNumber: string;
        ifscCode: string;
        bankName: string;
    };
    cashVaultDetails?: {
        vaultId: string;
        location: string;
        custodian: string;
    };
    escrowDetails?: {
        escrowId: string;
        escrowProvider: string;
        releaseConditions: string[];
    };
    status: 'initiated' | 'completed' | 'failed' | 'reversed';
    transactionId?: string;
    failureReason?: string;
}

export interface PaymentDashboard {
    totalPending: number;
    totalApproved: number;
    totalDisbursed: number;
    totalAcknowledged: number;
    totalDisputed: number;
    pendingApprovals: PaymentRequest[];
    recentPayments: PaymentRequest[];
    pendingAcknowledgment: PaymentRequest[];
    disputes: PaymentRequest[];
    complianceAlerts: ComplianceAlert[];
}

export interface ComplianceAlert {
    id: string;
    type: 'kyc_expired' | 'aml_risk' | 'document_missing' | 'verification_required';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    paymentId?: string;
    userId?: string;
    createdAt: string;
    resolvedAt?: string;
    actionRequired: boolean;
}

// API Response Types
export interface PaymentListResponse {
    payments: PaymentRequest[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

export interface AcknowledgmentResponse {
    success: boolean;
    acknowledgment: CashAcknowledgment;
    message: string;
}

export interface DisbursementResponse {
    success: boolean;
    disbursement: DisbursementLedger;
    message: string;
}

