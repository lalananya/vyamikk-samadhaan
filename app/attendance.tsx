import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';

interface AttendanceStatus {
    isPunchedIn: boolean;
    punchInTime?: Date;
    punchOutTime?: Date;
    workHours?: number;
    location?: {
        latitude: number;
        longitude: number;
        accuracy: number;
        address: string;
    };
}

export default function AttendanceScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [attendance, setAttendance] = useState<AttendanceStatus>({
        isPunchedIn: false
    });
    const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);

    useEffect(() => {
        getCurrentLocation();
    }, []);

    const getCurrentLocation = async () => {
        try {
            setLocationLoading(true);

            // Request location permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Location Permission Required',
                    'Location access is required for attendance tracking. Please enable location permissions in your device settings.',
                    [{ text: 'OK' }]
                );
                return;
            }

            // Get current location
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
                maximumAge: 10000, // 10 seconds
                timeout: 15000 // 15 seconds
            });

            setCurrentLocation(location);

            // Get address from coordinates
            const addressResponse = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });

            if (addressResponse.length > 0) {
                const address = addressResponse[0];
                const addressString = [
                    address.street,
                    address.city,
                    address.region,
                    address.country
                ].filter(Boolean).join(', ');

                setAttendance(prev => ({
                    ...prev,
                    location: {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        accuracy: location.coords.accuracy || 0,
                        address: addressString
                    }
                }));
            }
        } catch (error) {
            console.error('Error getting location:', error);
            Alert.alert('Location Error', 'Failed to get current location. Please try again.');
        } finally {
            setLocationLoading(false);
        }
    };

    const punchIn = async () => {
        if (!currentLocation) {
            Alert.alert('Location Required', 'Please wait for location to be determined before punching in.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE || 'http://192.168.29.242:4000/api/v1'}/attendance/punch-in`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await getToken()}`
                },
                body: JSON.stringify({
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude,
                    accuracy: currentLocation.coords.accuracy,
                    address: attendance.location?.address || 'Unknown location',
                    method: 'manual',
                    deviceInfo: {
                        deviceId: 'mobile-device',
                        platform: 'react-native',
                        version: '1.0.0'
                    }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to punch in');
            }

            const result = await response.json();

            setAttendance({
                isPunchedIn: true,
                punchInTime: new Date(result.data.punchIn.timestamp),
                location: result.data.location
            });

            Alert.alert('Success', 'Punched in successfully!');
        } catch (error) {
            console.error('Error punching in:', error);
            Alert.alert('Error', error.message || 'Failed to punch in. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const punchOut = async () => {
        if (!currentLocation) {
            Alert.alert('Location Required', 'Please wait for location to be determined before punching out.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE || 'http://192.168.29.242:4000/api/v1'}/attendance/punch-out`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await getToken()}`
                },
                body: JSON.stringify({
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude,
                    accuracy: currentLocation.coords.accuracy,
                    address: attendance.location?.address || 'Unknown location',
                    method: 'manual',
                    deviceInfo: {
                        deviceId: 'mobile-device',
                        platform: 'react-native',
                        version: '1.0.0'
                    }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to punch out');
            }

            const result = await response.json();

            setAttendance({
                isPunchedIn: false,
                punchInTime: undefined,
                punchOutTime: new Date(result.data.punchOut.timestamp),
                workHours: result.data.workHours,
                location: result.data.location
            });

            Alert.alert(
                'Success',
                `Punched out successfully!\nWork Hours: ${result.data.workHours.toFixed(2)} hours`
            );
        } catch (error) {
            console.error('Error punching out:', error);
            Alert.alert('Error', error.message || 'Failed to punch out. Please try again.');
        } finally {
            setLoading(false);
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

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" backgroundColor="#000000" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Attendance</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.content}>
                {/* Location Status */}
                <View style={styles.locationCard}>
                    <View style={styles.locationHeader}>
                        <Ionicons
                            name={locationLoading ? "location-outline" : "location"}
                            size={24}
                            color={locationLoading ? "#6B7280" : "#10B981"}
                        />
                        <Text style={styles.locationTitle}>
                            {locationLoading ? 'Getting Location...' : 'Location Status'}
                        </Text>
                    </View>

                    {locationLoading ? (
                        <ActivityIndicator size="small" color="#6B7280" />
                    ) : currentLocation ? (
                        <View>
                            <Text style={styles.locationText}>
                                {attendance.location?.address || 'Location acquired'}
                            </Text>
                            <Text style={styles.locationCoords}>
                                {currentLocation.coords.latitude.toFixed(6)}, {currentLocation.coords.longitude.toFixed(6)}
                            </Text>
                            <Text style={styles.locationAccuracy}>
                                Accuracy: ±{Math.round(currentLocation.coords.accuracy || 0)}m
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.locationError}>Location not available</Text>
                    )}
                </View>

                {/* Attendance Status */}
                <View style={styles.attendanceCard}>
                    <View style={styles.statusHeader}>
                        <View style={[
                            styles.statusIndicator,
                            { backgroundColor: attendance.isPunchedIn ? '#10B981' : '#EF4444' }
                        ]} />
                        <Text style={styles.statusText}>
                            {attendance.isPunchedIn ? 'Currently Working' : 'Not Working'}
                        </Text>
                    </View>

                    {attendance.punchInTime && (
                        <View style={styles.timeInfo}>
                            <Text style={styles.timeLabel}>Punched In:</Text>
                            <Text style={styles.timeValue}>
                                {formatTime(attendance.punchInTime)}
                            </Text>
                        </View>
                    )}

                    {attendance.punchOutTime && (
                        <View style={styles.timeInfo}>
                            <Text style={styles.timeLabel}>Punched Out:</Text>
                            <Text style={styles.timeValue}>
                                {formatTime(attendance.punchOutTime)}
                            </Text>
                        </View>
                    )}

                    {attendance.workHours && (
                        <View style={styles.timeInfo}>
                            <Text style={styles.timeLabel}>Work Hours:</Text>
                            <Text style={styles.timeValue}>
                                {attendance.workHours.toFixed(2)} hours
                            </Text>
                        </View>
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionSection}>
                    {attendance.isPunchedIn ? (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.punchOutButton]}
                            onPress={punchOut}
                            disabled={loading || locationLoading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
                                    <Text style={styles.actionButtonText}>Punch Out</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.punchInButton]}
                            onPress={punchIn}
                            disabled={loading || locationLoading || !currentLocation}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="log-in-outline" size={24} color="#FFFFFF" />
                                    <Text style={styles.actionButtonText}>Punch In</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={getCurrentLocation}
                        disabled={locationLoading}
                    >
                        <Ionicons name="refresh" size={20} color="#6B7280" />
                        <Text style={styles.refreshButtonText}>Refresh Location</Text>
                    </TouchableOpacity>
                </View>

                {/* Info Section */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Attendance Tracking</Text>
                    <Text style={styles.infoText}>
                        • Location is required for accurate attendance tracking
                    </Text>
                    <Text style={styles.infoText}>
                        • Your location data is securely stored and encrypted
                    </Text>
                    <Text style={styles.infoText}>
                        • You can view your attendance history anytime
                    </Text>
                </View>
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
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingVertical: 24,
    },
    locationCard: {
        backgroundColor: '#1F2937',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    locationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 8,
    },
    locationText: {
        fontSize: 14,
        color: '#D1D5DB',
        marginBottom: 4,
    },
    locationCoords: {
        fontSize: 12,
        color: '#9CA3AF',
        marginBottom: 2,
    },
    locationAccuracy: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    locationError: {
        fontSize: 14,
        color: '#EF4444',
    },
    attendanceCard: {
        backgroundColor: '#1F2937',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        alignItems: 'center',
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    statusText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    timeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    timeLabel: {
        fontSize: 14,
        color: '#9CA3AF',
        marginRight: 8,
    },
    timeValue: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    actionSection: {
        marginBottom: 24,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginBottom: 12,
        gap: 8,
    },
    punchInButton: {
        backgroundColor: '#10B981',
    },
    punchOutButton: {
        backgroundColor: '#EF4444',
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#374151',
        gap: 8,
    },
    refreshButtonText: {
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '500',
    },
    infoCard: {
        backgroundColor: '#1F2937',
        borderRadius: 12,
        padding: 16,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    infoText: {
        fontSize: 14,
        color: '#9CA3AF',
        marginBottom: 8,
        lineHeight: 20,
    },
});

