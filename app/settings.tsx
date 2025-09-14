import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Switch,
    Alert,
    Linking,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Clipboard from '@react-native-clipboard/clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppSettings {
    notifications: boolean;
    analytics: boolean;
    externalPreviews: boolean;
    darkMode: boolean;
    language: string;
    cacheSize: string;
    calendarIntegration: boolean;
    calendarProvider: string;
    attendanceReminders: boolean;
    shiftNotifications: boolean;
}

export default function Settings() {
    const router = useRouter();
    const [settings, setSettings] = useState<AppSettings>({
        notifications: true,
        analytics: false,
        externalPreviews: true,
        darkMode: true,
        language: 'en',
        cacheSize: '0 MB',
        calendarIntegration: false,
        calendarProvider: 'google',
        attendanceReminders: true,
        shiftNotifications: true
    });
    const [appVersion] = useState('1.0.0');
    const [buildNumber] = useState('100');

    useEffect(() => {
        loadSettings();
        calculateCacheSize();
    }, []);

    const loadSettings = async () => {
        try {
            const savedSettings = await AsyncStorage.getItem('app_settings');
            if (savedSettings) {
                setSettings(JSON.parse(savedSettings));
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const saveSettings = async (newSettings: AppSettings) => {
        try {
            await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
            setSettings(newSettings);
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    };

    const calculateCacheSize = async () => {
        try {
            // This is a simplified cache size calculation
            // In a real app, you'd calculate actual cache size
            const cacheSize = '12.5 MB';
            setSettings(prev => ({ ...prev, cacheSize }));
        } catch (error) {
            console.error('Error calculating cache size:', error);
        }
    };

    const handleBack = () => {
        router.back();
    };

    const handleSettingChange = (key: keyof AppSettings, value: any) => {
        const newSettings = { ...settings, [key]: value };
        saveSettings(newSettings);
    };

    const handleResetCache = () => {
        Alert.alert(
            'Reset Cache',
            'This will clear all cached images, files and data. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Clear cache logic here
                            await AsyncStorage.multiRemove([
                                'cached_images',
                                'cached_files',
                                'temp_data'
                            ]);
                            await calculateCacheSize();
                            Alert.alert('Success', 'Cache has been cleared successfully.');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to clear cache. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    const handleSendFeedback = () => {
        Alert.alert(
            'Send Feedback',
            'Choose how you\'d like to send feedback:',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Email', onPress: () => {
                        Linking.openURL('mailto:support@vyamikk.com?subject=App Feedback');
                    }
                },
                {
                    text: 'In-App', onPress: () => {
                        // Navigate to feedback form
                        router.push('/feedback');
                    }
                }
            ]
        );
    };

    const handleExportData = () => {
        Alert.alert(
            'Export Data',
            'This will create a file containing all your data that you can download.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Export', onPress: async () => {
                        try {
                            // Export data logic here
                            const userData = await AsyncStorage.getItem('user_data');
                            if (userData) {
                                await Clipboard.setStringAsync(userData);
                                Alert.alert('Success', 'Your data has been copied to clipboard.');
                            } else {
                                Alert.alert('No Data', 'No data found to export.');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to export data. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout', style: 'destructive', onPress: async () => {
                        try {
                            await AsyncStorage.multiRemove(['auth_token', 'user_data', 'app_settings']);
                            router.replace('/login');
                        } catch (error) {
                            console.error('Logout error:', error);
                            router.replace('/login');
                        }
                    }
                }
            ]
        );
    };

    const handleOpenPrivacyPolicy = () => {
        Linking.openURL('https://vyamikk.com/privacy');
    };

    const handleOpenTerms = () => {
        Linking.openURL('https://vyamikk.com/terms');
    };

    const handleOpenLicenses = () => {
        Alert.alert('Open Source Licenses', 'This would open the licenses screen in a real app.');
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Settings</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* General Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>General</Text>

                    <TouchableOpacity style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="person-outline" size={20} color="#9CA3AF" />
                            <Text style={styles.settingText}>Account Settings</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="globe-outline" size={20} color="#9CA3AF" />
                            <Text style={styles.settingText}>Show previews of text from external websites</Text>
                        </View>
                        <Switch
                            value={settings.externalPreviews}
                            onValueChange={(value) => handleSettingChange('externalPreviews', value)}
                            trackColor={{ false: '#374151', true: '#4F46E5' }}
                            thumbColor={settings.externalPreviews ? '#FFFFFF' : '#9CA3AF'}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="notifications-outline" size={20} color="#9CA3AF" />
                            <Text style={styles.settingText}>Push Notifications</Text>
                        </View>
                        <Switch
                            value={settings.notifications}
                            onValueChange={(value) => handleSettingChange('notifications', value)}
                            trackColor={{ false: '#374151', true: '#4F46E5' }}
                            thumbColor={settings.notifications ? '#FFFFFF' : '#9CA3AF'}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="analytics-outline" size={20} color="#9CA3AF" />
                            <Text style={styles.settingText}>Usage Analytics</Text>
                        </View>
                        <Switch
                            value={settings.analytics}
                            onValueChange={(value) => handleSettingChange('analytics', value)}
                            trackColor={{ false: '#374151', true: '#4F46E5' }}
                            thumbColor={settings.analytics ? '#FFFFFF' : '#9CA3AF'}
                        />
                    </TouchableOpacity>
                </View>

                {/* Notifications */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notifications</Text>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => router.push('/notification-permission')}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="notifications-outline" size={20} color="#9CA3AF" />
                            <View>
                                <Text style={styles.settingText}>Notification Settings</Text>
                                <Text style={styles.settingDescription}>Configure push notifications and alerts</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="time-outline" size={20} color="#9CA3AF" />
                            <Text style={styles.settingText}>Attendance Reminders</Text>
                        </View>
                        <Switch
                            value={settings.attendanceReminders}
                            onValueChange={(value) => handleSettingChange('attendanceReminders', value)}
                            trackColor={{ false: '#374151', true: '#4F46E5' }}
                            thumbColor={settings.attendanceReminders ? '#FFFFFF' : '#9CA3AF'}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
                            <Text style={styles.settingText}>Shift Notifications</Text>
                        </View>
                        <Switch
                            value={settings.shiftNotifications}
                            onValueChange={(value) => handleSettingChange('shiftNotifications', value)}
                            trackColor={{ false: '#374151', true: '#4F46E5' }}
                            thumbColor={settings.shiftNotifications ? '#FFFFFF' : '#9CA3AF'}
                        />
                    </TouchableOpacity>
                </View>

                {/* Calendar Integration */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Calendar Integration</Text>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => router.push('/calendar-integration')}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
                            <View>
                                <Text style={styles.settingText}>Calendar Settings</Text>
                                <Text style={styles.settingDescription}>Connect to Google, Microsoft, or device calendar</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="sync-outline" size={20} color="#9CA3AF" />
                            <Text style={styles.settingText}>Auto-sync Events</Text>
                        </View>
                        <Switch
                            value={settings.calendarIntegration}
                            onValueChange={(value) => handleSettingChange('calendarIntegration', value)}
                            trackColor={{ false: '#374151', true: '#4F46E5' }}
                            thumbColor={settings.calendarIntegration ? '#FFFFFF' : '#9CA3AF'}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="logo-google" size={20} color="#9CA3AF" />
                            <Text style={styles.settingText}>Calendar Provider</Text>
                        </View>
                        <View style={styles.settingRight}>
                            <Text style={styles.settingSubtext}>
                                {settings.calendarProvider === 'google' ? 'Google' :
                                    settings.calendarProvider === 'microsoft' ? 'Microsoft' : 'Device'}
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Troubleshooting */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Troubleshooting</Text>

                    <TouchableOpacity style={styles.settingItem} onPress={handleResetCache}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="layers-outline" size={20} color="#9CA3AF" />
                            <View>
                                <Text style={styles.settingText}>Reset cache</Text>
                                <Text style={styles.settingDescription}>Clear cached images, files and data</Text>
                            </View>
                        </View>
                        <Text style={styles.settingSubtext}>{settings.cacheSize}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="construct-outline" size={20} color="#9CA3AF" />
                            <View>
                                <Text style={styles.settingText}>Force stop</Text>
                                <Text style={styles.settingDescription}>Unsaved data may be lost</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem} onPress={handleSendFeedback}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="refresh-outline" size={20} color="#9CA3AF" />
                            <View>
                                <Text style={styles.settingText}>Send feedback and logs</Text>
                                <Text style={styles.settingDescription}>Let us know how we can improve</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/network-settings')}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="wifi-outline" size={20} color="#9CA3AF" />
                            <Text style={styles.settingText}>Network Settings</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="help-circle-outline" size={20} color="#9CA3AF" />
                            <View>
                                <Text style={styles.settingText}>Help Centre</Text>
                                <Text style={styles.settingDescription}>Support articles and tutorials</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {/* Privacy & Data */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Privacy & Data</Text>

                    <TouchableOpacity style={styles.settingItem} onPress={handleOpenPrivacyPolicy}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="document-text-outline" size={20} color="#9CA3AF" />
                            <View>
                                <Text style={styles.settingText}>Privacy policy</Text>
                                <Text style={styles.settingDescription}>How Vyaamikk collects and uses information</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem} onPress={handleOpenTerms}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="document-outline" size={20} color="#9CA3AF" />
                            <Text style={styles.settingText}>Terms of Service</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem} onPress={handleExportData}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="download-outline" size={20} color="#9CA3AF" />
                            <Text style={styles.settingText}>Export My Data</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {/* About */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About Vyaamikk Samadhaan</Text>

                    <TouchableOpacity style={styles.settingItem} onPress={handleOpenLicenses}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="code-outline" size={20} color="#9CA3AF" />
                            <View>
                                <Text style={styles.settingText}>Open-source licences</Text>
                                <Text style={styles.settingDescription}>Libraries that we use</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="information-circle-outline" size={20} color="#9CA3AF" />
                            <View>
                                <Text style={styles.settingText}>Version</Text>
                                <Text style={styles.settingDescription}>App version and build info</Text>
                            </View>
                        </View>
                        <Text style={styles.settingSubtext}>{appVersion} ({buildNumber})</Text>
                    </TouchableOpacity>
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </ScrollView>
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
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingVertical: 24,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 16,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: '#1F2937',
        marginBottom: 1,
        borderRadius: 8,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingText: {
        fontSize: 16,
        color: '#FFFFFF',
        marginLeft: 12,
        flex: 1,
    },
    settingDescription: {
        fontSize: 14,
        color: '#9CA3AF',
        marginLeft: 12,
        marginTop: 2,
    },
    settingSubtext: {
        fontSize: 14,
        color: '#6B7280',
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1F2937',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginTop: 24,
        gap: 8,
    },
    logoutText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '600',
    },
});