// Add Funds Screen - Based on Fintech Payments & Cash System Blueprint
// Version 1 Implementation

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PaymentMethod, FundSource } from '../src/types/FundManagement';
import { fundManagementService } from '../src/services/FundManagementService';
import { appState } from '../src/state/AppState';

export default function AddFundsScreen() {
    const [formData, setFormData] = useState({
        amount: '',
        currency: 'INR',
        method: 'credit_card' as PaymentMethod,
        source: 'card' as FundSource,
        description: '',
    });
    const [loading, setLoading] = useState(false);
    const [verificationRequired, setVerificationRequired] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');

    const user = appState.getUser();

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleMethodChange = (method: PaymentMethod) => {
        setFormData(prev => ({
            ...prev,
            method,
            source: method === 'credit_card' || method === 'debit_card' ? 'card' :
                method === 'bank_transfer_ach' ? 'ach' : 'cash'
        }));
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.amount.trim() || isNaN(parseFloat(formData.amount))) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        if (parseFloat(formData.amount) <= 0) {
            Alert.alert('Error', 'Amount must be greater than zero');
            return;
        }

        try {
            setLoading(true);

            const request = await fundManagementService.initiateAddFunds({
                amount: parseFloat(formData.amount),
                currency: formData.currency,
                method: formData.method,
                source: formData.source,
                description: formData.description || `Add funds via ${formData.method}`,
            });

            if (request.verificationRequired) {
                setVerificationRequired(true);
                Alert.alert(
                    'Verification Required',
                    `Please enter the verification code sent to your ${request.verificationMethod}`,
                    [{ text: 'OK' }]
                );
            } else {
                await processPayment(request.id);
            }
        } catch (error) {
            console.error('Add funds error:', error);
            Alert.alert('Error', 'Failed to initiate add funds request');
        } finally {
            setLoading(false);
        }
    };

    const processPayment = async (requestId: string) => {
        try {
            setLoading(true);

            const transaction = await fundManagementService.processAddFunds(
                requestId,
                verificationCode || undefined
            );

            if (transaction.status === 'settled') {
                Alert.alert(
                    'Success',
                    `Successfully added ${formData.currency} ${formData.amount} to your account`,
                    [
                        {
                            text: 'OK',
                            onPress: () => router.back()
                        }
                    ]
                );
            } else {
                Alert.alert('Error', transaction.failureReason || 'Payment processing failed');
            }
        } catch (error) {
            console.error('Payment processing error:', error);
            Alert.alert('Error', 'Failed to process payment');
        } finally {
            setLoading(false);
        }
    };

    const handleVerificationSubmit = async () => {
        if (!verificationCode.trim()) {
            Alert.alert('Error', 'Please enter verification code');
            return;
        }

        // Find the request ID (in real app, this would be stored in state)
        const requestId = 'temp-request-id'; // This would be the actual request ID
        await processPayment(requestId);
    };

    const formatCurrency = (amount: number, currency: string = 'INR') => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount);
    };

    const calculateFees = (amount: number, method: PaymentMethod) => {
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

        return { processingFee, networkFee, totalFees, netAmount };
    };

    const renderMethodSelector = () => (
        <View style={styles.section}>
            <Text style={styles.label}>Payment Method *</Text>
            <View style={styles.methodsContainer}>
                {[
                    {
                        key: 'credit_card',
                        label: 'Credit Card',
                        subtitle: 'Visa, Mastercard, Amex',
                        icon: 'card-outline',
                        color: '#007AFF'
                    },
                    {
                        key: 'debit_card',
                        label: 'Debit Card',
                        subtitle: 'Bank debit card',
                        icon: 'card-outline',
                        color: '#28a745'
                    },
                    {
                        key: 'bank_transfer_ach',
                        label: 'Bank Transfer',
                        subtitle: 'ACH transfer (1-3 days)',
                        icon: 'business-outline',
                        color: '#6f42c1'
                    },
                ].map((method) => (
                    <TouchableOpacity
                        key={method.key}
                        style={[
                            styles.methodCard,
                            formData.method === method.key && styles.methodCardSelected
                        ]}
                        onPress={() => handleMethodChange(method.key as PaymentMethod)}
                    >
                        <Ionicons
                            name={method.icon as any}
                            size={24}
                            color={formData.method === method.key ? method.color : '#666666'}
                        />
                        <View style={styles.methodText}>
                            <Text style={[
                                styles.methodTitle,
                                formData.method === method.key && { color: method.color }
                            ]}>
                                {method.label}
                            </Text>
                            <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
                        </View>
                        {formData.method === method.key && (
                            <Ionicons name="checkmark-circle" size={20} color={method.color} />
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderAmountInput = () => (
        <View style={styles.section}>
            <Text style={styles.label}>Amount *</Text>
            <View style={styles.amountContainer}>
                <TextInput
                    style={[styles.input, styles.amountInput]}
                    value={formData.amount}
                    onChangeText={(value) => handleInputChange('amount', value)}
                    placeholder="0.00"
                    placeholderTextColor="#666666"
                    keyboardType="numeric"
                />
                <View style={styles.currencyContainer}>
                    <Text style={styles.currencyText}>{formData.currency}</Text>
                </View>
            </View>
            {formData.amount && !isNaN(parseFloat(formData.amount)) && (
                <View style={styles.feeBreakdown}>
                    {(() => {
                        const fees = calculateFees(parseFloat(formData.amount), formData.method);
                        return (
                            <>
                                <View style={styles.feeRow}>
                                    <Text style={styles.feeLabel}>Amount</Text>
                                    <Text style={styles.feeValue}>
                                        {formatCurrency(parseFloat(formData.amount), formData.currency)}
                                    </Text>
                                </View>
                                {fees.processingFee > 0 && (
                                    <View style={styles.feeRow}>
                                        <Text style={styles.feeLabel}>Processing Fee</Text>
                                        <Text style={styles.feeValue}>
                                            {formatCurrency(fees.processingFee, formData.currency)}
                                        </Text>
                                    </View>
                                )}
                                {fees.networkFee > 0 && (
                                    <View style={styles.feeRow}>
                                        <Text style={styles.feeLabel}>Network Fee</Text>
                                        <Text style={styles.feeValue}>
                                            {formatCurrency(fees.networkFee, formData.currency)}
                                        </Text>
                                    </View>
                                )}
                                <View style={[styles.feeRow, styles.totalRow]}>
                                    <Text style={styles.totalLabel}>Total</Text>
                                    <Text style={styles.totalValue}>
                                        {formatCurrency(fees.netAmount, formData.currency)}
                                    </Text>
                                </View>
                            </>
                        );
                    })()}
                </View>
            )}
        </View>
    );

    const renderVerificationForm = () => (
        <View style={styles.section}>
            <Text style={styles.label}>Verification Code *</Text>
            <TextInput
                style={styles.input}
                value={verificationCode}
                onChangeText={setVerificationCode}
                placeholder="Enter verification code"
                placeholderTextColor="#666666"
                keyboardType="numeric"
                maxLength={6}
            />
            <Text style={styles.verificationNote}>
                We've sent a verification code to your registered phone number
            </Text>
        </View>
    );

    if (verificationRequired) {
        return (
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#ffffff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Verify Payment</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView style={styles.content}>
                    <View style={styles.verificationCard}>
                        <Ionicons name="shield-checkmark" size={48} color="#007AFF" />
                        <Text style={styles.verificationTitle}>Verification Required</Text>
                        <Text style={styles.verificationDescription}>
                            Please enter the verification code to complete your payment of{' '}
                            {formatCurrency(parseFloat(formData.amount), formData.currency)}
                        </Text>
                    </View>

                    {renderVerificationForm()}

                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleVerificationSubmit}
                        disabled={loading}
                    >
                        <Ionicons name="checkmark" size={20} color="#ffffff" />
                        <Text style={styles.submitButtonText}>
                            {loading ? 'Verifying...' : 'Verify & Complete Payment'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Funds</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.form}>
                    {renderAmountInput()}
                    {renderMethodSelector()}

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Description (Optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.description}
                            onChangeText={(value) => handleInputChange('description', value)}
                            placeholder="Add a note for this transaction"
                            placeholderTextColor="#666666"
                            multiline
                            numberOfLines={2}
                        />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        <Ionicons name="add-circle" size={20} color="#ffffff" />
                        <Text style={styles.submitButtonText}>
                            {loading ? 'Processing...' : 'Add Funds'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1c1c1c',
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
    },
    form: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
        color: '#ffffff',
        borderWidth: 1,
        borderColor: '#333333',
    },
    textArea: {
        height: 60,
        textAlignVertical: 'top',
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    amountInput: {
        flex: 1,
        marginRight: 12,
    },
    currencyContainer: {
        backgroundColor: '#333333',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#444444',
    },
    currencyText: {
        fontSize: 16,
        color: '#ffffff',
        fontWeight: '600',
    },
    feeBreakdown: {
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        padding: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#333333',
    },
    feeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    totalRow: {
        borderTopWidth: 1,
        borderTopColor: '#333333',
        paddingTop: 8,
        marginTop: 8,
    },
    feeLabel: {
        fontSize: 14,
        color: '#cccccc',
    },
    feeValue: {
        fontSize: 14,
        color: '#ffffff',
        fontWeight: '500',
    },
    totalLabel: {
        fontSize: 16,
        color: '#ffffff',
        fontWeight: '600',
    },
    totalValue: {
        fontSize: 16,
        color: '#ffffff',
        fontWeight: 'bold',
    },
    methodsContainer: {
        gap: 12,
    },
    methodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333333',
    },
    methodCardSelected: {
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderColor: '#007AFF',
    },
    methodText: {
        flex: 1,
        marginLeft: 12,
    },
    methodTitle: {
        fontSize: 16,
        color: '#ffffff',
        fontWeight: '600',
        marginBottom: 2,
    },
    methodSubtitle: {
        fontSize: 12,
        color: '#cccccc',
    },
    verificationCard: {
        backgroundColor: '#2a2a2a',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#333333',
    },
    verificationTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        marginTop: 16,
        marginBottom: 8,
    },
    verificationDescription: {
        fontSize: 14,
        color: '#cccccc',
        textAlign: 'center',
        lineHeight: 20,
    },
    verificationNote: {
        fontSize: 12,
        color: '#cccccc',
        marginTop: 8,
        textAlign: 'center',
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#007AFF',
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 20,
    },
    submitButtonDisabled: {
        backgroundColor: '#666666',
    },
    submitButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});
