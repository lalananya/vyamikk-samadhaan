import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileData } from '../../types/Profile';

interface WorkDetailsStepProps {
    data: Partial<ProfileData>;
    onDataChange: (data: Partial<ProfileData>) => void;
    mode: 'self' | 'admin';
}

const ROLE_OPTIONS = [
    {
        id: 'Company/Organisation',
        label: 'Company/Organisation',
        description: 'Registered business entity, corporation, or organization',
        icon: 'business' as const,
    },
    {
        id: 'Professional Services',
        label: 'Professional Services',
        description: 'Individual professionals, consultants, freelancers',
        icon: 'person' as const,
    },
    {
        id: 'Skilled & Other Employees',
        label: 'Skilled & Other Employees',
        description: 'Workers, technicians, skilled labor, staff members',
        icon: 'people' as const,
    },
    {
        id: 'Non Registered Entity/Person',
        label: 'Non Registered Entity/Person',
        description: 'Service providers, contractors, unregistered entities',
        icon: 'construct' as const,
    },
];

export default function WorkDetailsStep({ data, onDataChange, mode }: WorkDetailsStepProps) {
    const [role, setRole] = useState<ProfileData['role']>(data.role || 'Company/Organisation');

    useEffect(() => {
        onDataChange({ role });
    }, [role]);

    const handleRoleSelect = (selectedRole: ProfileData['role']) => {
        setRole(selectedRole);
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.title}>Select Your Role</Text>
                <Text style={styles.subtitle}>
                    Choose the role that best describes your professional category.
                    This selection will be locked to your mobile number and personal details.
                </Text>
            </View>

            <View style={styles.roleContainer}>
                {ROLE_OPTIONS.map((option) => (
                    <TouchableOpacity
                        key={option.id}
                        style={[
                            styles.roleCard,
                            role === option.id && styles.roleCardSelected,
                        ]}
                        onPress={() => handleRoleSelect(option.id as ProfileData['role'])}
                    >
                        <View style={styles.roleHeader}>
                            <View style={[
                                styles.iconContainer,
                                role === option.id && styles.iconContainerSelected,
                            ]}>
                                <Ionicons
                                    name={option.icon}
                                    size={24}
                                    color={role === option.id ? '#ffffff' : '#007AFF'}
                                />
                            </View>
                            <View style={styles.roleInfo}>
                                <Text style={[
                                    styles.roleLabel,
                                    role === option.id && styles.roleLabelSelected,
                                ]}>
                                    {option.label}
                                </Text>
                                <Text style={[
                                    styles.roleDescription,
                                    role === option.id && styles.roleDescriptionSelected,
                                ]}>
                                    {option.description}
                                </Text>
                            </View>
                            <View style={[
                                styles.radioButton,
                                role === option.id && styles.radioButtonSelected,
                            ]}>
                                {role === option.id && (
                                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.warningContainer}>
                <Ionicons name="information-circle" size={20} color="#FF9500" />
                <Text style={styles.warningText}>
                    Once selected, this role will be permanently associated with your mobile number and cannot be changed without admin approval.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#cccccc',
        lineHeight: 22,
    },
    roleContainer: {
        gap: 16,
    },
    roleCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        padding: 20,
    },
    roleCardSelected: {
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderColor: '#007AFF',
    },
    roleHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 122, 255, 0.3)',
    },
    iconContainerSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    roleInfo: {
        flex: 1,
    },
    roleLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 4,
    },
    roleLabelSelected: {
        color: '#007AFF',
    },
    roleDescription: {
        fontSize: 14,
        color: '#cccccc',
        lineHeight: 20,
    },
    roleDescriptionSelected: {
        color: '#999999',
    },
    radioButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioButtonSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(255, 149, 0, 0.1)',
        borderRadius: 8,
        padding: 16,
        marginTop: 24,
        gap: 12,
    },
    warningText: {
        flex: 1,
        fontSize: 14,
        color: '#FF9500',
        lineHeight: 20,
    },
});