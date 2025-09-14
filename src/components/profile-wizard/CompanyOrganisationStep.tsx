import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileData } from '../../types/Profile';

interface CompanyOrganisationStepProps {
    data: Partial<ProfileData>;
    onDataChange: (data: Partial<ProfileData>) => void;
    mode: 'self' | 'admin';
}

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli',
    'Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

export default function CompanyOrganisationStep({ data, onDataChange, mode }: CompanyOrganisationStepProps) {
    const [companyName, setCompanyName] = useState(data.roleDetails?.companyName || '');
    const [gstin, setGstin] = useState(data.roleDetails?.gstin || '');
    const [cin, setCin] = useState(data.roleDetails?.cin || '');
    const [udyamNumber, setUdyamNumber] = useState(data.roleDetails?.udyamNumber || '');
    const [registeredOffice, setRegisteredOffice] = useState(data.roleDetails?.registeredOffice || '');
    const [workAddress, setWorkAddress] = useState(data.roleDetails?.workAddress || '');

    useEffect(() => {
        onDataChange({
            roleDetails: {
                companyName,
                gstin,
                cin,
                udyamNumber,
                registeredOffice,
                workAddress,
            },
        });
    }, [companyName, gstin, cin, udyamNumber, registeredOffice, workAddress]);

    const validateGSTIN = (gstin: string) => {
        // GSTIN format: 2 digits state code + 10 digits PAN + 1 digit entity number + 1 digit Z + 1 digit checksum
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
        return gstinRegex.test(gstin);
    };

    const validateCIN = (cin: string) => {
        // CIN format: L/U + 2 digits state code + 4 digits year + 5 digits company type + 6 digits company number + 1 digit check digit
        const cinRegex = /^[LU][0-9]{2}[0-9]{4}[A-Z]{5}[0-9]{6}[0-9A-Z]{1}$/;
        return cinRegex.test(cin);
    };

    const validateUdyam = (udyam: string) => {
        // UDYAM format: UDYAM-XX-XX-XXXXXX (where X are digits)
        const udyamRegex = /^UDYAM-[0-9]{2}-[0-9]{2}-[0-9]{6}$/;
        return udyamRegex.test(udyam);
    };

    const handleGstinChange = (text: string) => {
        const upperText = text.toUpperCase();
        setGstin(upperText);
    };

    const handleCinChange = (text: string) => {
        const upperText = text.toUpperCase();
        setCin(upperText);
    };

    const handleUdyamChange = (text: string) => {
        const upperText = text.toUpperCase();
        setUdyamNumber(upperText);
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.title}>Company Details</Text>
                <Text style={styles.subtitle}>
                    Provide your company registration and business information
                </Text>
            </View>

            {/* Company Name */}
            <View style={styles.section}>
                <Text style={styles.label}>Company Name *</Text>
                <TextInput
                    style={styles.input}
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder="Enter company name"
                    placeholderTextColor="#666666"
                />
            </View>

            {/* GSTIN */}
            <View style={styles.section}>
                <Text style={styles.label}>GSTIN</Text>
                <Text style={styles.helperText}>
                    Format: 2 digits state code + 10 digits PAN + 1 digit entity + Z + 1 digit checksum
                </Text>
                <TextInput
                    style={[styles.input, gstin && !validateGSTIN(gstin) && styles.inputError]}
                    value={gstin}
                    onChangeText={handleGstinChange}
                    placeholder="e.g., 07AABCU9603R1ZX"
                    placeholderTextColor="#666666"
                    maxLength={15}
                />
                {gstin && !validateGSTIN(gstin) && (
                    <Text style={styles.errorText}>Invalid GSTIN format</Text>
                )}
            </View>

            {/* CIN */}
            <View style={styles.section}>
                <Text style={styles.label}>CIN (Company Identification Number)</Text>
                <Text style={styles.helperText}>
                    Required for Private Limited, Public Limited companies
                </Text>
                <TextInput
                    style={[styles.input, cin && !validateCIN(cin) && styles.inputError]}
                    value={cin}
                    onChangeText={handleCinChange}
                    placeholder="e.g., L12345MH2020PTC123456"
                    placeholderTextColor="#666666"
                    maxLength={21}
                />
                {cin && !validateCIN(cin) && (
                    <Text style={styles.errorText}>Invalid CIN format</Text>
                )}
            </View>

            {/* UDYAM Number */}
            <View style={styles.section}>
                <Text style={styles.label}>UDYAM Registration Number</Text>
                <Text style={styles.helperText}>
                    MSME registration number (if applicable)
                </Text>
                <TextInput
                    style={[styles.input, udyamNumber && !validateUdyam(udyamNumber) && styles.inputError]}
                    value={udyamNumber}
                    onChangeText={handleUdyamChange}
                    placeholder="e.g., UDYAM-UP-12-123456"
                    placeholderTextColor="#666666"
                    maxLength={15}
                />
                {udyamNumber && !validateUdyam(udyamNumber) && (
                    <Text style={styles.errorText}>Invalid UDYAM format</Text>
                )}
            </View>

            {/* Registered Office */}
            <View style={styles.section}>
                <Text style={styles.label}>Registered Office Address *</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={registeredOffice}
                    onChangeText={setRegisteredOffice}
                    placeholder="Enter complete registered office address"
                    placeholderTextColor="#666666"
                    multiline
                    numberOfLines={3}
                />
            </View>

            {/* Work Address */}
            <View style={styles.section}>
                <Text style={styles.label}>Work Address</Text>
                <Text style={styles.helperText}>
                    Primary business location (if different from registered office)
                </Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={workAddress}
                    onChangeText={setWorkAddress}
                    placeholder="Enter work address"
                    placeholderTextColor="#666666"
                    multiline
                    numberOfLines={3}
                />
            </View>

            <View style={styles.infoContainer}>
                <Ionicons name="information-circle" size={20} color="#007AFF" />
                <Text style={styles.infoText}>
                    All information provided will be verified during the approval process.
                    Ensure accuracy of registration numbers.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#cccccc',
        lineHeight: 22,
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
    helperText: {
        fontSize: 12,
        color: '#999999',
        marginBottom: 8,
        lineHeight: 16,
    },
    input: {
        backgroundColor: '#222222',
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
        color: '#ffffff',
        borderWidth: 1,
        borderColor: '#333333',
    },
    inputError: {
        borderColor: '#FF3B30',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    errorText: {
        fontSize: 12,
        color: '#FF3B30',
        marginTop: 4,
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderRadius: 8,
        padding: 16,
        marginTop: 24,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: '#007AFF',
        lineHeight: 20,
    },
});

