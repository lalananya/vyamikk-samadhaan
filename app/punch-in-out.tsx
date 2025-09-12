// app/punch-in-out.tsx
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { router } from "expo-router";
import { apiFetch } from "../src/api";
import { getToken } from "../src/auth";
import * as Location from 'expo-location';

interface PunchRecord {
    id: string;
    date: string;
    punchIn: string;
    punchOut?: string;
    location: {
        latitude: number;
        longitude: number;
        address: string;
    };
    totalHours?: number;
    status: 'active' | 'completed';
}

export default function PunchInOut() {
    const [currentPunch, setCurrentPunch] = useState<PunchRecord | null>(null);
    const [punchHistory, setPunchHistory] = useState<PunchRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [locationPermission, setLocationPermission] = useState<boolean>(false);

    useEffect(() => {
        checkLocationPermission();
        loadPunchData();
    }, []);

    const checkLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status === 'granted');

            if (status === 'granted') {
                const currentLocation = await Location.getCurrentPositionAsync({});
                setLocation(currentLocation);
            }
        } catch (error) {
            Alert.alert("Location Error", "Failed to get location permission");
        }
    };

    const loadPunchData = async () => {
        setLoading(true);
        try {
            // In a real app, this would fetch from the backend
            // For now, we'll use mock data
            const mockHistory: PunchRecord[] = [
                {
                    id: '1',
                    date: '2024-01-15',
                    punchIn: '09:00',
                    punchOut: '17:30',
                    location: {
                        latitude: 19.0760,
                        longitude: 72.8777,
                        address: 'Mumbai, Maharashtra'
                    },
                    totalHours: 8.5,
                    status: 'completed'
                },
                {
                    id: '2',
                    date: '2024-01-14',
                    punchIn: '08:30',
                    punchOut: '18:00',
                    location: {
                        latitude: 19.0760,
                        longitude: 72.8777,
                        address: 'Mumbai, Maharashtra'
                    },
                    totalHours: 9.5,
                    status: 'completed'
                },
                {
                    id: '3',
                    date: '2024-01-13',
                    punchIn: '09:15',
                    punchOut: '17:45',
                    location: {
                        latitude: 19.0760,
                        longitude: 72.8777,
                        address: 'Mumbai, Maharashtra'
                    },
                    totalHours: 8.5,
                    status: 'completed'
                }
            ];
            setPunchHistory(mockHistory);
        } catch (error) {
            Alert.alert("Error", "Failed to load punch data");
        } finally {
            setLoading(false);
        }
    };

    const handlePunchIn = async () => {
        if (!locationPermission) {
            Alert.alert("Location Required", "Please enable location permission to punch in/out");
            return;
        }

        setLoading(true);
        try {
            const currentLocation = await Location.getCurrentPositionAsync({});
            const address = await getAddressFromCoordinates(
                currentLocation.coords.latitude,
                currentLocation.coords.longitude
            );

            const newPunch: PunchRecord = {
                id: Date.now().toString(),
                date: new Date().toISOString().split('T')[0],
                punchIn: new Date().toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }),
                location: {
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude,
                    address: address
                },
                status: 'active'
            };

            setCurrentPunch(newPunch);
            Alert.alert("Punched In", `Successfully punched in at ${newPunch.punchIn}`);
        } catch (error) {
            Alert.alert("Error", "Failed to punch in. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handlePunchOut = async () => {
        if (!currentPunch) return;

        setLoading(true);
        try {
            const punchOutTime = new Date().toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

            const punchInTime = new Date(`2000-01-01T${currentPunch.punchIn}:00`);
            const punchOutTimeObj = new Date(`2000-01-01T${punchOutTime}:00`);
            const totalHours = (punchOutTimeObj.getTime() - punchInTime.getTime()) / (1000 * 60 * 60);

            const completedPunch: PunchRecord = {
                ...currentPunch,
                punchOut: punchOutTime,
                totalHours: Math.round(totalHours * 10) / 10,
                status: 'completed'
            };

            setPunchHistory(prev => [completedPunch, ...prev]);
            setCurrentPunch(null);
            Alert.alert("Punched Out", `Successfully punched out at ${punchOutTime}. Total hours: ${completedPunch.totalHours}`);
        } catch (error) {
            Alert.alert("Error", "Failed to punch out. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const getAddressFromCoordinates = async (latitude: number, longitude: number): Promise<string> => {
        try {
            const reverseGeocode = await Location.reverseGeocodeAsync({
                latitude,
                longitude
            });

            if (reverseGeocode.length > 0) {
                const address = reverseGeocode[0];
                return `${address.city || ''} ${address.region || ''} ${address.country || ''}`.trim();
            }
            return 'Location not found';
        } catch (error) {
            return 'Location not found';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getTotalHoursToday = () => {
        const today = new Date().toISOString().split('T')[0];
        const todayPunches = punchHistory.filter(punch => punch.date === today);
        return todayPunches.reduce((total, punch) => total + (punch.totalHours || 0), 0);
    };

    const getTotalHoursThisWeek = () => {
        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));

        const weekPunches = punchHistory.filter(punch => {
            const punchDate = new Date(punch.date);
            return punchDate >= startOfWeek && punchDate <= endOfWeek;
        });

        return weekPunches.reduce((total, punch) => total + (punch.totalHours || 0), 0);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Punch In/Out</Text>

            <View style={styles.statusCard}>
                <Text style={styles.statusTitle}>Current Status</Text>
                {currentPunch ? (
                    <View style={styles.activeStatus}>
                        <Text style={styles.statusText}>🟢 Currently Working</Text>
                        <Text style={styles.punchTime}>Punched in at: {currentPunch.punchIn}</Text>
                        <Text style={styles.locationText}>📍 {currentPunch.location.address}</Text>
                    </View>
                ) : (
                    <View style={styles.inactiveStatus}>
                        <Text style={styles.statusText}>🔴 Not Working</Text>
                        <Text style={styles.punchTime}>Ready to punch in</Text>
                    </View>
                )}
            </View>

            <View style={styles.actionCard}>
                <Text style={styles.actionTitle}>Actions</Text>
                <View style={styles.actionButtons}>
                    {currentPunch ? (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.punchOutButton]}
                            onPress={handlePunchOut}
                            disabled={loading}
                        >
                            <Text style={styles.actionButtonText}>
                                {loading ? "Processing..." : "Punch Out"}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.punchInButton]}
                            onPress={handlePunchIn}
                            disabled={loading || !locationPermission}
                        >
                            <Text style={styles.actionButtonText}>
                                {loading ? "Processing..." : "Punch In"}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {!locationPermission && (
                    <Text style={styles.permissionText}>
                        ⚠️ Location permission required for punch in/out
                    </Text>
                )}
            </View>

            <View style={styles.statsCard}>
                <Text style={styles.statsTitle}>Today's Summary</Text>
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{getTotalHoursToday().toFixed(1)}</Text>
                        <Text style={styles.statLabel}>Hours Today</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{getTotalHoursThisWeek().toFixed(1)}</Text>
                        <Text style={styles.statLabel}>Hours This Week</Text>
                    </View>
                </View>
            </View>

            <View style={styles.historyCard}>
                <Text style={styles.historyTitle}>Punch History</Text>
                <ScrollView style={styles.historyList}>
                    {punchHistory.map((punch) => (
                        <View key={punch.id} style={styles.historyItem}>
                            <View style={styles.historyHeader}>
                                <Text style={styles.historyDate}>{formatDate(punch.date)}</Text>
                                <View style={[styles.statusBadge, {
                                    backgroundColor: punch.status === 'completed' ? '#10b981' : '#f59e0b'
                                }]}>
                                    <Text style={styles.statusBadgeText}>
                                        {punch.status === 'completed' ? 'Completed' : 'Active'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.historyDetails}>
                                <Text style={styles.historyTime}>
                                    In: {punch.punchIn} {punch.punchOut && `| Out: ${punch.punchOut}`}
                                </Text>
                                {punch.totalHours && (
                                    <Text style={styles.historyHours}>
                                        Total: {punch.totalHours} hours
                                    </Text>
                                )}
                                <Text style={styles.historyLocation}>
                                    📍 {punch.location.address}
                                </Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 24,
        color: '#1a1a1a',
    },
    statusCard: {
        backgroundColor: 'white',
        margin: 24,
        marginTop: 0,
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    activeStatus: {
        alignItems: 'center',
    },
    inactiveStatus: {
        alignItems: 'center',
    },
    statusText: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
        color: '#1a1a1a',
    },
    punchTime: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 4,
    },
    locationText: {
        fontSize: 14,
        color: '#6b7280',
    },
    actionCard: {
        backgroundColor: 'white',
        margin: 24,
        marginTop: 0,
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    actionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 16,
    },
    actionButtons: {
        alignItems: 'center',
    },
    actionButton: {
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 8,
        minWidth: 200,
        alignItems: 'center',
    },
    punchInButton: {
        backgroundColor: '#10b981',
    },
    punchOutButton: {
        backgroundColor: '#ef4444',
    },
    actionButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    permissionText: {
        fontSize: 14,
        color: '#f59e0b',
        textAlign: 'center',
        marginTop: 12,
    },
    statsCard: {
        backgroundColor: 'white',
        margin: 24,
        marginTop: 0,
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    statLabel: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
    },
    historyCard: {
        backgroundColor: 'white',
        margin: 24,
        marginTop: 0,
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        flex: 1,
    },
    historyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 16,
    },
    historyList: {
        flex: 1,
    },
    historyItem: {
        backgroundColor: '#f9fafb',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    historyDate: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    historyDetails: {
        gap: 4,
    },
    historyTime: {
        fontSize: 14,
        color: '#374151',
    },
    historyHours: {
        fontSize: 14,
        color: '#10b981',
        fontWeight: '600',
    },
    historyLocation: {
        fontSize: 12,
        color: '#6b7280',
    },
});
