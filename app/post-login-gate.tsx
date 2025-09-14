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

export default function PostLoginGate() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleCreateProfile = async () => {
        setIsLoading(true);
        try {
            // Navigate directly to profile wizard
            router.push('/profile-wizard');
        } catch (error) {
            console.error('Error navigating to profile creation:', error);
            Alert.alert('Error', 'Failed to start profile creation. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAskMeLater = async () => {
        setIsLoading(true);
        try {
            // Navigate to main dashboard
            router.push('/dashboard');
        } catch (error) {
            console.error('Error navigating to dashboard:', error);
            Alert.alert('Error', 'Failed to access dashboard. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" backgroundColor="#000000" />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="person-add" size={64} color="#4F46E5" />
                    </View>
                    <Text style={styles.title}>Welcome to Vyaamikk Samadhaan</Text>
                    <Text style={styles.subtitle}>
                        Let's set up your profile to get the most out of your experience
                    </Text>
                </View>

                {/* Benefits Section */}
                <View style={styles.benefitsSection}>
                    <Text style={styles.benefitsTitle}>Complete your profile to:</Text>
                    <View style={styles.benefitItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.benefitText}>Access all features and tools</Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.benefitText}>Connect with your team members</Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.benefitText}>Track your work and progress</Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.benefitText}>Receive personalized insights</Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionSection}>
                    <TouchableOpacity
                        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                        onPress={handleCreateProfile}
                        disabled={isLoading}
                    >
                        <Ionicons name="person-add" size={20} color="#FFFFFF" />
                        <Text style={styles.primaryButtonText}>
                            {isLoading ? 'Starting...' : 'Create My Profile'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryButton, isLoading && styles.buttonDisabled]}
                        onPress={handleAskMeLater}
                        disabled={isLoading}
                    >
                        <Ionicons name="time" size={20} color="#6B7280" />
                        <Text style={styles.secondaryButtonText}>
                            {isLoading ? 'Loading...' : 'Ask Me Later'}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.disclaimerText}>
                        You can always complete your profile later from Settings
                    </Text>
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
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingVertical: 32,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#1F2937',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 24,
    },
    benefitsSection: {
        backgroundColor: '#1F2937',
        borderRadius: 16,
        padding: 24,
        marginBottom: 32,
    },
    benefitsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 16,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    benefitText: {
        fontSize: 16,
        color: '#D1D5DB',
        marginLeft: 12,
    },
    actionSection: {
        gap: 16,
    },
    primaryButton: {
        backgroundColor: '#4F46E5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#374151',
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
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButtonText: {
        color: '#6B7280',
        fontSize: 16,
        fontWeight: '500',
    },
    disclaimerText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 8,
    },
});

