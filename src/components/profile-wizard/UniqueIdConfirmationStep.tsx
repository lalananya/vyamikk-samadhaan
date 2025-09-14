import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileData } from '../../types/Profile';
import { uniqueIdGenerator, UniqueIdData } from '../../services/UniqueIdGenerator';

interface UniqueIdConfirmationStepProps {
    data: Partial<ProfileData>;
    onDataChange: (data: Partial<ProfileData>) => void;
    onComplete: () => void;
    mode: 'self' | 'admin';
}

export default function UniqueIdConfirmationStep({
    data,
    onDataChange,
    onComplete
}: UniqueIdConfirmationStepProps) {
    const [uniqueIdData, setUniqueIdData] = useState<UniqueIdData | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(false);

    useEffect(() => {
        generateUniqueId();
    }, []);

    const generateUniqueId = async () => {
        setIsGenerating(true);
        try {
            const generated = await uniqueIdGenerator.generateUniqueId(data);
            setUniqueIdData(generated);
        } catch (error) {
            console.error('Failed to generate unique ID:', error);
            Alert.alert('Error', 'Failed to generate unique ID. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleConfirm = () => {
        if (!uniqueIdData) return;

        // Update profile data with ecosystem ID
        onDataChange({
            ecosystemId: uniqueIdData.ecosystemId,
            ecosystemIdGenerated: true,
        });

        setIsConfirmed(true);

        // Show confirmation and proceed
        Alert.alert(
            'Unique ID Generated!',
            `Your ecosystem identity is: ${uniqueIdData.ecosystemId}\n\nThis ID will be used across all company apps.`,
            [
                {
                    text: 'Continue',
                    onPress: onComplete,
                },
            ]
        );
    };


    if (isGenerating) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Generating your unique identity...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Ionicons name="finger-print" size={48} color="#007AFF" />
                </View>
                <Text style={styles.title}>Your Unique Identity</Text>
                <Text style={styles.subtitle}>
                    Your unique ecosystem identity (UEID) has been generated
                </Text>
            </View>

            {uniqueIdData && (
                <View style={styles.identityCard}>
                    <View style={styles.identityHeader}>
                        <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                        <Text style={styles.identityLabel}>Ecosystem ID</Text>
                    </View>

                    <Text style={styles.ecosystemId}>{uniqueIdData.ecosystemId}</Text>

                    <View style={styles.identityDetails}>
                        <View style={styles.detailRow}>
                            <Ionicons name="person" size={16} color="#666666" />
                            <Text style={styles.detailText}>
                                {uniqueIdData.displayName || data.fullName}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Ionicons name="call" size={16} color="#666666" />
                            <Text style={styles.detailText}>{uniqueIdData.phone}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Ionicons name="time" size={16} color="#666666" />
                            <Text style={styles.detailText}>
                                Generated: {new Date(uniqueIdData.generatedAt).toLocaleDateString()}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>What is this ID?</Text>
                <Text style={styles.infoText}>
                    • Your unique ecosystem identity (UEID){'\n'}
                    • Format: VS-XXXX-XXXX-XXXX{'\n'}
                    • Works across all company apps in the ecosystem{'\n'}
                    • Cannot be changed once confirmed{'\n'}
                    • Used for secure identification and communication{'\n'}
                    • Required for ecosystem access and admin approval
                </Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[
                        styles.confirmButton,
                        isConfirmed && styles.confirmButtonConfirmed,
                    ]}
                    onPress={handleConfirm}
                    disabled={!uniqueIdData || isConfirmed}
                >
                    <Text style={styles.confirmButtonText}>
                        {isConfirmed ? 'Confirmed ✓' : 'Confirm & Continue'}
                    </Text>
                    <Ionicons
                        name={isConfirmed ? "checkmark" : "arrow-forward"}
                        size={20}
                        color="#ffffff"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: '#ffffff',
        textAlign: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#cccccc',
        textAlign: 'center',
        lineHeight: 22,
    },
    identityCard: {
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(0, 122, 255, 0.3)',
    },
    identityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    identityLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    ecosystemId: {
        fontSize: 28,
        fontWeight: '700',
        color: '#007AFF',
        marginBottom: 16,
        textAlign: 'center',
    },
    identityDetails: {
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 14,
        color: '#cccccc',
    },
    infoSection: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#cccccc',
        lineHeight: 20,
    },
    actions: {
        gap: 12,
    },
    confirmButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    confirmButtonConfirmed: {
        backgroundColor: '#34C759',
    },
    confirmButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});
