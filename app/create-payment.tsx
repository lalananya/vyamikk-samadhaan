// Create Payment Request Screen
// Based on Vyaamikk Samadhaan Payments & Cash Acknowledgment Blueprint

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
import { PaymentRole, DisbursementMethod, AcknowledgmentType } from '../src/types/Payments';
import { paymentService } from '../src/services/PaymentService';
import { appState } from '../src/state/AppState';

export default function CreatePaymentScreen() {
    const [formData, setFormData] = useState({
        recipientId: '',
        recipientRole: 'employee' as PaymentRole,
        amount: '',
        currency: 'INR',
        description: '',
        disbursementMethod: 'cash_manual' as DisbursementMethod,
        acknowledgmentType: 'company_to_employee' as AcknowledgmentType,
    });
    const [loading, setLoading] = useState(false);

    const user = appState.getUser();

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.recipientId.trim()) {
            Alert.alert('Error', 'Please enter recipient ID');
            return;
        }
        if (!formData.amount.trim() || isNaN(parseFloat(formData.amount))) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        if (!formData.description.trim()) {
            Alert.alert('Error', 'Please enter a description');
            return;
        }

        try {
            setLoading(true);

            const paymentRequest = await paymentService.createPaymentRequest({
                recipientId: formData.recipientId,
                recipientRole: formData.recipientRole,
                amount: parseFloat(formData.amount),
                currency: formData.currency,
                description: formData.description,
                disbursementMethod: formData.disbursementMethod,
                acknowledgmentType: formData.acknowledgmentType,
            });

            Alert.alert(
                'Success',
                'Payment request created successfully',
                [
                    {
                        text: 'OK',
                        onPress: () => router.back()
                    }
                ]
            );
        } catch (error) {
            console.error('Payment creation error:', error);
            Alert.alert('Error', 'Failed to create payment request');
        } finally {
            setLoading(false);
        }
    };

    const renderRoleSelector = (field: 'recipientRole', title: string) => (
        <View style={styles.section}>
            <Text style={styles.label}>{title}</Text>
            <View style={styles.roleContainer}>
                {[
                    { key: 'employee', label: 'Employee', icon: 'person' },
                    { key: 'vendor', label: 'Vendor', icon: 'business' },
                    { key: 'company', label: 'Company', icon: 'storefront' },
                    { key: 'seviscr', label: 'Service Provider', icon: 'construct' },
                ].map((role) => (
                    <TouchableOpacity
                        key={role.key}
                        style={[
                            styles.roleOption,
                            formData[field] === role.key && styles.roleOptionSelected
                        ]}
                        onPress={() => handleInputChange(field, role.key)}
                    >
                        <Ionicons
                            name={role.icon as any}
                            size={20}
                            color={formData[field] === role.key ? '#007AFF' : '#666666'}
                        />
                        <Text style={[
                            styles.roleText,
                            formData[field] === role.key && styles.roleTextSelected
                        ]}>
                            {role.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderDisbursementSelector = () => (
        <View style={styles.section}>
            <Text style={styles.label}>Disbursement Method</Text>
            <View style={styles.optionsContainer}>
                {[
                    {
                        key: 'cash_manual',
                        label: 'Cash Manual',
                        subtitle: 'LFT/MPS/NEFT',
                        icon: 'card-outline'
                    },
                    {
                        key: 'cash_vault',
                        label: 'Cash Vault',
                        subtitle: 'Petty Cash',
                        icon: 'shield-outline'
                    },
                    {
                        key: 'escrow',
                        label: 'Escrow',
                        subtitle: 'Secure Escrow',
                        icon: 'lock-closed-outline'
                    },
                ].map((method) => (
                    <TouchableOpacity
                        key={method.key}
                        style={[
                            styles.optionCard,
                            formData.disbursementMethod === method.key && styles.optionCardSelected
                        ]}
                        onPress={() => handleInputChange('disbursementMethod', method.key)}
                    >
                        <Ionicons
                            name={method.icon as any}
                            size={24}
                            color={formData.disbursementMethod === method.key ? '#007AFF' : '#666666'}
                        />
                        <View style={styles.optionText}>
                            <Text style={[
                                styles.optionTitle,
                                formData.disbursementMethod === method.key && styles.optionTitleSelected
                            ]}>
                                {method.label}
                            </Text>
                            <Text style={styles.optionSubtitle}>{method.subtitle}</Text>
                        </View>
                        {formData.disbursementMethod === method.key && (
                            <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderAcknowledgmentSelector = () => (
        <View style={styles.section}>
            <Text style={styles.label}>Acknowledgment Type</Text>
            <View style={styles.optionsContainer}>
                {[
                    {
                        key: 'company_to_employee',
                        label: 'Company → Employee',
                        subtitle: 'Standard acknowledgment',
                        icon: 'business-outline'
                    },
                    {
                        key: 'company_to_company_dual',
                        label: 'Company → Company',
                        subtitle: 'Dual acknowledgment required',
                        icon: 'business-outline'
                    },
                    {
                        key: 'peer_to_peer_timestamped',
                        label: 'Peer → Peer',
                        subtitle: 'Time-stamped acknowledgment',
                        icon: 'people-outline'
                    },
                ].map((type) => (
                    <TouchableOpacity
                        key={type.key}
                        style={[
                            styles.optionCard,
                            formData.acknowledgmentType === type.key && styles.optionCardSelected
                        ]}
                        onPress={() => handleInputChange('acknowledgmentType', type.key)}
                    >
                        <Ionicons
                            name={type.icon as any}
                            size={24}
                            color={formData.acknowledgmentType === type.key ? '#007AFF' : '#666666'}
                        />
                        <View style={styles.optionText}>
                            <Text style={[
                                styles.optionTitle,
                                formData.acknowledgmentType === type.key && styles.optionTitleSelected
                            ]}>
                                {type.label}
                            </Text>
                            <Text style={styles.optionSubtitle}>{type.subtitle}</Text>
                        </View>
                        {formData.acknowledgmentType === type.key && (
                            <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Payment</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.form}>
                    {/* Recipient ID */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Recipient ID *</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.recipientId}
                            onChangeText={(value) => handleInputChange('recipientId', value)}
                            placeholder="Enter recipient ID or phone number"
                            placeholderTextColor="#666666"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Recipient Role */}
                    {renderRoleSelector('recipientRole', 'Recipient Role *')}

                    {/* Amount */}
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
                    </View>

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Description *</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.description}
                            onChangeText={(value) => handleInputChange('description', value)}
                            placeholder="Enter payment description"
                            placeholderTextColor="#666666"
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    {/* Disbursement Method */}
                    {renderDisbursementSelector()}

                    {/* Acknowledgment Type */}
                    {renderAcknowledgmentSelector()}

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        <Ionicons name="send" size={20} color="#ffffff" />
                        <Text style={styles.submitButtonText}>
                            {loading ? 'Creating...' : 'Create Payment Request'}
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
        height: 80,
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
    roleContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    roleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#2a2a2a',
        borderWidth: 1,
        borderColor: '#333333',
        minWidth: '45%',
    },
    roleOptionSelected: {
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderColor: '#007AFF',
    },
    roleText: {
        fontSize: 14,
        color: '#cccccc',
        marginLeft: 8,
    },
    roleTextSelected: {
        color: '#007AFF',
        fontWeight: '600',
    },
    optionsContainer: {
        gap: 12,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333333',
    },
    optionCardSelected: {
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderColor: '#007AFF',
    },
    optionText: {
        flex: 1,
        marginLeft: 12,
    },
    optionTitle: {
        fontSize: 16,
        color: '#ffffff',
        fontWeight: '600',
        marginBottom: 2,
    },
    optionTitleSelected: {
        color: '#007AFF',
    },
    optionSubtitle: {
        fontSize: 12,
        color: '#cccccc',
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

