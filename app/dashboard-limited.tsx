import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function LimitedDashboard() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleCreateProfile = async () => {
        setIsLoading(true);
        try {
            router.push('/consent');
        } catch (error) {
            console.error('Error navigating to profile creation:', error);
            Alert.alert('Error', 'Failed to start profile creation. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        // Clear tokens and navigate to login
                        // In a real app, you'd clear AsyncStorage and reset state
                        router.replace('/login');
                    }
                }
            ]
        );
    };

    const limitedFeatures = [
        {
            icon: 'person-outline',
            title: 'Profile',
            description: 'Complete your profile to access all features',
            locked: true,
        },
        {
            icon: 'people-outline',
            title: 'Team',
            description: 'Connect with team members',
            locked: true,
        },
        {
            icon: 'analytics-outline',
            title: 'Analytics',
            description: 'View your work insights',
            locked: true,
        },
        {
            icon: 'card-outline',
            title: 'Payments & Cash',
            description: 'Manage payments and cash acknowledgments',
            locked: false,
            route: '/payments',
        },
        {
            icon: 'settings-outline',
            title: 'Settings',
            description: 'App preferences and configuration',
            locked: false,
        },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" backgroundColor="#000000" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Limited Access</Text>
                    <Text style={styles.headerSubtitle}>Complete your profile for full access</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Welcome Banner */}
                <View style={styles.welcomeBanner}>
                    <View style={styles.welcomeIcon}>
                        <Ionicons name="information-circle" size={32} color="#F59E0B" />
                    </View>
                    <View style={styles.welcomeContent}>
                        <Text style={styles.welcomeTitle}>Welcome to Vyaamikk Samadhaan!</Text>
                        <Text style={styles.welcomeDescription}>
                            You're currently in limited access mode. Complete your profile to unlock all features and get the most out of your experience.
                        </Text>
                    </View>
                </View>

                {/* Create Profile CTA */}
                <View style={styles.ctaSection}>
                    <TouchableOpacity
                        style={[styles.ctaButton, isLoading && styles.buttonDisabled]}
                        onPress={handleCreateProfile}
                        disabled={isLoading}
                    >
                        <Ionicons name="person-add" size={20} color="#FFFFFF" />
                        <Text style={styles.ctaButtonText}>
                            {isLoading ? 'Starting...' : 'Complete My Profile'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Features Grid */}
                <View style={styles.featuresSection}>
                    <Text style={styles.featuresTitle}>Available Features</Text>
                    <View style={styles.featuresGrid}>
                        {limitedFeatures.map((feature, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.featureCard,
                                    feature.locked && styles.featureCardLocked
                                ]}
                                onPress={() => {
                                    if (feature.locked) {
                                        Alert.alert(
                                            'Feature Locked',
                                            'Complete your profile to access this feature.',
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                { text: 'Complete Profile', onPress: handleCreateProfile }
                                            ]
                                        );
                                    } else if (feature.route) {
                                        router.push(feature.route);
                                    } else if (feature.title === 'Settings') {
                                        router.push('/settings');
                                    }
                                }}
                            >
                                <View style={styles.featureIcon}>
                                    <Ionicons
                                        name={feature.icon as any}
                                        size={24}
                                        color={feature.locked ? '#6B7280' : '#4F46E5'}
                                    />
                                    {feature.locked && (
                                        <View style={styles.lockIcon}>
                                            <Ionicons name="lock-closed" size={12} color="#6B7280" />
                                        </View>
                                    )}
                                </View>
                                <Text style={[
                                    styles.featureTitle,
                                    feature.locked && styles.featureTitleLocked
                                ]}>
                                    {feature.title}
                                </Text>
                                <Text style={styles.featureDescription}>
                                    {feature.description}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Benefits Reminder */}
                <View style={styles.benefitsSection}>
                    <Text style={styles.benefitsTitle}>Why complete your profile?</Text>
                    <View style={styles.benefitsList}>
                        <View style={styles.benefitItem}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={styles.benefitText}>Access all app features</Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={styles.benefitText}>Connect with your team</Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={styles.benefitText}>Track your progress</Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={styles.benefitText}>Get personalized insights</Text>
                        </View>
                    </View>
                </View>
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
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 2,
    },
    logoutButton: {
        padding: 8,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingVertical: 24,
    },
    welcomeBanner: {
        backgroundColor: '#1F2937',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    welcomeIcon: {
        marginRight: 16,
        marginTop: 4,
    },
    welcomeContent: {
        flex: 1,
    },
    welcomeTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    welcomeDescription: {
        fontSize: 14,
        color: '#D1D5DB',
        lineHeight: 20,
    },
    ctaSection: {
        marginBottom: 32,
    },
    ctaButton: {
        backgroundColor: '#4F46E5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    ctaButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    featuresSection: {
        marginBottom: 32,
    },
    featuresTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 16,
    },
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    featureCard: {
        backgroundColor: '#1F2937',
        borderRadius: 12,
        padding: 16,
        width: '48%',
        alignItems: 'center',
    },
    featureCardLocked: {
        opacity: 0.6,
    },
    featureIcon: {
        position: 'relative',
        marginBottom: 8,
    },
    lockIcon: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#000000',
        borderRadius: 8,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 4,
    },
    featureTitleLocked: {
        color: '#6B7280',
    },
    featureDescription: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 16,
    },
    benefitsSection: {
        backgroundColor: '#1F2937',
        borderRadius: 16,
        padding: 20,
    },
    benefitsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 16,
    },
    benefitsList: {
        gap: 12,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    benefitText: {
        fontSize: 14,
        color: '#D1D5DB',
        marginLeft: 12,
    },
});
