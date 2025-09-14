import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileData } from '../../types/Profile';

interface PreviewConfirmStepProps {
    data: Partial<ProfileData>;
    onDataChange: (data: Partial<ProfileData>) => void;
    mode: 'self' | 'admin';
    onComplete: () => void;
}

export default function PreviewConfirmStep({ data, onComplete }: PreviewConfirmStepProps) {
    const [isCompleting, setIsCompleting] = useState(false);

    const handleComplete = async () => {
        try {
            setIsCompleting(true);

            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 1500));

            onComplete();
        } catch (error) {
            console.error('Failed to complete profile:', error);
            Alert.alert('Error', 'Failed to complete profile creation');
        } finally {
            setIsCompleting(false);
        }
    };

    const handleEditSection = (section: string) => {
        Alert.alert(
            'Edit Profile',
            `To edit ${section}, go back to the previous steps and make your changes.`,
            [{ text: 'OK' }]
        );
    };

    const getCompletionPercentage = () => {
        let score = 0;
        const totalWeight = 5; // Total possible points (2 required + 3 recommended)

        // Required fields (2 points each)
        if (data.fullName) score += 2;
        if (data.role) score += 2;

        // Recommended fields (1 point each)
        if (data.profilePhoto) score += 1;
        if (data.email) score += 1;

        return Math.round((score / totalWeight) * 100);
    };

    const completionPercentage = getCompletionPercentage();

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <Ionicons name="checkmark-circle" size={32} color="#00ff00" />
                </View>
                <Text style={styles.headerTitle}>Review Your Profile</Text>
                <Text style={styles.headerSubtitle}>
                    Please review all information before completing your profile
                </Text>
            </View>

            {/* Completion Meter */}
            <View style={styles.completionCard}>
                <View style={styles.completionHeader}>
                    <Text style={styles.completionTitle}>Profile Completeness</Text>
                    <Text style={styles.completionPercentage}>{completionPercentage}%</Text>
                </View>
                <View style={styles.completionBar}>
                    <View
                        style={[
                            styles.completionFill,
                            { width: `${completionPercentage}%` },
                        ]}
                    />
                </View>
                {completionPercentage < 100 && (
                    <Text style={styles.completionHint}>
                        Add more details to reach 100% completion
                    </Text>
                )}
            </View>

            {/* Basic Info Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="person" size={20} color="#007AFF" />
                    <Text style={styles.sectionTitle}>Basic Information</Text>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditSection('Basic Information')}
                    >
                        <Ionicons name="pencil" size={16} color="#007AFF" />
                    </TouchableOpacity>
                </View>
                <View style={styles.sectionContent}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Full Name</Text>
                        <Text style={styles.infoValue}>{data.fullName || 'Not provided'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Display Name</Text>
                        <Text style={styles.infoValue}>{data.displayName || 'Not provided'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Profile Photo</Text>
                        <Text style={styles.infoValue}>
                            {data.profilePhoto ? 'Added' : 'Not added'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Work Details Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="briefcase" size={20} color="#007AFF" />
                    <Text style={styles.sectionTitle}>Work Details</Text>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditSection('Work Details')}
                    >
                        <Ionicons name="pencil" size={16} color="#007AFF" />
                    </TouchableOpacity>
                </View>
                <View style={styles.sectionContent}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Role</Text>
                        <Text style={styles.infoValue}>{data.role || 'Not provided'}</Text>
                    </View>
                </View>
            </View>

            {/* Contact & Identity Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="call" size={20} color="#007AFF" />
                    <Text style={styles.sectionTitle}>Contact & Identity</Text>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditSection('Contact & Identity')}
                    >
                        <Ionicons name="pencil" size={16} color="#007AFF" />
                    </TouchableOpacity>
                </View>
                <View style={styles.sectionContent}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Phone</Text>
                        <Text style={styles.infoValue}>{data.phone || 'Not provided'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Alternative Phone</Text>
                        <Text style={styles.infoValue}>{data.altPhone || 'Not provided'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Email</Text>
                        <Text style={styles.infoValue}>{data.email || 'Not provided'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Address</Text>
                        <Text style={styles.infoValue}>
                            {data.address || 'Not provided'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Compliance Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="shield-checkmark" size={20} color="#007AFF" />
                    <Text style={styles.sectionTitle}>Compliance</Text>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditSection('Compliance')}
                    >
                        <Ionicons name="pencil" size={16} color="#007AFF" />
                    </TouchableOpacity>
                </View>
                <View style={styles.sectionContent}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>ID Document</Text>
                        <Text style={styles.infoValue}>
                            {data.idDocument
                                ? `${data.idDocument.type} (${data.idDocument.number})`
                                : 'Not provided'
                            }
                        </Text>
                    </View>
                </View>
            </View>

            {/* Preferences Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="settings" size={20} color="#007AFF" />
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditSection('Preferences')}
                    >
                        <Ionicons name="pencil" size={16} color="#007AFF" />
                    </TouchableOpacity>
                </View>
                <View style={styles.sectionContent}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Notifications</Text>
                        <Text style={styles.infoValue}>
                            {data.notifications?.attendanceReminders ? 'ON' : 'OFF'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Privacy</Text>
                        <Text style={styles.infoValue}>
                            Phone {data.privacy?.hidePhoneFromCoworkers ? 'hidden' : 'visible'} to coworkers
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Language</Text>
                        <Text style={styles.infoValue}>
                            {data.language === 'EN' ? 'English' : 'हिन्दी'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Complete Button */}
            <View style={styles.completeSection}>
                <TouchableOpacity
                    style={[
                        styles.completeButton,
                        isCompleting && styles.completeButtonDisabled,
                    ]}
                    onPress={handleComplete}
                    disabled={isCompleting}
                >
                    {isCompleting ? (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.completeButtonText}>Creating Profile...</Text>
                        </View>
                    ) : (
                        <View style={styles.completeButtonContent}>
                            <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
                            <Text style={styles.completeButtonText}>Complete Profile</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <Text style={styles.completeNote}>
                    You can edit your profile anytime after completion
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
        alignItems: 'center',
        marginBottom: 24,
        paddingVertical: 20,
    },
    headerIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
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
    completionCard: {
        backgroundColor: '#111111',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
    },
    completionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    completionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    completionPercentage: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    completionBar: {
        height: 8,
        backgroundColor: '#333333',
        borderRadius: 4,
        marginBottom: 8,
    },
    completionFill: {
        height: '100%',
        backgroundColor: '#007AFF',
        borderRadius: 4,
    },
    completionHint: {
        fontSize: 12,
        color: '#999999',
    },
    section: {
        backgroundColor: '#111111',
        borderRadius: 12,
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
    },
    sectionTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginLeft: 12,
    },
    editButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionContent: {
        padding: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#222222',
    },
    infoLabel: {
        fontSize: 14,
        color: '#cccccc',
        flex: 1,
    },
    infoValue: {
        fontSize: 14,
        color: '#ffffff',
        flex: 1,
        textAlign: 'right',
    },
    completeSection: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    completeButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        padding: 16,
        width: '100%',
        alignItems: 'center',
        marginBottom: 12,
    },
    completeButtonDisabled: {
        backgroundColor: '#333333',
    },
    completeButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    completeButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    completeNote: {
        fontSize: 12,
        color: '#999999',
        textAlign: 'center',
    },
});
