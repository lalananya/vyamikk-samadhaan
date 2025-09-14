import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileData } from '../../types/Profile';

interface PreferencesStepProps {
    data: Partial<ProfileData>;
    onDataChange: (data: Partial<ProfileData>) => void;
    mode: 'self' | 'admin';
}

export default function PreferencesStep({ data, onDataChange, mode }: PreferencesStepProps) {
    const [privacy, setPrivacy] = useState(data.privacy || {
        hidePhoneFromCoworkers: false,
        hideEmailFromCoworkers: false,
        allowLocationTracking: true,
        allowPhotoSharing: true,
        allowProfileVisibility: true,
        allowAttendanceHistory: true,
        allowShiftSharing: false,
        allowPerformanceData: true,
    });

    useEffect(() => {
        onDataChange({
            privacy,
        });
    }, [privacy]);

    const handlePrivacyToggle = (key: keyof typeof privacy) => {
        setPrivacy(prev => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Privacy Controls</Text>
                <Text style={styles.subtitle}>
                    Control how your information is shared within the organization
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact Information</Text>

                <View style={styles.settingItem}>
                    <View style={styles.settingInfo}>
                        <Text style={styles.settingLabel}>Hide Phone from Coworkers</Text>
                        <Text style={styles.settingDescription}>
                            Keep your phone number private from other employees
                        </Text>
                    </View>
                    <Switch
                        value={privacy.hidePhoneFromCoworkers}
                        onValueChange={() => handlePrivacyToggle('hidePhoneFromCoworkers')}
                        trackColor={{ false: '#333333', true: '#007AFF' }}
                        thumbColor={privacy.hidePhoneFromCoworkers ? '#ffffff' : '#666666'}
                    />
                </View>

                <View style={styles.settingItem}>
                    <View style={styles.settingInfo}>
                        <Text style={styles.settingLabel}>Hide Email from Coworkers</Text>
                        <Text style={styles.settingDescription}>
                            Keep your email address private from other employees
                        </Text>
                    </View>
                    <Switch
                        value={privacy.hideEmailFromCoworkers}
                        onValueChange={() => handlePrivacyToggle('hideEmailFromCoworkers')}
                        trackColor={{ false: '#333333', true: '#007AFF' }}
                        thumbColor={privacy.hideEmailFromCoworkers ? '#ffffff' : '#666666'}
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Location & Tracking</Text>

                <View style={styles.settingItem}>
                    <View style={styles.settingInfo}>
                        <Text style={styles.settingLabel}>Allow Location Tracking</Text>
                        <Text style={styles.settingDescription}>
                            Required for attendance punch-in/out and shift management
                        </Text>
                    </View>
                    <Switch
                        value={privacy.allowLocationTracking}
                        onValueChange={() => handlePrivacyToggle('allowLocationTracking')}
                        trackColor={{ false: '#333333', true: '#007AFF' }}
                        thumbColor={privacy.allowLocationTracking ? '#ffffff' : '#666666'}
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Profile & Media</Text>

                <View style={styles.settingItem}>
                    <View style={styles.settingInfo}>
                        <Text style={styles.settingLabel}>Allow Photo Sharing</Text>
                        <Text style={styles.settingDescription}>
                            Let others see your profile photo in team directories
                        </Text>
                    </View>
                    <Switch
                        value={privacy.allowPhotoSharing}
                        onValueChange={() => handlePrivacyToggle('allowPhotoSharing')}
                        trackColor={{ false: '#333333', true: '#007AFF' }}
                        thumbColor={privacy.allowPhotoSharing ? '#ffffff' : '#666666'}
                    />
                </View>

                <View style={styles.settingItem}>
                    <View style={styles.settingInfo}>
                        <Text style={styles.settingLabel}>Make Profile Visible</Text>
                        <Text style={styles.settingDescription}>
                            Allow others to find and view your profile
                        </Text>
                    </View>
                    <Switch
                        value={privacy.allowProfileVisibility}
                        onValueChange={() => handlePrivacyToggle('allowProfileVisibility')}
                        trackColor={{ false: '#333333', true: '#007AFF' }}
                        thumbColor={privacy.allowProfileVisibility ? '#ffffff' : '#666666'}
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Work Data</Text>

                <View style={styles.settingItem}>
                    <View style={styles.settingInfo}>
                        <Text style={styles.settingLabel}>Share Attendance History</Text>
                        <Text style={styles.settingDescription}>
                            Allow supervisors to view your attendance records
                        </Text>
                    </View>
                    <Switch
                        value={privacy.allowAttendanceHistory}
                        onValueChange={() => handlePrivacyToggle('allowAttendanceHistory')}
                        trackColor={{ false: '#333333', true: '#007AFF' }}
                        thumbColor={privacy.allowAttendanceHistory ? '#ffffff' : '#666666'}
                    />
                </View>

                <View style={styles.settingItem}>
                    <View style={styles.settingInfo}>
                        <Text style={styles.settingLabel}>Share Shift Information</Text>
                        <Text style={styles.settingDescription}>
                            Allow others to see your shift schedule and availability
                        </Text>
                    </View>
                    <Switch
                        value={privacy.allowShiftSharing}
                        onValueChange={() => handlePrivacyToggle('allowShiftSharing')}
                        trackColor={{ false: '#333333', true: '#007AFF' }}
                        thumbColor={privacy.allowShiftSharing ? '#ffffff' : '#666666'}
                    />
                </View>

                <View style={styles.settingItem}>
                    <View style={styles.settingInfo}>
                        <Text style={styles.settingLabel}>Share Performance Data</Text>
                        <Text style={styles.settingDescription}>
                            Allow management to track your work performance metrics
                        </Text>
                    </View>
                    <Switch
                        value={privacy.allowPerformanceData}
                        onValueChange={() => handlePrivacyToggle('allowPerformanceData')}
                        trackColor={{ false: '#333333', true: '#007AFF' }}
                        thumbColor={privacy.allowPerformanceData ? '#ffffff' : '#666666'}
                    />
                </View>
            </View>

            <View style={styles.infoContainer}>
                <Ionicons name="information-circle" size={20} color="#007AFF" />
                <Text style={styles.infoText}>
                    These settings control how your information is shared within the organization.
                    Some features may be required for core app functionality.
                </Text>
            </View>
        </View>
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
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 16,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
    },
    settingInfo: {
        flex: 1,
        marginRight: 16,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#ffffff',
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 14,
        color: '#999999',
        lineHeight: 18,
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