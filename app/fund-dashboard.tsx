// Fund Dashboard - Based on Fintech Payments & Cash System Blueprint
// Version 1 Implementation

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FundDashboard, FundTransaction, UserBalance } from '../src/types/FundManagement';
import { fundManagementService } from '../src/services/FundManagementService';
import { appState } from '../src/state/AppState';

export default function FundDashboardScreen() {
    const [dashboard, setDashboard] = useState<FundDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const user = appState.getUser();

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            if (!user?.id) return;

            const dashboardData = await fundManagementService.getFundDashboard(user.id);
            setDashboard(dashboardData);
        } catch (error) {
            console.error('Failed to load fund dashboard:', error);
            Alert.alert('Error', 'Failed to load fund dashboard');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadDashboard();
        setRefreshing(false);
    };

    const handleQuickAction = (action: string) => {
        switch (action) {
            case 'add_funds':
                router.push('/add-funds');
                break;
            case 'withdraw_funds':
                router.push('/withdraw-funds');
                break;
            case 'view_history':
                router.push('/transaction-history');
                break;
            case 'manage_accounts':
                router.push('/manage-accounts');
                break;
        }
    };

    const formatCurrency = (amount: number, currency: string = 'INR') => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return '#FFA500';
            case 'processing': return '#007AFF';
            case 'settled': return '#28a745';
            case 'failed': return '#dc3545';
            case 'cancelled': return '#6c757d';
            default: return '#666666';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return 'time-outline';
            case 'processing': return 'sync-outline';
            case 'settled': return 'checkmark-circle-outline';
            case 'failed': return 'close-circle-outline';
            case 'cancelled': return 'ban-outline';
            default: return 'help-circle-outline';
        }
    };

    const renderBalanceCard = (balance: UserBalance) => (
        <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <View style={[styles.statusBadge, { backgroundColor: balance.accountStatus === 'active' ? '#28a745' : '#dc3545' }]}>
                    <Text style={styles.statusText}>{balance.accountStatus.toUpperCase()}</Text>
                </View>
            </View>
            <Text style={styles.balanceAmount}>
                {formatCurrency(balance.availableBalance, balance.currency)}
            </Text>
            <View style={styles.balanceDetails}>
                <View style={styles.balanceDetailItem}>
                    <Text style={styles.balanceDetailLabel}>Pending</Text>
                    <Text style={styles.balanceDetailValue}>
                        {formatCurrency(balance.pendingBalance, balance.currency)}
                    </Text>
                </View>
                <View style={styles.balanceDetailItem}>
                    <Text style={styles.balanceDetailLabel}>On Hold</Text>
                    <Text style={styles.balanceDetailValue}>
                        {formatCurrency(balance.holdBalance, balance.currency)}
                    </Text>
                </View>
            </View>
        </View>
    );

    const renderQuickActions = (quickActions: any[]) => (
        <View style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
                {quickActions.map((action) => (
                    <TouchableOpacity
                        key={action.id}
                        style={[styles.quickActionCard, !action.enabled && styles.quickActionCardDisabled]}
                        onPress={() => action.enabled && handleQuickAction(action.action)}
                        disabled={!action.enabled}
                    >
                        <Ionicons
                            name={action.icon as any}
                            size={24}
                            color={action.enabled ? '#007AFF' : '#666666'}
                        />
                        <Text style={[styles.quickActionTitle, !action.enabled && styles.quickActionTitleDisabled]}>
                            {action.title}
                        </Text>
                        <Text style={[styles.quickActionDescription, !action.enabled && styles.quickActionDescriptionDisabled]}>
                            {action.description}
                        </Text>
                        {action.requiresVerification && (
                            <View style={styles.verificationBadge}>
                                <Ionicons name="shield-checkmark" size={12} color="#FFA500" />
                                <Text style={styles.verificationText}>2FA</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderTransactionItem = (transaction: FundTransaction) => (
        <TouchableOpacity key={transaction.id} style={styles.transactionItem}>
            <View style={styles.transactionIcon}>
                <Ionicons
                    name={transaction.type === 'add_funds' ? 'add-circle' : 'remove-circle'}
                    size={24}
                    color={transaction.type === 'add_funds' ? '#28a745' : '#dc3545'}
                />
            </View>
            <View style={styles.transactionDetails}>
                <Text style={styles.transactionDescription}>{transaction.description}</Text>
                <Text style={styles.transactionMethod}>{transaction.method.replace('_', ' ').toUpperCase()}</Text>
                <Text style={styles.transactionDate}>
                    {new Date(transaction.createdAt).toLocaleDateString()}
                </Text>
            </View>
            <View style={styles.transactionAmount}>
                <Text style={[
                    styles.transactionAmountText,
                    { color: transaction.type === 'add_funds' ? '#28a745' : '#dc3545' }
                ]}>
                    {transaction.type === 'add_funds' ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) }]}>
                    <Ionicons name={getStatusIcon(transaction.status)} size={12} color="#ffffff" />
                    <Text style={styles.statusText}>{transaction.status.toUpperCase()}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderLinkedAccounts = (linkedAccounts: any) => (
        <View style={styles.linkedAccountsSection}>
            <Text style={styles.sectionTitle}>Linked Accounts</Text>
            <View style={styles.linkedAccountsList}>
                {linkedAccounts.bankAccounts.map((account: any) => (
                    <View key={account.id} style={styles.accountItem}>
                        <Ionicons name="business-outline" size={20} color="#007AFF" />
                        <View style={styles.accountDetails}>
                            <Text style={styles.accountName}>{account.accountName}</Text>
                            <Text style={styles.accountNumber}>****{account.accountNumber.slice(-4)}</Text>
                        </View>
                        <View style={[styles.verificationBadge, { backgroundColor: account.isVerified ? '#28a745' : '#FFA500' }]}>
                            <Text style={styles.verificationText}>{account.isVerified ? 'Verified' : 'Pending'}</Text>
                        </View>
                    </View>
                ))}
                {linkedAccounts.cards.map((card: any) => (
                    <View key={card.id} style={styles.accountItem}>
                        <Ionicons name="card-outline" size={20} color="#007AFF" />
                        <View style={styles.accountDetails}>
                            <Text style={styles.accountName}>{card.brand.toUpperCase()} Card</Text>
                            <Text style={styles.accountNumber}>****{card.last4}</Text>
                        </View>
                        <View style={[styles.verificationBadge, { backgroundColor: card.isVerified ? '#28a745' : '#FFA500' }]}>
                            <Text style={styles.verificationText}>{card.isVerified ? 'Verified' : 'Pending'}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading fund dashboard...</Text>
            </View>
        );
    }

    if (!dashboard) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={64} color="#dc3545" />
                <Text style={styles.errorTitle}>Failed to load dashboard</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadDashboard}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Funds & Cash</Text>
                <TouchableOpacity onPress={() => router.push('/settings')}>
                    <Ionicons name="settings-outline" size={24} color="#ffffff" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {renderBalanceCard(dashboard.balance)}
                {renderQuickActions(dashboard.quickActions)}

                {dashboard.recentTransactions.length > 0 && (
                    <View style={styles.transactionsSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Transactions</Text>
                            <TouchableOpacity onPress={() => handleQuickAction('view_history')}>
                                <Text style={styles.viewAllText}>View All</Text>
                            </TouchableOpacity>
                        </View>
                        {dashboard.recentTransactions.slice(0, 5).map(renderTransactionItem)}
                    </View>
                )}

                {renderLinkedAccounts(dashboard.linkedAccounts)}
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1c1c1c',
        padding: 20,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        marginTop: 16,
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
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
    content: {
        flex: 1,
        padding: 20,
    },
    balanceCard: {
        backgroundColor: '#2a2a2a',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#333333',
    },
    balanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    balanceLabel: {
        fontSize: 16,
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
    balanceAmount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 16,
    },
    balanceDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    balanceDetailItem: {
        alignItems: 'center',
    },
    balanceDetailLabel: {
        fontSize: 12,
        color: '#cccccc',
        marginBottom: 4,
    },
    balanceDetailValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    quickActionsSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 16,
    },
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    quickActionCard: {
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        padding: 16,
        width: '48%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333333',
    },
    quickActionCardDisabled: {
        opacity: 0.5,
    },
    quickActionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ffffff',
        marginTop: 8,
        textAlign: 'center',
    },
    quickActionTitleDisabled: {
        color: '#666666',
    },
    quickActionDescription: {
        fontSize: 12,
        color: '#cccccc',
        marginTop: 4,
        textAlign: 'center',
    },
    quickActionDescriptionDisabled: {
        color: '#666666',
    },
    verificationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        marginTop: 8,
    },
    verificationText: {
        fontSize: 10,
        color: '#ffffff',
        marginLeft: 2,
        fontWeight: '600',
    },
    transactionsSection: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    viewAllText: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '600',
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#333333',
    },
    transactionIcon: {
        marginRight: 12,
    },
    transactionDetails: {
        flex: 1,
    },
    transactionDescription: {
        fontSize: 16,
        color: '#ffffff',
        fontWeight: '500',
    },
    transactionMethod: {
        fontSize: 12,
        color: '#cccccc',
        marginTop: 2,
    },
    transactionDate: {
        fontSize: 12,
        color: '#666666',
        marginTop: 2,
    },
    transactionAmount: {
        alignItems: 'flex-end',
    },
    transactionAmountText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    linkedAccountsSection: {
        marginBottom: 24,
    },
    linkedAccountsList: {
        gap: 8,
    },
    accountItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#333333',
    },
    accountDetails: {
        flex: 1,
        marginLeft: 12,
    },
    accountName: {
        fontSize: 16,
        color: '#ffffff',
        fontWeight: '500',
    },
    accountNumber: {
        fontSize: 14,
        color: '#cccccc',
        marginTop: 2,
    },
});
