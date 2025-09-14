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
import * as Calendar from 'expo-calendar';

export default function CalendarIntegrationScreen() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState('google');

    const calendarProviders = [
        {
            id: 'google',
            name: 'Google',
            icon: 'logo-google',
            color: '#4285F4',
        },
        {
            id: 'microsoft',
            name: 'Microsoft',
            icon: 'logo-microsoft',
            color: '#00BCF2',
        },
        {
            id: 'device',
            name: 'Device calendar',
            icon: 'calendar-outline',
            color: '#4A90E2',
        },
    ];

    const handleConnect = async () => {
        setIsLoading(true);
        try {
            // Request calendar permissions
            const { status } = await Calendar.requestCalendarPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Calendar access is required to sync your work schedule and attendance events.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Calendar.openSettingsAsync() }
                    ]
                );
                setIsLoading(false);
                return;
            }

            // Get calendars
            const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

            if (calendars.length === 0) {
                Alert.alert(
                    'No Calendars Found',
                    'No calendars were found on your device. Please ensure you have at least one calendar set up.',
                    [{ text: 'OK' }]
                );
                setIsLoading(false);
                return;
            }

            // Create a test event to demonstrate integration
            const now = new Date();
            const testEvent = {
                title: 'Vyaamikk Samadhaan - Test Event',
                startDate: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
                endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour later
                notes: 'This is a test event created by Vyaamikk Samadhaan app.',
                location: 'Work Location',
                calendarId: calendars[0].id,
            };

            const eventId = await Calendar.createEventAsync(calendars[0].id, testEvent);

            Alert.alert(
                'Calendar Connected!',
                `Successfully connected to ${selectedProvider} calendar. A test event has been created for tomorrow.`,
                [
                    {
                        text: 'OK',
                        onPress: () => router.back(),
                    },
                ]
            );
        } catch (error) {
            console.error('Error connecting to calendar:', error);
            Alert.alert('Error', 'Failed to connect to calendar. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNotNow = () => {
        router.back();
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.time}>01:32 M</Text>
                <View style={styles.statusIcons}>
                    <Ionicons name="wifi" size={16} color="#fff" />
                    <Ionicons name="bluetooth" size={16} color="#fff" />
                    <Ionicons name="airplane" size={16} color="#fff" />
                    <Text style={styles.battery}>24%</Text>
                </View>
            </View>

            {/* Main Content */}
            <View style={styles.content}>
                <Text style={styles.title}>Make scheduling simple</Text>
                <Text style={styles.description}>
                    Easily access your work schedule by connecting to your external calendar and contacts or your device calendar.
                </Text>

                {/* Illustration */}
                <View style={styles.illustrationContainer}>
                    <View style={styles.illustration}>
                        {/* Calendar */}
                        <View style={styles.calendar}>
                            <View style={styles.calendarHeader}>
                                <Text style={styles.calendarTitle}>September 2024</Text>
                            </View>
                            <View style={styles.calendarGrid}>
                                {Array.from({ length: 35 }, (_, i) => (
                                    <View key={i} style={styles.calendarDay}>
                                        {i >= 2 && i <= 30 && (
                                            <Text style={styles.dayNumber}>{i - 1}</Text>
                                        )}
                                        {i === 15 && (
                                            <View style={styles.highlightedDay}>
                                                <Text style={styles.smileyIcon}>😊</Text>
                                            </View>
                                        )}
                                        {i === 8 && <View style={styles.eventDot} />}
                                        {i === 12 && <View style={styles.eventDot} />}
                                        {i === 20 && <View style={styles.eventDot} />}
                                        {i === 25 && <View style={styles.eventDot} />}
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Marker Pen */}
                        <View style={styles.markerPen}>
                            <View style={styles.penBody} />
                            <View style={styles.penCap} />
                        </View>
                    </View>
                </View>

                {/* Calendar Provider Options */}
                <View style={styles.providerOptions}>
                    {calendarProviders.map((provider) => (
                        <TouchableOpacity
                            key={provider.id}
                            style={[
                                styles.providerOption,
                                selectedProvider === provider.id && styles.selectedProvider,
                            ]}
                            onPress={() => setSelectedProvider(provider.id)}
                        >
                            <View style={styles.providerLeft}>
                                <Ionicons
                                    name={provider.icon as any}
                                    size={24}
                                    color={provider.color}
                                />
                                <Text style={styles.providerName}>{provider.name}</Text>
                            </View>
                            <View
                                style={[
                                    styles.checkbox,
                                    selectedProvider === provider.id && styles.checkedBox,
                                ]}
                            >
                                {selectedProvider === provider.id && (
                                    <Ionicons name="checkmark" size={16} color="#fff" />
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Action Buttons */}
                <TouchableOpacity
                    style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                    onPress={handleConnect}
                    disabled={isLoading}
                >
                    <Text style={styles.primaryButtonText}>
                        {isLoading ? 'Connecting...' : 'Connect'}
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
        marginBottom: 40,
        alignItems: 'center',
    },
    illustration: {
        width: 280,
        height: 200,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Calendar
    calendar: {
        width: 200,
        height: 160,
        backgroundColor: '#E3F2FD',
        borderRadius: 12,
        padding: 12,
    },
    calendarHeader: {
        alignItems: 'center',
        marginBottom: 8,
    },
    calendarTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4A90E2',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 2,
    },
    calendarDay: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    dayNumber: {
        fontSize: 12,
        color: '#666',
    },
    highlightedDay: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FF6B35',
        alignItems: 'center',
        justifyContent: 'center',
    },
    smileyIcon: {
        fontSize: 10,
    },
    eventDot: {
        position: 'absolute',
        bottom: 2,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#4A90E2',
    },
    // Marker Pen
    markerPen: {
        position: 'absolute',
        right: 20,
        top: 20,
        width: 40,
        height: 60,
    },
    penBody: {
        width: 8,
        height: 50,
        backgroundColor: '#FF6B35',
        borderRadius: 4,
    },
    penCap: {
        position: 'absolute',
        top: -8,
        width: 12,
        height: 12,
        backgroundColor: '#FF4444',
        borderRadius: 6,
    },
    // Provider Options
    providerOptions: {
        width: '100%',
        marginBottom: 40,
    },
    providerOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#333',
        borderRadius: 12,
        marginBottom: 12,
    },
    selectedProvider: {
        backgroundColor: '#444',
    },
    providerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    providerName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#666',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkedBox: {
        backgroundColor: '#4A90E2',
        borderColor: '#4A90E2',
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
