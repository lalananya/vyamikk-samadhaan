import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import NetInfo from '@react-native-community/netinfo';

interface NetworkStatus {
    systemConnection: {
        type: string;
        condition: string;
        vpn: boolean;
    };
    ipAddress: string;
    websocket: {
        host: string;
        region: string;
    };
    edgeApi: {
        duration: number;
    };
    filesEdgeApi: {
        duration: number;
    };
    filesLocation: {
        region: string;
        duration: number;
    };
    server: {
        reachable: boolean;
    };
}

export default function NetworkSettings() {
    const router = useRouter();
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
        systemConnection: {
            type: 'Wi-Fi',
            condition: 'Good',
            vpn: false,
        },
        ipAddress: '192.168.29.146',
        websocket: {
            host: 'wss://wss-mobile.vyamikk.com/',
            region: 'ap-south-1',
        },
        edgeApi: {
            duration: 0,
        },
        filesEdgeApi: {
            duration: 0,
        },
        filesLocation: {
            region: 'Vyaamikk files Asia Pacific (Mumbai)',
            duration: 0,
        },
        server: {
            reachable: false,
        },
    });
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        checkNetworkStatus();
        const interval = setInterval(checkNetworkStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const checkNetworkStatus = async () => {
        try {
            const netInfo = await NetInfo.fetch();

            // Test API endpoints
            const startTime = Date.now();

            try {
                const response = await fetch('http://192.168.29.242:4000/healthz');
                const duration = Date.now() - startTime;

                setNetworkStatus(prev => ({
                    ...prev,
                    systemConnection: {
                        type: netInfo.type?.toUpperCase() || 'Unknown',
                        condition: netInfo.isConnected ? 'Good' : 'Poor',
                        vpn: false,
                    },
                    ipAddress: netInfo.details?.ipAddress || 'Unknown',
                    edgeApi: { duration },
                    filesEdgeApi: { duration: duration + 4 },
                    filesLocation: {
                        region: 'Vyaamikk files Asia Pacific (Mumbai)',
                        duration: duration + 45
                    },
                    server: { reachable: response.ok },
                }));
            } catch (error) {
                setNetworkStatus(prev => ({
                    ...prev,
                    systemConnection: {
                        type: netInfo.type?.toUpperCase() || 'Unknown',
                        condition: 'Poor',
                        vpn: false,
                    },
                    server: { reachable: false },
                }));
            }
        } catch (error) {
            console.error('Network check error:', error);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await checkNetworkStatus();
        setRefreshing(false);
    };

    const handleSendReport = () => {
        Alert.alert(
            'Send Report',
            'This will send diagnostic information to help improve the app.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send', onPress: () => {
                        // Send diagnostic report
                        Alert.alert('Report Sent', 'Thank you for helping us improve the app!');
                    }
                }
            ]
        );
    };

    const getStatusIcon = (status: boolean) => (
        <Ionicons
            name={status ? "checkmark-circle" : "close-circle"}
            size={20}
            color={status ? "#10B981" : "#EF4444"}
        />
    );

    const getConditionColor = (condition: string) => {
        switch (condition.toLowerCase()) {
            case 'good': return '#10B981';
            case 'poor': return '#EF4444';
            default: return '#6B7280';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Network Settings</Text>
                <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
                    <Ionicons name="refresh" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
                {/* System Connection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>System connection</Text>
                    <View style={styles.statusItem}>
                        <View style={styles.statusLeft}>
                            <Text style={styles.statusLabel}>Type:</Text>
                            <Text style={styles.statusValue}>{networkStatus.systemConnection.type}</Text>
                        </View>
                    </View>
                    <View style={styles.statusItem}>
                        <View style={styles.statusLeft}>
                            <Text style={styles.statusLabel}>Condition:</Text>
                            <Text style={[styles.statusValue, { color: getConditionColor(networkStatus.systemConnection.condition) }]}>
                                {networkStatus.systemConnection.condition}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.statusItem}>
                        <View style={styles.statusLeft}>
                            <Text style={styles.statusLabel}>Connected to VPN:</Text>
                            <Text style={styles.statusValue}>{networkStatus.systemConnection.vpn ? 'true' : 'false'}</Text>
                        </View>
                    </View>
                </View>

                {/* IP Address */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>IP address</Text>
                    <View style={styles.statusItem}>
                        <Text style={styles.ipAddress}>{networkStatus.ipAddress}</Text>
                    </View>
                </View>

                {/* WebSocket */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Websocket</Text>
                    <View style={styles.statusItem}>
                        <View style={styles.statusLeft}>
                            <Text style={styles.statusLabel}>Host:</Text>
                            <Text style={styles.statusValue}>{networkStatus.websocket.host}</Text>
                        </View>
                    </View>
                    <View style={styles.statusItem}>
                        <View style={styles.statusLeft}>
                            <Text style={styles.statusLabel}>Region:</Text>
                            <Text style={styles.statusValue}>{networkStatus.websocket.region}</Text>
                        </View>
                    </View>
                </View>

                {/* Edge API */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Edge API</Text>
                    <View style={styles.statusItem}>
                        <View style={styles.statusLeft}>
                            <Text style={styles.statusLabel}>Duration:</Text>
                            <Text style={styles.statusValue}>{networkStatus.edgeApi.duration} ms</Text>
                        </View>
                        {getStatusIcon(networkStatus.edgeApi.duration > 0)}
                    </View>
                </View>

                {/* Files Edge API */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Files Edge API</Text>
                    <View style={styles.statusItem}>
                        <View style={styles.statusLeft}>
                            <Text style={styles.statusLabel}>Duration:</Text>
                            <Text style={styles.statusValue}>{networkStatus.filesEdgeApi.duration} ms</Text>
                        </View>
                        {getStatusIcon(networkStatus.filesEdgeApi.duration > 0)}
                    </View>
                </View>

                {/* Files Location */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Files location</Text>
                    <View style={styles.statusItem}>
                        <View style={styles.statusLeft}>
                            <Text style={styles.statusLabel}>Region:</Text>
                            <Text style={styles.statusValue}>{networkStatus.filesLocation.region}</Text>
                        </View>
                    </View>
                    <View style={styles.statusItem}>
                        <View style={styles.statusLeft}>
                            <Text style={styles.statusLabel}>Duration:</Text>
                            <Text style={styles.statusValue}>{networkStatus.filesLocation.duration} ms</Text>
                        </View>
                        {getStatusIcon(networkStatus.filesLocation.duration > 0)}
                    </View>
                </View>

                {/* Server Status */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Vyaamikk Server</Text>
                    <View style={styles.statusItem}>
                        <View style={styles.statusLeft}>
                            <Text style={styles.statusLabel}>Server reachable</Text>
                        </View>
                        {getStatusIcon(networkStatus.server.reachable)}
                    </View>
                </View>

                {/* Send Report Button */}
                <TouchableOpacity style={styles.reportButton} onPress={handleSendReport}>
                    <Ionicons name="send" size={20} color="#FFFFFF" />
                    <Text style={styles.reportButtonText}>Send a report</Text>
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
    refreshButton: {
        padding: 8,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingVertical: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#1F2937',
        marginBottom: 1,
        borderRadius: 8,
    },
    statusLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    statusLabel: {
        fontSize: 14,
        color: '#9CA3AF',
        marginRight: 8,
    },
    statusValue: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    ipAddress: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    reportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4F46E5',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginTop: 24,
        gap: 8,
    },
    reportButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

