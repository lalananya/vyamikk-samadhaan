import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
    Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

interface ConsentItem {
    id: string;
    title: string;
    description: string;
    required: boolean;
    checked: boolean;
    link?: string;
}

export default function ConsentScreen() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [consentItems, setConsentItems] = useState<ConsentItem[]>([
        {
            id: 'terms',
            title: 'Terms of Service',
            description: 'I agree to the Terms of Service and understand my rights and responsibilities.',
            required: true,
            checked: false,
            link: 'https://example.com/terms',
        },
        {
            id: 'privacy',
            title: 'Privacy Policy',
            description: 'I understand how my data will be collected, used, and protected.',
            required: true,
            checked: false,
            link: 'https://example.com/privacy',
        },
        {
            id: 'data_storage',
            title: 'Data Storage',
            description: 'I consent to storing my profile data locally and on secure servers.',
            required: true,
            checked: false,
        },
        {
            id: 'notifications',
            title: 'Push Notifications',
            description: 'I agree to receive important updates and notifications about my work.',
            required: false,
            checked: false,
        },
        {
            id: 'analytics',
            title: 'Usage Analytics',
            description: 'I consent to anonymous usage data collection to improve the app.',
            required: false,
            checked: false,
        },
    ]);

    const handleConsentToggle = (id: string) => {
        setConsentItems(prev =>
            prev.map(item =>
                item.id === id ? { ...item, checked: !item.checked } : item
            )
        );
    };

    const handleContinue = async () => {
        // Check if all required consents are given
        const requiredConsents = consentItems.filter(item => item.required);
        const allRequiredChecked = requiredConsents.every(item => item.checked);

        if (!allRequiredChecked) {
            Alert.alert(
                'Required Consents',
                'Please accept all required consents to continue.',
                [{ text: 'OK' }]
            );
            return;
        }

        setIsLoading(true);
        try {
            // Convert consent items to backend format
            const consentData = {
                termsOfService: {
                    accepted: consentItems.find(item => item.id === 'terms')?.checked || false,
                    acceptedAt: new Date().toISOString(),
                    version: '1.0'
                },
                privacyPolicy: {
                    accepted: consentItems.find(item => item.id === 'privacy')?.checked || false,
                    acceptedAt: new Date().toISOString(),
                    version: '1.0'
                },
                personalInfo: {
                    name: true, // Required for attendance system
                    email: false,
                    phone: true, // Required for attendance system
                    userId: true
                },
                appActivity: {
                    interactions: true,
                    searchHistory: false,
                    userGeneratedContent: false,
                    otherActions: true
                },
                messages: {
                    inAppMessages: true
                },
                audio: {
                    voiceRecordings: false,
                    audioFiles: false
                },
                location: {
                    approximateLocation: true, // Required for attendance tracking
                    preciseLocation: false,
                    geofencing: true
                },
                media: {
                    photos: true,
                    videos: false
                },
                contacts: {
                    contacts: false
                },
                deviceInfo: {
                    deviceIds: true,
                    crashLogs: true,
                    diagnostics: true
                },
                notifications: {
                    push: consentItems.find(item => item.id === 'notifications')?.checked || false,
                    email: false,
                    sms: false
                },
                analytics: {
                    usageAnalytics: consentItems.find(item => item.id === 'analytics')?.checked || false,
                    performanceAnalytics: true,
                    marketingAnalytics: false
                },
                dataRetention: {
                    profileData: consentItems.find(item => item.id === 'data_storage')?.checked || false,
                    attendanceData: true, // Required for attendance system
                    locationData: true, // Required for attendance system
                    mediaData: true
                }
            };

            // For development, skip server call and just log the consent data
            console.log('Consent preferences (dev mode):', consentData);
            
            // In production, you would send this to the server:
            // const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE || 'http://192.168.29.242:4001/api/v1'}/consent/update`, {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //         'Authorization': `Bearer ${await getToken()}`
            //     },
            //     body: JSON.stringify(consentData)
            // });

            // Navigate to profile wizard
            router.push('/profile-wizard');
        } catch (error) {
            console.error('Error saving consent preferences:', error);
            // In development, continue anyway even if there's an error
            console.log('Continuing to profile wizard despite error (dev mode)');
            router.push('/profile-wizard');
        } finally {
            setIsLoading(false);
        }
    };

    const getToken = async () => {
        try {
            const { getToken } = await import('../src/storage/tokens');
            return await getToken();
        } catch (error) {
            console.error('Error getting token:', error);
            return null;
        }
    };

    const handleBack = () => {
        router.back();
    };

    const handleOpenLink = async (url: string) => {
        try {
            await Linking.openURL(url);
        } catch (error) {
            console.error('Error opening link:', error);
            Alert.alert('Error', 'Could not open the link. Please try again.');
        }
    };

    const requiredCount = consentItems.filter(item => item.required).length;
    const checkedRequiredCount = consentItems.filter(item => item.required && item.checked).length;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" backgroundColor="#000000" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Welcome & Consent</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Progress Indicator */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '0%' }]} />
                    </View>
                    <Text style={styles.progressText}>Step 0 of 6</Text>
                </View>

                {/* Title Section */}
                <View style={styles.titleSection}>
                    <Text style={styles.title}>Welcome to Vyaamikk Samadhaan!</Text>
                    <Text style={styles.subtitle}>
                        Before we create your profile, please review and accept our terms and privacy policies.
                    </Text>
                </View>

                {/* Consent Items */}
                <View style={styles.consentSection}>
                    {consentItems.map((item) => (
                        <View key={item.id} style={styles.consentItem}>
                            <TouchableOpacity
                                style={styles.consentHeader}
                                onPress={() => handleConsentToggle(item.id)}
                            >
                                <View style={styles.checkboxContainer}>
                                    <View style={[
                                        styles.checkbox,
                                        item.checked && styles.checkboxChecked,
                                        item.required && styles.checkboxRequired
                                    ]}>
                                        {item.checked && (
                                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                                        )}
                                    </View>
                                </View>
                                <View style={styles.consentContent}>
                                    <View style={styles.consentTitleRow}>
                                        <Text style={[
                                            styles.consentTitle,
                                            item.required && styles.consentTitleRequired
                                        ]}>
                                            {item.title}
                                            {item.required && ' *'}
                                        </Text>
                                        {item.link && (
                                            <TouchableOpacity
                                                onPress={() => handleOpenLink(item.link!)}
                                                style={styles.linkButton}
                                            >
                                                <Ionicons name="open-outline" size={16} color="#4F46E5" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <Text style={styles.consentDescription}>
                                        {item.description}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>

                {/* Summary */}
                <View style={styles.summarySection}>
                    <Text style={styles.summaryText}>
                        {checkedRequiredCount} of {requiredCount} required consents accepted
                    </Text>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.continueButton,
                        checkedRequiredCount < requiredCount && styles.continueButtonDisabled
                    ]}
                    onPress={handleContinue}
                    disabled={checkedRequiredCount < requiredCount || isLoading}
                >
                    <Text style={styles.continueButtonText}>
                        {isLoading ? 'Processing...' : 'Continue to Profile Creation'}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1F2937',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    placeholder: {
        width: 40,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
    },
    progressContainer: {
        marginVertical: 24,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#1F2937',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4F46E5',
    },
    progressText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 8,
    },
    titleSection: {
        marginBottom: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#9CA3AF',
        lineHeight: 24,
    },
    consentSection: {
        marginBottom: 24,
    },
    consentItem: {
        backgroundColor: '#1F2937',
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
    },
    consentHeader: {
        flexDirection: 'row',
        padding: 16,
    },
    checkboxContainer: {
        marginRight: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#6B7280',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#4F46E5',
        borderColor: '#4F46E5',
    },
    checkboxRequired: {
        borderColor: '#F59E0B',
    },
    consentContent: {
        flex: 1,
    },
    consentTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    consentTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        flex: 1,
    },
    consentTitleRequired: {
        color: '#F59E0B',
    },
    linkButton: {
        padding: 4,
    },
    consentDescription: {
        fontSize: 14,
        color: '#9CA3AF',
        lineHeight: 20,
    },
    summarySection: {
        backgroundColor: '#1F2937',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    summaryText: {
        fontSize: 14,
        color: '#D1D5DB',
        textAlign: 'center',
    },
    footer: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#1F2937',
    },
    continueButton: {
        backgroundColor: '#4F46E5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
    },
    continueButtonDisabled: {
        backgroundColor: '#374151',
        opacity: 0.6,
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
