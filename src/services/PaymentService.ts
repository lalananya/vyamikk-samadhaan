// Payment Service - Core business logic for payments and cash acknowledgments
// Based on Vyaamikk Samadhaan Payments & Cash Acknowledgment Blueprint

import {
    PaymentRequest,
    CashAcknowledgment,
    DisbursementLedger,
    PaymentRole,
    PaymentStatus,
    AcknowledgmentType,
    DisbursementMethod,
    ApprovalStep,
    PaymentNotification,
    ComplianceData,
    DisbursementResponse,
    AcknowledgmentResponse
} from '../types/Payments';
import { appState } from '../state/AppState';

class PaymentService {
    private static instance: PaymentService;
    private payments: Map<string, PaymentRequest> = new Map();
    private acknowledgments: Map<string, CashAcknowledgment> = new Map();
    private disbursements: Map<string, DisbursementLedger> = new Map();
    private notifications: Map<string, PaymentNotification> = new Map();

    private constructor() { }

    public static getInstance(): PaymentService {
        if (!PaymentService.instance) {
            PaymentService.instance = new PaymentService();
        }
        return PaymentService.instance;
    }

    // Payment Request Management
    async createPaymentRequest(request: Omit<PaymentRequest, 'id' | 'createdAt' | 'updatedAt' | 'approvalChain' | 'notifications'>): Promise<PaymentRequest> {
        const user = appState.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        const paymentId = this.generateId();
        const now = new Date().toISOString();

        // Determine approval chain based on amount and roles
        const approvalChain = this.generateApprovalChain(request.amount, request.requesterRole, request.recipientRole);

        const paymentRequest: PaymentRequest = {
            ...request,
            id: paymentId,
            createdAt: now,
            updatedAt: now,
            status: 'pending',
            approvalChain,
            notifications: []
        };

        this.payments.set(paymentId, paymentRequest);

        // Send initial notifications
        await this.sendNotification(paymentId, 'payment_request', 'Payment Request Created',
            `New payment request of ${request.currency} ${request.amount} has been created.`);

        return paymentRequest;
    }

    // Approval Workflow
    async approvePayment(paymentId: string, approverId: string, comments?: string): Promise<PaymentRequest> {
        const payment = this.payments.get(paymentId);
        if (!payment) {
            throw new Error('Payment not found');
        }

        const user = appState.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Find the current approval step
        const currentStep = payment.approvalChain.find(step =>
            step.status === 'pending' && step.approverId === approverId
        );

        if (!currentStep) {
            throw new Error('No pending approval found for this user');
        }

        // Update approval step
        currentStep.status = 'approved';
        currentStep.comments = comments;
        currentStep.approvedAt = new Date().toISOString();

        // Check if all approvals are complete
        const allApproved = payment.approvalChain.every(step => step.status === 'approved');

        if (allApproved) {
            payment.status = 'approved';
            payment.approvedAt = new Date().toISOString();

            // Notify requester
            await this.sendNotification(paymentId, 'payment_approved', 'Payment Approved',
                `Your payment request has been approved and is ready for disbursement.`);
        }

        payment.updatedAt = new Date().toISOString();
        this.payments.set(paymentId, payment);

        return payment;
    }

    async rejectPayment(paymentId: string, approverId: string, reason: string): Promise<PaymentRequest> {
        const payment = this.payments.get(paymentId);
        if (!payment) {
            throw new Error('Payment not found');
        }

        const user = appState.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Find the current approval step
        const currentStep = payment.approvalChain.find(step =>
            step.status === 'pending' && step.approverId === approverId
        );

        if (!currentStep) {
            throw new Error('No pending approval found for this user');
        }

        // Update approval step
        currentStep.status = 'rejected';
        currentStep.comments = reason;
        currentStep.rejectedAt = new Date().toISOString();

        // Reject the entire payment
        payment.status = 'rejected';
        payment.updatedAt = new Date().toISOString();
        this.payments.set(paymentId, payment);

        // Notify requester
        await this.sendNotification(paymentId, 'payment_rejected', 'Payment Rejected',
            `Your payment request has been rejected. Reason: ${reason}`);

        return payment;
    }

    // Disbursement Management
    async initiateDisbursement(paymentId: string, disbursementMethod: DisbursementMethod, details?: any): Promise<DisbursementResponse> {
        const payment = this.payments.get(paymentId);
        if (!payment) {
            throw new Error('Payment not found');
        }

        if (payment.status !== 'approved') {
            throw new Error('Payment must be approved before disbursement');
        }

        const user = appState.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        const disbursementId = this.generateId();
        const now = new Date().toISOString();

        const disbursement: DisbursementLedger = {
            id: disbursementId,
            paymentId,
            disbursementMethod,
            amount: payment.amount,
            currency: payment.currency,
            disbursedBy: user.id,
            disbursedAt: now,
            status: 'initiated',
            ...details
        };

        this.disbursements.set(disbursementId, disbursement);

        // Update payment status
        payment.status = 'disbursed';
        payment.disbursedAt = now;
        payment.updatedAt = now;
        this.payments.set(paymentId, payment);

        // Notify recipient
        await this.sendNotification(paymentId, 'payment_disbursed', 'Payment Disbursed',
            `Payment of ${payment.currency} ${payment.amount} has been disbursed via ${disbursementMethod}.`);

        return {
            success: true,
            disbursement,
            message: 'Disbursement initiated successfully'
        };
    }

    // Cash Acknowledgment Management
    async createAcknowledgment(
        paymentId: string,
        acknowledgmentType: AcknowledgmentType,
        verificationData?: any
    ): Promise<AcknowledgmentResponse> {
        const payment = this.payments.get(paymentId);
        if (!payment) {
            throw new Error('Payment not found');
        }

        if (payment.status !== 'disbursed') {
            throw new Error('Payment must be disbursed before acknowledgment');
        }

        const user = appState.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        const acknowledgmentId = this.generateId();
        const now = new Date().toISOString();

        const acknowledgment: CashAcknowledgment = {
            id: acknowledgmentId,
            paymentId,
            acknowledgmentType,
            acknowledgedBy: user.id,
            acknowledgedAt: now,
            amount: payment.amount,
            currency: payment.currency,
            timestamp: now,
            verificationData,
            status: 'pending'
        };

        // Handle dual acknowledgment for company-to-company
        if (acknowledgmentType === 'company_to_company_dual') {
            acknowledgment.dualAcknowledgment = {
                secondAcknowledger: user.id, // This would be the second party in real implementation
                secondAcknowledgedAt: now
            };
        }

        this.acknowledgments.set(acknowledgmentId, acknowledgment);

        // Update payment status
        payment.status = 'acknowledged';
        payment.acknowledgedAt = now;
        payment.updatedAt = now;
        this.payments.set(paymentId, payment);

        // Notify all parties
        await this.sendNotification(paymentId, 'acknowledgment_received', 'Payment Acknowledged',
            `Payment of ${payment.currency} ${payment.amount} has been acknowledged.`);

        return {
            success: true,
            acknowledgment,
            message: 'Acknowledgment created successfully'
        };
    }

    // Dispute Management
    async raiseDispute(paymentId: string, reason: string): Promise<PaymentRequest> {
        const payment = this.payments.get(paymentId);
        if (!payment) {
            throw new Error('Payment not found');
        }

        const user = appState.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        payment.status = 'disputed';
        payment.disputeReason = reason;
        payment.updatedAt = new Date().toISOString();
        this.payments.set(paymentId, payment);

        // Notify all parties about dispute
        await this.sendNotification(paymentId, 'dispute_raised', 'Dispute Raised',
            `A dispute has been raised for payment ${paymentId}. Reason: ${reason}`);

        return payment;
    }

    async resolveDispute(paymentId: string, resolution: string): Promise<PaymentRequest> {
        const payment = this.payments.get(paymentId);
        if (!payment) {
            throw new Error('Payment not found');
        }

        if (payment.status !== 'disputed') {
            throw new Error('Payment is not in disputed status');
        }

        const user = appState.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        payment.status = 'resolved';
        payment.resolutionNotes = resolution;
        payment.updatedAt = new Date().toISOString();
        this.payments.set(paymentId, payment);

        // Notify all parties about resolution
        await this.sendNotification(paymentId, 'dispute_resolved', 'Dispute Resolved',
            `Dispute for payment ${paymentId} has been resolved. Resolution: ${resolution}`);

        return payment;
    }

    // Notification Management
    private async sendNotification(
        paymentId: string,
        type: string,
        title: string,
        message: string
    ): Promise<void> {
        const notificationId = this.generateId();
        const now = new Date().toISOString();

        const notification: PaymentNotification = {
            id: notificationId,
            paymentId,
            recipientId: '', // This would be determined based on the notification type
            type: type as any,
            title,
            message,
            isRead: false,
            createdAt: now,
            actionRequired: type.includes('approval') || type.includes('acknowledgment')
        };

        this.notifications.set(notificationId, notification);

        // Add to payment's notification list
        const payment = this.payments.get(paymentId);
        if (payment) {
            payment.notifications.push(notification);
            this.payments.set(paymentId, payment);
        }
    }

    // Helper Methods
    private generateApprovalChain(amount: number, requesterRole: PaymentRole, recipientRole: PaymentRole): ApprovalStep[] {
        const chain: ApprovalStep[] = [];

        // Simple approval logic - can be made more complex based on business rules
        if (amount > 10000) {
            // High amount requires owner approval
            chain.push({
                id: this.generateId(),
                approverId: 'owner', // This would be actual owner ID
                approverRole: 'owner',
                status: 'pending',
                order: 1
            });
        }

        if (amount > 1000) {
            // Medium amount requires admin approval
            chain.push({
                id: this.generateId(),
                approverId: 'admin', // This would be actual admin ID
                approverRole: 'admin',
                status: 'pending',
                order: 2
            });
        }

        return chain;
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }

    // Getters for data access
    getPayment(paymentId: string): PaymentRequest | undefined {
        return this.payments.get(paymentId);
    }

    getPaymentsByUser(userId: string): PaymentRequest[] {
        return Array.from(this.payments.values()).filter(
            payment => payment.requesterId === userId || payment.recipientId === userId
        );
    }

    getPendingApprovals(userId: string): PaymentRequest[] {
        return Array.from(this.payments.values()).filter(payment =>
            payment.approvalChain.some(step =>
                step.approverId === userId && step.status === 'pending'
            )
        );
    }

    getNotifications(userId: string): PaymentNotification[] {
        return Array.from(this.notifications.values()).filter(
            notification => notification.recipientId === userId
        );
    }
}

export const paymentService = PaymentService.getInstance();

