import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileData } from '../../types/Profile';

interface ComplianceStepProps {
    data: Partial<ProfileData>;
    onDataChange: (data: Partial<ProfileData>) => void;
    mode: 'self' | 'admin';
}

const DOCUMENT_TYPES = [
    { type: 'Aadhaar', icon: 'card', description: '12-digit Aadhaar number' },
    { type: 'PAN', icon: 'document', description: '10-character PAN number' },
];

export default function ComplianceStep({ data, onDataChange, mode }: ComplianceStepProps) {
    const [idDocument, setIdDocument] = useState(data.idDocument);

    useEffect(() => {
        onDataChange({
            idDocument,
        });
    }, [idDocument]);

    const handleAddDocument = () => {
        Alert.alert(
            'Add ID Document',
            'Select document type',
            [
                { text: 'Aadhaar', onPress: () => handleDocumentType('Aadhaar') },
                { text: 'PAN', onPress: () => handleDocumentType('PAN') },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleDocumentType = (type: 'Aadhaar' | 'PAN') => {
        Alert.alert(
            `Add ${type}`,
            `This is a demo. In a real app, you would:\n\n1. Take a photo of your ${type}\n2. Extract the number using OCR\n3. Verify the document\n\nFor now, we'll simulate adding a ${type} number.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Simulate Add',
                    onPress: () => simulateDocumentAdd(type)
                },
            ]
        );
    };

    const simulateDocumentAdd = (type: 'Aadhaar' | 'PAN') => {
        const mockNumber = type === 'Aadhaar'
            ? '1234 5678 9012'
            : 'ABCDE1234F';

        const maskedNumber = type === 'Aadhaar'
            ? '**** **** 9012'
            : '****E1234F';

        setIdDocument({
            type,
            number: maskedNumber,
            addedAt: new Date().toISOString(),
        });

        Alert.alert(
            'Document Added',
            `${type} document has been added successfully.\n\nNumber: ${maskedNumber}\n\nNote: This is a demo simulation.`,
            [{ text: 'OK' }]
        );
    };

    const handleRemoveDocument = () => {
        Alert.alert(
            'Remove Document',
            'Are you sure you want to remove this ID document?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => setIdDocument(undefined)
                },
            ]
        );
    };

    const handleViewDocument = () => {
        if (idDocument) {
            Alert.alert(
                'ID Document Details',
                `Type: ${idDocument.type}\nNumber: ${idDocument.number}\nAdded: ${new Date(idDocument.addedAt).toLocaleDateString()}\n\nNote: This is a demo simulation.`,
                [{ text: 'OK' }]
            );
        }
    };

    return (
        <View style={styles.container}>
            {/* Header Section */}
            <View style={styles.headerSection}>
                <View style={styles.headerIcon}>
                    <Ionicons name="shield-checkmark" size={32} color="#007AFF" />
                </View>
                <Text style={styles.headerTitle}>Identity Verification</Text>
                <Text style={styles.headerSubtitle}>
                    Optional • Add your ID documents for verification
                </Text>
            </View>

            {/* Current Document Section */}
            {idDocument ? (
                <View style={styles.documentCard}>
                    <View style={styles.documentHeader}>
                        <View style={styles.documentIcon}>
                            <Ionicons
                                name={idDocument.type === 'Aadhaar' ? 'card' : 'document'}
                                size={24}
                                color="#007AFF"
                            />
                        </View>
                        <View style={styles.documentInfo}>
                            <Text style={styles.documentType}>{idDocument.type}</Text>
                            <Text style={styles.documentNumber}>{idDocument.number}</Text>
                            <Text style={styles.documentDate}>
                                Added {new Date(idDocument.addedAt).toLocaleDateString()}
                            </Text>
                        </View>
                        <View style={styles.documentActions}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={handleViewDocument}
                            >
                                <Ionicons name="eye" size={20} color="#007AFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.removeButton]}
                                onPress={handleRemoveDocument}
                            >
                                <Ionicons name="trash" size={20} color="#ff4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.documentStatus}>
                        <Ionicons name="checkmark-circle" size={16} color="#00ff00" />
                        <Text style={styles.statusText}>Document added successfully</Text>
                    </View>
                </View>
            ) : (
                <View style={styles.noDocumentCard}>
                    <Ionicons name="document-outline" size={48} color="#666666" />
                    <Text style={styles.noDocumentTitle}>No ID Document Added</Text>
                    <Text style={styles.noDocumentSubtitle}>
                        Add your Aadhaar or PAN for identity verification
                    </Text>
                </View>
            )}

            {/* Add Document Section */}
            <View style={styles.addDocumentSection}>
                <Text style={styles.sectionTitle}>Add ID Document</Text>
                <Text style={styles.sectionSubtitle}>
                    Choose the type of document you want to add
                </Text>

                <View style={styles.documentTypesContainer}>
                    {DOCUMENT_TYPES.map((docType) => (
                        <TouchableOpacity
                            key={docType.type}
                            style={styles.documentTypeButton}
                            onPress={() => handleDocumentType(docType.type as 'Aadhaar' | 'PAN')}
                        >
                            <View style={styles.documentTypeIcon}>
                                <Ionicons name={docType.icon as any} size={24} color="#007AFF" />
                            </View>
                            <View style={styles.documentTypeInfo}>
                                <Text style={styles.documentTypeName}>{docType.type}</Text>
                                <Text style={styles.documentTypeDescription}>
                                    {docType.description}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#666666" />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Information Section */}
            <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                    <Ionicons name="information-circle" size={20} color="#007AFF" />
                    <Text style={styles.infoTitle}>Why add ID documents?</Text>
                </View>
                <View style={styles.infoContent}>
                    <Text style={styles.infoText}>
                        • Verify your identity for security
                    </Text>
                    <Text style={styles.infoText}>
                        • Enable advanced features
                    </Text>
                    <Text style={styles.infoText}>
                        • Comply with company policies
                    </Text>
                    <Text style={styles.infoText}>
                        • Faster verification process
                    </Text>
                </View>
            </View>

            {/* Privacy Notice */}
            <View style={styles.privacyCard}>
                <View style={styles.privacyHeader}>
                    <Ionicons name="lock-closed" size={16} color="#00ff00" />
                    <Text style={styles.privacyTitle}>Your Privacy is Protected</Text>
                </View>
                <Text style={styles.privacyText}>
                    • Documents are encrypted and stored securely
                </Text>
                <Text style={styles.privacyText}>
                    • Only authorized personnel can access them
                </Text>
                <Text style={styles.privacyText}>
                    • Used only for verification purposes
                </Text>
                <Text style={styles.privacyText}>
                    • You can remove them anytime
                </Text>
            </View>

            {/* Demo Notice */}
            <View style={styles.demoCard}>
                <Ionicons name="warning" size={20} color="#ffa500" />
                <Text style={styles.demoText}>
                    This is a demo. No real documents are processed or stored.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: 32,
        paddingVertical: 20,
    },
    headerIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#cccccc',
        textAlign: 'center',
    },
    documentCard: {
        backgroundColor: '#111111',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#333333',
    },
    documentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    documentIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    documentInfo: {
        flex: 1,
    },
    documentType: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 4,
    },
    documentNumber: {
        fontSize: 16,
        color: '#007AFF',
        marginBottom: 2,
    },
    documentDate: {
        fontSize: 12,
        color: '#999999',
    },
    documentActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeButton: {
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
    },
    documentStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusText: {
        fontSize: 14,
        color: '#00ff00',
    },
    noDocumentCard: {
        backgroundColor: '#111111',
        borderRadius: 12,
        padding: 40,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#333333',
    },
    noDocumentTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
        marginTop: 16,
        marginBottom: 8,
    },
    noDocumentSubtitle: {
        fontSize: 14,
        color: '#cccccc',
        textAlign: 'center',
    },
    addDocumentSection: {
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
        marginBottom: 16,
    },
    documentTypesContainer: {
        gap: 12,
    },
    documentTypeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#222222',
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: '#333333',
    },
    documentTypeIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    documentTypeInfo: {
        flex: 1,
    },
    documentTypeName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 2,
    },
    documentTypeDescription: {
        fontSize: 14,
        color: '#cccccc',
    },
    infoCard: {
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 122, 255, 0.3)',
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginLeft: 8,
    },
    infoContent: {
        gap: 4,
    },
    infoText: {
        fontSize: 14,
        color: '#cccccc',
    },
    privacyCard: {
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 0, 0.3)',
    },
    privacyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    privacyTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ffffff',
        marginLeft: 8,
    },
    privacyText: {
        fontSize: 12,
        color: '#cccccc',
        marginBottom: 2,
    },
    demoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 165, 0, 0.1)',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 165, 0, 0.3)',
    },
    demoText: {
        fontSize: 12,
        color: '#ffa500',
        marginLeft: 8,
        flex: 1,
    },
});

