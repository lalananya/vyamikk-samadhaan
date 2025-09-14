import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Clipboard,
} from 'react-native';
import { router } from 'expo-router';
import { useNavigation } from '../src/contexts/NavigationContext';
import NavigationHeader from '../src/components/NavigationHeader';
import { profileState } from '../src/state/ProfileState';
import { ProfileData } from '../src/types/Profile';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileHome() {
    const navigation = useNavigation();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            await profileState.initialize();
            const profileData = profileState.getProfile();
            setProfile(profileData);
        } catch (error) {
            console.error('Failed to load profile:', error);
            Alert.alert('Error', 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (section: string) => {
        // Navigate to profile wizard with specific step
        router.push('/profile-wizard');
    };

    const handleShare = () => {
        Alert.alert('Share Profile', 'Share functionality will be implemented soon');
    };

    const handleExport = () => {
        if (profile) {
            const exportData = {
                ...profile,
                exportedAt: new Date().toISOString(),
            };
            Alert.alert('Export Profile', `Profile data exported:\n\n${JSON.stringify(exportData, null, 2)}`);
        }
    };

    const copyUserId = async () => {
        try {
            await Clipboard.setString(profile?.id || '');
            Alert.alert('Copied', 'User ID copied to clipboard');
        } catch (error) {
            console.error('Failed to copy user ID:', error);
            Alert.alert('Error', 'Failed to copy user ID');
        }
    };

    const handleLogout = async () => {
        try {
            // Clear profile data
            await profileState.clearDraft();
            navigation.goToLogin();
        } catch (error) {
            console.error('Failed to logout:', error);
            navigation.goToLogin();
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <NavigationHeader
                    title="Profile"
                    showBackButton={true}
                    onBackPress={() => router.back()}
                />
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.container}>
                <NavigationHeader
                    title="Profile"
                    showBackButton={true}
                    onBackPress={() => router.back()}
                />
                <View style={styles.emptyContainer}>
                    <Ionicons name="person-add" size={80} color="#666666" />
                    <Text style={styles.emptyTitle}>No Profile Found</Text>
                    <Text style={styles.emptyDescription}>
                        Create your profile to get started
                    </Text>
                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={() => router.push('/profile-wizard')}
                    >
                        <Text style={styles.createButtonText}>Create Profile</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <NavigationHeader
                title="Profile"
                showBackButton={true}
                onBackPress={() => router.back()}
                rightComponent={
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                    >
                        <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>
                }
            />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        {profile.profilePhoto ? (
                            <View style={styles.avatarImage}>
                                <Text style={styles.avatarText}>📷</Text>
                            </View>
                        ) : (
                            <Ionicons name="person" size={60} color="#007AFF" />
                        )}
                    </View>
                    <Text style={styles.profileName}>
                        {profile.displayName || profile.fullName}
                    </Text>
                    <Text style={styles.profileRole}>
                        {profile.role} • {profile.department || 'No Department'}
                    </Text>
                    <Text style={styles.profileLocation}>
                        📍 {profile.primaryLocation?.label || 'No Location'}
                    </Text>
                </View>

                {/* Completeness Meter */}
                <View style={styles.completenessCard}>
                    <View style={styles.completenessHeader}>
                        <Text style={styles.completenessTitle}>Profile Completeness</Text>
                        <Text style={styles.completenessPercentage}>
                            {profile.completionPercentage}%
                        </Text>
                    </View>
                    <View style={styles.completenessBar}>
                        <View
                            style={[
                                styles.completenessFill,
                                { width: `${profile.completionPercentage}%` },
                            ]}
                        />
                    </View>
                    {profile.completionPercentage < 100 && (
                        <Text style={styles.completenessHint}>
                            Add more details to reach 100%
                        </Text>
                    )}
                </View>

                {/* Action List */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.actionItem}
                        onPress={() => handleEdit('basic')}
                    >
                        <View style={styles.actionIcon}>
                            <Ionicons name="person" size={24} color="#007AFF" />
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle}>Basic Info</Text>
                            <Text style={styles.actionSubtitle}>
                                {profile.fullName} • {profile.displayName || 'No display name'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#666666" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionItem}
                        onPress={() => handleEdit('work')}
                    >
                        <View style={styles.actionIcon}>
                            <Ionicons name="briefcase" size={24} color="#007AFF" />
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle}>Work Details</Text>
                            <Text style={styles.actionSubtitle}>
                                {profile.shiftPreference} • {profile.skills.length} skills
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#666666" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionItem}
                        onPress={() => handleEdit('contact')}
                    >
                        <View style={styles.actionIcon}>
                            <Ionicons name="call" size={24} color="#007AFF" />
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle}>Contact & Identity</Text>
                            <Text style={styles.actionSubtitle}>
                                {profile.phone} • {profile.emergencyContact ? 'Emergency contact added' : 'No emergency contact'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#666666" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionItem}
                        onPress={() => handleEdit('preferences')}
                    >
                        <View style={styles.actionIcon}>
                            <Ionicons name="settings" size={24} color="#007AFF" />
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle}>Preferences</Text>
                            <Text style={styles.actionSubtitle}>
                                {profile.language} • {profile.notifications.attendanceReminders ? 'Notifications ON' : 'Notifications OFF'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#666666" />
                    </TouchableOpacity>
                </View>

                {/* Share Profile */}
                <View style={styles.shareCard}>
                    <View style={styles.shareHeader}>
                        <Ionicons name="share" size={24} color="#007AFF" />
                        <Text style={styles.shareTitle}>Share Profile</Text>
                    </View>
                    <Text style={styles.shareDescription}>
                        Share your profile with colleagues or generate a QR code
                    </Text>
                    <TouchableOpacity
                        style={styles.shareButton}
                        onPress={handleShare}
                    >
                        <Text style={styles.shareButtonText}>Share Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* Support */}
                <View style={styles.supportCard}>
                    <Text style={styles.supportTitle}>Support</Text>
                    <TouchableOpacity
                        style={styles.supportItem}
                        onPress={copyUserId}
                    >
                        <Ionicons name="copy" size={20} color="#666666" />
                        <Text style={styles.supportItemText}>Copy User ID</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.supportItem}
                        onPress={handleExport}
                    >
                        <Ionicons name="download" size={20} color="#666666" />
                        <Text style={styles.supportItemText}>Export Profile</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#ffffff',
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 16,
        color: '#cccccc',
        textAlign: 'center',
        marginBottom: 32,
    },
    createButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        paddingHorizontal: 32,
        paddingVertical: 16,
    },
    createButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 24,
        paddingVertical: 20,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: 'rgba(0, 122, 255, 0.3)',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 60,
        backgroundColor: '#333333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 40,
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 4,
        textAlign: 'center',
    },
    profileRole: {
        fontSize: 16,
        color: '#007AFF',
        marginBottom: 4,
    },
    profileLocation: {
        fontSize: 14,
        color: '#cccccc',
    },
    completenessCard: {
        backgroundColor: '#111111',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
    },
    completenessHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    completenessTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    completenessPercentage: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    completenessBar: {
        height: 8,
        backgroundColor: '#333333',
        borderRadius: 4,
        marginBottom: 8,
    },
    completenessFill: {
        height: '100%',
        backgroundColor: '#007AFF',
        borderRadius: 4,
    },
    completenessHint: {
        fontSize: 12,
        color: '#999999',
    },
    actionsContainer: {
        backgroundColor: '#111111',
        borderRadius: 12,
        marginBottom: 24,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    actionContent: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 2,
    },
    actionSubtitle: {
        fontSize: 14,
        color: '#cccccc',
    },
    shareCard: {
        backgroundColor: '#111111',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
    },
    shareHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    shareTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginLeft: 8,
    },
    shareDescription: {
        fontSize: 14,
        color: '#cccccc',
        marginBottom: 16,
    },
    shareButton: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    shareButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    supportCard: {
        backgroundColor: '#111111',
        borderRadius: 12,
        padding: 20,
    },
    supportTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 16,
    },
    supportItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    supportItemText: {
        fontSize: 14,
        color: '#cccccc',
        marginLeft: 12,
    },
    logoutButton: {
        backgroundColor: '#ff4444',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    logoutButtonText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '500',
    },
});

