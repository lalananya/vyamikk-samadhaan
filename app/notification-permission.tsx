import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Alert,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

export default function NotificationPermissionScreen() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleEnableNotifications = async () => {
        setIsLoading(true);
        try {
            // Request notification permissions
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Notifications are required for attendance reminders and important updates. Please enable them in your device settings.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Notifications.openSettingsAsync() }
                    ]
                );
                setIsLoading(false);
                return;
            }

            // Configure notification behavior
            await Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: false,
                }),
            });

            // Navigate to next screen or back
            router.back();
        } catch (error) {
            console.error('Error requesting notification permissions:', error);
            Alert.alert('Error', 'Failed to enable notifications. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNotNow = () => {
        router.back();
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.time}>01:31 M</Text>
                <View style={styles.statusIcons}>
                    <Ionicons name="notifications-off" size={16} color="#fff" />
                    <Ionicons name="wifi" size={16} color="#fff" />
                    <Ionicons name="airplane" size={16} color="#fff" />
                    <Text style={styles.battery}>24%</Text>
                </View>
            </View>

            {/* Main Content */}
            <View style={styles.content}>
                <Text style={styles.title}>Get notified</Text>
                <Text style={styles.description}>
                    Allow notifications so we can let you know about attendance reminders, shift changes, and important updates.
                </Text>

                {/* Illustration */}
                <View style={styles.illustrationContainer}>
                    <View style={styles.illustration}>
                        {/* Mailbox */}
                        <View style={styles.mailbox}>
                            <View style={styles.mailboxBody} />
                            <View style={styles.mailboxFlag} />
                            <View style={styles.envelope} />
                        </View>

                        {/* Phone */}
                        <View style={styles.phone}>
                            <View style={styles.phoneScreen}>
                                <View style={styles.phoneHeader}>
                                    <View style={styles.userIcon} />
                                </View>
                                <View style={styles.phoneLines}>
                                    <View style={styles.phoneLine} />
                                    <View style={styles.phoneLine} />
                                    <View style={styles.phoneLine} />
                                </View>
                            </View>
                            <View style={styles.messageBubble}>
                                <View style={styles.messageLine} />
                                <View style={styles.messageLine} />
                            </View>
                        </View>

                        {/* Contact Icon */}
                        <View style={styles.contactIcon}>
                            <View style={styles.contactUserIcon} />
                        </View>

                        {/* Paper Elements */}
                        <View style={styles.paper1} />
                        <View style={styles.paper2} />
                    </View>
                </View>

                {/* Action Buttons */}
                <TouchableOpacity
                    style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                    onPress={handleEnableNotifications}
                    disabled={isLoading}
                >
                    <Text style={styles.primaryButtonText}>
                        {isLoading ? 'Enabling...' : 'Enable notifications'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleNotNow}
                    disabled={isLoading}
                >
                    <Text style={styles.secondaryButtonText}>Not now</Text>
                </TouchableOpacity>

                {/* Progress Dots */}
                <View style={styles.progressDots}>
                    <View style={[styles.dot, styles.activeDot]} />
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                </View>
            </View>

            {/* Navigation Bar */}
            <View style={styles.navigationBar} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    time: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    statusIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    battery: {
        color: '#fff',
        fontSize: 14,
        marginLeft: 4,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    illustrationContainer: {
        marginBottom: 60,
        alignItems: 'center',
    },
    illustration: {
        width: 280,
        height: 200,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Mailbox
    mailbox: {
        position: 'absolute',
        left: 20,
        top: 40,
    },
    mailboxBody: {
        width: 40,
        height: 30,
        backgroundColor: '#4A90E2',
        borderRadius: 4,
    },
    mailboxFlag: {
        position: 'absolute',
        right: -8,
        top: -5,
        width: 0,
        height: 0,
        borderLeftWidth: 15,
        borderLeftColor: '#FF6B35',
        borderTopWidth: 8,
        borderTopColor: 'transparent',
        borderBottomWidth: 8,
        borderBottomColor: 'transparent',
    },
    envelope: {
        position: 'absolute',
        left: 8,
        top: 8,
        width: 24,
        height: 16,
        backgroundColor: '#fff',
        borderRadius: 2,
    },
    // Phone
    phone: {
        position: 'absolute',
        left: 60,
        top: 20,
        width: 60,
        height: 100,
        backgroundColor: '#4A90E2',
        borderRadius: 8,
        padding: 4,
    },
    phoneScreen: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 4,
        padding: 6,
    },
    phoneHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    userIcon: {
        width: 12,
        height: 12,
        backgroundColor: '#4A90E2',
        borderRadius: 6,
    },
    phoneLines: {
        gap: 4,
    },
    phoneLine: {
        height: 3,
        backgroundColor: '#ddd',
        borderRadius: 2,
    },
    messageBubble: {
        position: 'absolute',
        right: -40,
        top: 20,
        backgroundColor: '#E3F2FD',
        padding: 8,
        borderRadius: 12,
        width: 60,
    },
    messageLine: {
        height: 2,
        backgroundColor: '#4A90E2',
        borderRadius: 1,
        marginBottom: 2,
    },
    // Contact Icon
    contactIcon: {
        position: 'absolute',
        right: 20,
        top: 30,
        width: 24,
        height: 24,
        backgroundColor: '#E3F2FD',
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactUserIcon: {
        width: 12,
        height: 12,
        backgroundColor: '#4A90E2',
        borderRadius: 6,
    },
    // Paper Elements
    paper1: {
        position: 'absolute',
        left: 10,
        bottom: 20,
        width: 20,
        height: 15,
        backgroundColor: '#E3F2FD',
        borderRadius: 2,
        transform: [{ rotate: '-15deg' }],
    },
    paper2: {
        position: 'absolute',
        left: 30,
        bottom: 10,
        width: 16,
        height: 12,
        backgroundColor: '#E3F2FD',
        borderRadius: 2,
        transform: [{ rotate: '10deg' }],
    },
    // Buttons
    primaryButton: {
        backgroundColor: '#4A90E2',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 8,
        marginBottom: 16,
        minWidth: 200,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: '#333',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 8,
        marginBottom: 40,
        minWidth: 200,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    // Progress Dots
    progressDots: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#666',
    },
    activeDot: {
        backgroundColor: '#fff',
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    // Navigation Bar
    navigationBar: {
        height: 4,
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 10,
        borderRadius: 2,
    },
});

