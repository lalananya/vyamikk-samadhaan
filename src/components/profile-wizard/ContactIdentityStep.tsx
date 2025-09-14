import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileData } from '../../types/Profile';

interface ContactIdentityStepProps {
    data: Partial<ProfileData>;
    onDataChange: (data: Partial<ProfileData>) => void;
    mode: 'self' | 'admin';
}

export default function ContactIdentityStep({ data, onDataChange, mode }: ContactIdentityStepProps) {
    const [phone, setPhone] = useState(data.phone || '');
    const [altPhone, setAltPhone] = useState(data.altPhone || '');
    const [email, setEmail] = useState(data.email || '');
    const [emergencyContact, setEmergencyContact] = useState(data.emergencyContact || { name: '', phone: '' });
    const [address, setAddress] = useState(data.address || '');

    useEffect(() => {
        onDataChange({
            phone,
            altPhone,
            email,
            emergencyContact,
            address,
        });
    }, [phone, altPhone, email, emergencyContact, address]);

    const validateEmail = (email: string): boolean => {
        if (!email.trim()) return true; // Optional field
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePhone = (phone: string): boolean => {
        if (!phone.trim()) return false;
        const phoneRegex = /^[+]?[0-9]{10,15}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    };

    const validateEmergencyContact = (): boolean => {
        if (!emergencyContact.name.trim() || !emergencyContact.phone.trim()) return false;
        return validatePhone(emergencyContact.phone);
    };

    const handleEmergencyContactNameChange = (name: string) => {
        setEmergencyContact({ ...emergencyContact, name });
    };

    const handleEmergencyContactPhoneChange = (phone: string) => {
        setEmergencyContact({ ...emergencyContact, phone });
    };

    const isEmergencyContactRequired = data.role === 'Worker' || data.role === 'Supervisor';

    return (
        <View style={styles.container}>
            {/* Primary Phone Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Phone Number</Text>
                <Text style={styles.sectionSubtitle}>
                    {mode === 'self' ? 'Your registered phone number' : 'Worker\'s phone number'}
                </Text>
                <TextInput
                    style={[
                        styles.textInput,
                        mode === 'self' && styles.textInputDisabled,
                        phone && !validatePhone(phone) && styles.textInputError,
                    ]}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Enter phone number"
                    placeholderTextColor="#666666"
                    keyboardType="phone-pad"
                    editable={mode === 'admin'}
                />
                {phone && !validatePhone(phone) && (
                    <Text style={styles.errorText}>
                        Enter a valid phone number (10-15 digits)
                    </Text>
                )}
                {mode === 'self' && (
                    <Text style={styles.helpText}>
                        This is your registered phone number from login
                    </Text>
                )}
            </View>

            {/* Alternative Phone Section */}
            <View style={styles.section}>
                <Text style={styles.inputLabel}>Alternative Phone</Text>
                <Text style={styles.sectionSubtitle}>Optional • Different from primary phone</Text>
                <TextInput
                    style={[
                        styles.textInput,
                        altPhone && !validatePhone(altPhone) && styles.textInputError,
                    ]}
                    value={altPhone}
                    onChangeText={setAltPhone}
                    placeholder="Enter alternative phone number"
                    placeholderTextColor="#666666"
                    keyboardType="phone-pad"
                />
                {altPhone && !validatePhone(altPhone) && (
                    <Text style={styles.errorText}>
                        Enter a valid phone number (10-15 digits)
                    </Text>
                )}
                {altPhone && phone && altPhone === phone && (
                    <Text style={styles.warningText}>
                        Alternative phone should be different from primary phone
                    </Text>
                )}
            </View>

            {/* Email Section */}
            <View style={styles.section}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <Text style={styles.sectionSubtitle}>Optional • For important notifications</Text>
                <TextInput
                    style={[
                        styles.textInput,
                        email && !validateEmail(email) && styles.textInputError,
                    ]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter email address"
                    placeholderTextColor="#666666"
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                {email && !validateEmail(email) && (
                    <Text style={styles.errorText}>
                        Enter a valid email address
                    </Text>
                )}
            </View>

            {/* Emergency Contact Section */}
            <View style={styles.section}>
                <Text style={styles.inputLabel}>
                    Emergency Contact {isEmergencyContactRequired && <Text style={styles.required}>*</Text>}
                </Text>
                <Text style={styles.sectionSubtitle}>
                    {isEmergencyContactRequired
                        ? 'Required for safety • Who should we contact in case of emergency?'
                        : 'Optional • Who should we contact in case of emergency?'
                    }
                </Text>

                <View style={styles.emergencyContactContainer}>
                    <TextInput
                        style={[
                            styles.textInput,
                            styles.emergencyInput,
                            emergencyContact.name && !emergencyContact.name.trim() && styles.textInputError,
                        ]}
                        value={emergencyContact.name}
                        onChangeText={handleEmergencyContactNameChange}
                        placeholder="Emergency contact name"
                        placeholderTextColor="#666666"
                        autoCapitalize="words"
                    />
                    <TextInput
                        style={[
                            styles.textInput,
                            styles.emergencyInput,
                            emergencyContact.phone && !validatePhone(emergencyContact.phone) && styles.textInputError,
                        ]}
                        value={emergencyContact.phone}
                        onChangeText={handleEmergencyContactPhoneChange}
                        placeholder="Emergency contact phone"
                        placeholderTextColor="#666666"
                        keyboardType="phone-pad"
                    />
                </View>

                {emergencyContact.name && emergencyContact.phone && !validateEmergencyContact() && (
                    <Text style={styles.errorText}>
                        Please provide both name and valid phone number
                    </Text>
                )}

                {isEmergencyContactRequired && (!emergencyContact.name || !emergencyContact.phone) && (
                    <Text style={styles.warningText}>
                        Emergency contact is recommended for your safety
                    </Text>
                )}
            </View>

            {/* Address Section */}
            <View style={styles.section}>
                <Text style={styles.inputLabel}>Address</Text>
                <Text style={styles.sectionSubtitle}>Optional • Your residential address</Text>
                <TextInput
                    style={[styles.textInput, styles.multilineInput]}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Enter your address"
                    placeholderTextColor="#666666"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                />
                <Text style={styles.helpText}>
                    Include street, city, state, and postal code
                </Text>
            </View>

            {/* Summary Card */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                    <Ionicons name="information-circle" size={20} color="#007AFF" />
                    <Text style={styles.summaryTitle}>Contact Summary</Text>
                </View>
                <View style={styles.summaryContent}>
                    <Text style={styles.summaryText}>
                        • Primary: {phone || 'Not provided'}
                    </Text>
                    {altPhone && (
                        <Text style={styles.summaryText}>
                            • Alternative: {altPhone}
                        </Text>
                    )}
                    {email && (
                        <Text style={styles.summaryText}>
                            • Email: {email}
                        </Text>
                    )}
                    {emergencyContact.name && emergencyContact.phone && (
                        <Text style={styles.summaryText}>
                            • Emergency: {emergencyContact.name} ({emergencyContact.phone})
                        </Text>
                    )}
                    {address && (
                        <Text style={styles.summaryText}>
                            • Address: {address.length > 50 ? `${address.substring(0, 50)}...` : address}
                        </Text>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#cccccc',
        marginBottom: 12,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 4,
    },
    required: {
        color: '#ff4444',
    },
    textInput: {
        backgroundColor: '#222222',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#ffffff',
        borderWidth: 1,
        borderColor: '#333333',
    },
    textInputDisabled: {
        backgroundColor: '#111111',
        color: '#666666',
    },
    textInputError: {
        borderColor: '#ff4444',
    },
    multilineInput: {
        height: 80,
    },
    emergencyInput: {
        marginBottom: 8,
    },
    emergencyContactContainer: {
        gap: 8,
    },
    errorText: {
        color: '#ff4444',
        fontSize: 12,
        marginTop: 4,
    },
    warningText: {
        color: '#ffa500',
        fontSize: 12,
        marginTop: 4,
    },
    helpText: {
        color: '#999999',
        fontSize: 12,
        marginTop: 4,
    },
    summaryCard: {
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 122, 255, 0.3)',
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginLeft: 8,
    },
    summaryContent: {
        gap: 4,
    },
    summaryText: {
        fontSize: 14,
        color: '#cccccc',
    },
});

