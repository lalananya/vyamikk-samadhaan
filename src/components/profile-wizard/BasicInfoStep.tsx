import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileData } from '../../types/Profile';

interface BasicInfoStepProps {
    data: Partial<ProfileData>;
    onDataChange: (data: Partial<ProfileData>) => void;
    mode: 'self' | 'admin';
}

export default function BasicInfoStep({ data, onDataChange, mode }: BasicInfoStepProps) {
    const [fullName, setFullName] = useState(data.fullName || '');
    const [profilePhoto, setProfilePhoto] = useState(data.profilePhoto || '');
    const [email, setEmail] = useState(data.email || '');

    useEffect(() => {
        onDataChange({
            fullName,
            profilePhoto,
            email,
        });
    }, [fullName, profilePhoto, email]);

    const handlePhotoCapture = () => {
        Alert.alert(
            'Add Profile Photo',
            'Choose an option',
            [
                { text: 'Camera', onPress: () => handleCamera() },
                { text: 'Gallery', onPress: () => handleGallery() },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleCamera = () => {
        // Stub for camera functionality
        Alert.alert('Camera', 'Camera functionality will be implemented soon');
    };

    const handleGallery = () => {
        // Stub for gallery functionality
        Alert.alert('Gallery', 'Gallery functionality will be implemented soon');
    };

    const validateEmail = (email: string): boolean => {
        if (!email.trim()) return true; // Optional field
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };


    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Basic Information</Text>
                <Text style={styles.subtitle}>
                    Tell us about yourself and how we can reach you
                </Text>
            </View>

            {/* Profile Photo */}
            <View style={styles.section}>
                <Text style={styles.label}>Profile Photo</Text>
                <Text style={styles.helperText}>Optional • Add a professional photo</Text>
                <TouchableOpacity style={styles.photoContainer} onPress={handlePhotoCapture}>
                    {profilePhoto ? (
                        <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
                    ) : (
                        <View style={styles.photoPlaceholder}>
                            <Ionicons name="camera" size={32} color="#666666" />
                            <Text style={styles.photoText}>Tap to add photo</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Full Name */}
            <View style={styles.section}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter your full name"
                    placeholderTextColor="#666666"
                    autoCapitalize="words"
                />
            </View>


            {/* Email */}
            <View style={styles.section}>
                <Text style={styles.label}>Email Address</Text>
                <Text style={styles.helperText}>Optional • For important notifications</Text>
                <TextInput
                    style={[
                        styles.input,
                        email && !validateEmail(email) && styles.inputError,
                    ]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email address"
                    placeholderTextColor="#666666"
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                {email && !validateEmail(email) && (
                    <Text style={styles.errorText}>Please enter a valid email address</Text>
                )}
            </View>


            <View style={styles.infoContainer}>
                <Ionicons name="information-circle" size={20} color="#007AFF" />
                <Text style={styles.infoText}>
                    Your phone number is automatically set from your account.
                    Additional details will be collected based on your selected role.
                </Text>
            </View>
        </View>
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
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 8,
    },
    helperText: {
        fontSize: 12,
        color: '#999999',
        marginBottom: 8,
        lineHeight: 16,
    },
    photoContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#007AFF',
    },
    photoPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#222222',
        borderWidth: 2,
        borderColor: '#333333',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoText: {
        color: '#666666',
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#222222',
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
        color: '#ffffff',
        borderWidth: 1,
        borderColor: '#333333',
    },
    inputError: {
        borderColor: '#FF3B30',
    },
    errorText: {
        fontSize: 12,
        color: '#FF3B30',
        marginTop: 4,
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderRadius: 8,
        padding: 16,
        marginTop: 24,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: '#007AFF',
        lineHeight: 20,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderRadius: 6,
        padding: 12,
        marginTop: 8,
        gap: 8,
    },
});