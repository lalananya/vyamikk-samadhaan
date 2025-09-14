import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ProfileCompletionPillProps {
    completionPercentage: number;
}

export default function ProfileCompletionPill({ completionPercentage }: ProfileCompletionPillProps) {
    const router = useRouter();

    if (completionPercentage >= 100) {
        return null; // Don't show if profile is complete
    }

    const getProgressColor = () => {
        if (completionPercentage < 30) return '#FF3B30';
        if (completionPercentage < 70) return '#FF9500';
        return '#4A90E2';
    };

    const getProgressText = () => {
        if (completionPercentage < 30) return 'Complete your profile';
        if (completionPercentage < 70) return 'Almost there';
        return 'Just a few more details';
    };

    return (
        <TouchableOpacity 
            style={styles.container}
            onPress={() => router.push('/profile-wizard')}
        >
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="person-circle" size={20} color={getProgressColor()} />
                </View>
                
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{getProgressText()}</Text>
                    <Text style={styles.percentage}>{completionPercentage}% complete</Text>
                </View>

                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View 
                            style={[
                                styles.progressFill, 
                                { 
                                    width: `${completionPercentage}%`,
                                    backgroundColor: getProgressColor()
                                }
                            ]} 
                        />
                    </View>
                </View>

                <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#2C2C2E',
        borderRadius: 12,
        marginHorizontal: 20,
        marginVertical: 8,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3A3A3C',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    percentage: {
        fontSize: 14,
        color: '#8E8E93',
    },
    progressContainer: {
        width: 60,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#3A3A3C',
        borderRadius: 2,
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
});
