// Payments & Cash Acknowledgment Dashboard
// Based on Vyaamikk Samadhaan Payments & Cash Acknowledgment Blueprint

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    RefreshControl,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PaymentRequest, PaymentStatus, PaymentRole } from '../src/types/Payments';
import { paymentService } from '../src/services/PaymentService';
import { appState } from '../src/state/AppState';

export default function PaymentsScreen() {
    const [payments, setPayments] = useState<PaymentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'disbursed' | 'acknowledged'>('all');

    const user = appState.getUser();

    useEffect(() => {
        loadPayments();
    }, []);

    const loadPayments = async () => {
        try {
            setLoading(true);
            // In a real app, this would call the API
            const userPayments = paymentService.getPaymentsByUser(user?.id || '');
            setPayments(userPayments);
        } catch (error) {
            console.error('Failed to load payments:', error);
            Alert.alert('Error', 'Failed to load payments');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadPayments();
        setRefreshing(false);
    };

    const getStatusColor = (status: PaymentStatus) => {
        switch (status) {
            case 'pending': return '#FFA500';
            case 'approved': return '#32CD32';
            case 'rejected': return '#FF4444';
            case 'disbursed': return '#4169E1';
            case 'acknowledged': return '#228B22';
            case 'disputed': return '#FF6347';
            case 'resolved': return '#20B2AA';
            default: return '#666666';
        }
    };

    const getStatusIcon = (status: PaymentStatus) => {
        switch (status) {
            case 'pending': return 'time-outline';
            case 'approved': return 'checkmark-circle-outline';
            case 'rejected': return 'close-circle-outline';
            case 'disbursed': return 'cash-outline';
            case 'acknowledged': return 'checkmark-done-outline';
            case 'disputed': return 'warning-outline';
            case 'resolved': return 'checkmark-circle';
            default: return 'help-circle-outline';
        }
    };

    const filteredPayments = payments.filter(payment => {
        if (activeTab === 'all') return true;
        return payment.status === activeTab;
    });

    const renderPaymentCard = (payment: PaymentRequest) => (
        <TouchableOpacity
            key={payment.id}
            style={styles.paymentCard}
            onPress={() => router.push(`/payment-details/${payment.id}`)}
        >
            <View style={styles.paymentHeader}>
                <View style={styles.paymentInfo}>
                    <Text style={styles.paymentAmount}>
                        {payment.currency} {payment.amount.toLocaleString()}
                    </Text>
                    <Text style={styles.paymentDescription}>{payment.description}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(payment.status) }]}>
                    <Ionicons
                        name={getStatusIcon(payment.status)}
                        size={16}
                        color="#ffffff"
                    />
                    <Text style={styles.statusText}>{payment.status.toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.paymentDetails}>
                <View style={styles.detailRow}>
                    <Ionicons name="person-outline" size={16} color="#666666" />
                    <Text style={styles.detailText}>
                        {payment.requesterRole} → {payment.recipientRole}
                    </Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name="card-outline" size={16} color="#666666" />
                    <Text style={styles.detailText}>{payment.disbursementMethod}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={16} color="#666666" />
                    <Text style={styles.detailText}>
                        {new Date(payment.createdAt).toLocaleDateString()}
                    </Text>
                </View>
            </View>

            {payment.status === 'pending' && payment.approvalChain.some(step => step.status === 'pending') && (
                <View style={styles.approvalRequired}>
                    <Ionicons name="alert-circle-outline" size={16} color="#FFA500" />
                    <Text style={styles.approvalText}>Approval Required</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const renderTabButton = (tab: string, label: string, count: number) => (
        <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab as any)}
        >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {label}
            </Text>
            <View style={[styles.countBadge, activeTab === tab && styles.activeCountBadge]}>
                <Text style={[styles.countText, activeTab === tab && styles.activeCountText]}>
                    {count}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading payments...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payments & Cash</Text>
                <TouchableOpacity onPress={() => router.push('/fund-dashboard')}>
                    <Ionicons name="wallet-outline" size={24} color="#ffffff" />
                </TouchableOpacity>
            </View>

            <View style={styles.tabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {renderTabButton('all', 'All', payments.length)}
                    {renderTabButton('pending', 'Pending', payments.filter(p => p.status === 'pending').length)}
                    {renderTabButton('approved', 'Approved', payments.filter(p => p.status === 'approved').length)}
                    {renderTabButton('disbursed', 'Disbursed', payments.filter(p => p.status === 'disbursed').length)}
                    {renderTabButton('acknowledged', 'Acknowledged', payments.filter(p => p.status === 'acknowledged').length)}
                </ScrollView>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {filteredPayments.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="card-outline" size={64} color="#666666" />
                        <Text style={styles.emptyTitle}>No payments found</Text>
                        <Text style={styles.emptySubtitle}>
                            {activeTab === 'all'
                                ? 'Create your first payment request'
                                : `No ${activeTab} payments at the moment`
                            }
                        </Text>
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={styles.createButton}
                                onPress={() => router.push('/create-payment')}
                            >
                                <Ionicons name="add" size={20} color="#ffffff" />
                                <Text style={styles.createButtonText}>Create Payment</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.createButton, styles.fundButton]}
                                onPress={() => router.push('/fund-dashboard')}
                            >
                                <Ionicons name="wallet-outline" size={20} color="#ffffff" />
                                <Text style={styles.createButtonText}>Fund Management</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.paymentsList}>
                        {filteredPayments.map(renderPaymentCard)}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1c1c1c',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1c1c1c',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#2a2a2a',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    tabsContainer: {
        backgroundColor: '#2a2a2a',
        paddingBottom: 10,
    },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 4,
        borderRadius: 20,
        backgroundColor: '#333333',
    },
    activeTab: {
        backgroundColor: '#007AFF',
    },
    tabText: {
        fontSize: 14,
        color: '#cccccc',
        marginRight: 8,
    },
    activeTabText: {
        color: '#ffffff',
        fontWeight: '600',
    },
    countBadge: {
        backgroundColor: '#666666',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        minWidth: 20,
        alignItems: 'center',
    },
    activeCountBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    countText: {
        fontSize: 12,
        color: '#ffffff',
        fontWeight: '600',
    },
    activeCountText: {
        color: '#ffffff',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#cccccc',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    createButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    fundButton: {
        backgroundColor: '#28a745',
    },
    paymentsList: {
        gap: 16,
    },
    paymentCard: {
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#333333',
    },
    paymentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    paymentInfo: {
        flex: 1,
    },
    paymentAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 4,
    },
    paymentDescription: {
        fontSize: 14,
        color: '#cccccc',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        color: '#ffffff',
        marginLeft: 4,
        fontWeight: '600',
    },
    paymentDetails: {
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailText: {
        fontSize: 14,
        color: '#cccccc',
        marginLeft: 8,
    },
    approvalRequired: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        padding: 8,
        backgroundColor: 'rgba(255, 165, 0, 0.1)',
        borderRadius: 8,
    },
    approvalText: {
        fontSize: 12,
        color: '#FFA500',
        marginLeft: 4,
        fontWeight: '600',
    },
});

