import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileData } from '../../types/Profile';

interface ProfessionalServicesStepProps {
    data: Partial<ProfileData>;
    onDataChange: (data: Partial<ProfileData>) => void;
    mode: 'self' | 'admin';
}

const PROFESSIONS = [
    { id: 'CA', label: 'Chartered Accountant', icon: 'calculator' },
    { id: 'Advocate', label: 'Advocate/Lawyer', icon: 'scale' },
    { id: 'CS', label: 'Company Secretary', icon: 'briefcase' },
    { id: 'Doctor', label: 'Doctor', icon: 'medical' },
    { id: 'Engineer', label: 'Engineer', icon: 'construct' },
    { id: 'Consultant', label: 'Consultant', icon: 'people' },
    { id: 'Other', label: 'Other Professional', icon: 'person' },
];

const EXPERIENCE_OPTIONS = [
    '0-1 years',
    '1-3 years',
    '3-5 years',
    '5-10 years',
    '10-15 years',
    '15+ years',
];

const CREDENTIAL_SUGGESTIONS = [
    'Professional Certification',
    'Industry Recognition',
    'Award Winner',
    'Published Author',
    'Conference Speaker',
    'Board Member',
    'Committee Member',
    'Mentor',
    'Trainer',
    'Expert Witness',
];

export default function ProfessionalServicesStep({ data, onDataChange, mode }: ProfessionalServicesStepProps) {
    const [profession, setProfession] = useState(data.roleDetails?.profession || 'CA');
    const [professionalId, setProfessionalId] = useState(data.roleDetails?.professionalId || '');
    const [specialization, setSpecialization] = useState(data.roleDetails?.specialization || '');
    const [experience, setExperience] = useState(data.roleDetails?.experience || '');
    const [credentials, setCredentials] = useState<string[]>(data.roleDetails?.credentials || []);
    const [customCredential, setCustomCredential] = useState('');

    useEffect(() => {
        onDataChange({
            roleDetails: {
                profession,
                professionalId,
                specialization,
                experience,
                credentials,
            },
        });
    }, [profession, professionalId, specialization, experience, credentials]);

    const handleProfessionSelect = (selectedProfession: string) => {
        setProfession(selectedProfession as any);
    };

    const handleCredentialToggle = (credential: string) => {
        if (credentials.includes(credential)) {
            setCredentials(credentials.filter(c => c !== credential));
        } else {
            setCredentials([...credentials, credential]);
        }
    };

    const handleAddCustomCredential = () => {
        if (customCredential.trim() && !credentials.includes(customCredential.trim())) {
            setCredentials([...credentials, customCredential.trim()]);
            setCustomCredential('');
        }
    };

    const handleRemoveCredential = (credential: string) => {
        setCredentials(credentials.filter(c => c !== credential));
    };

    const getProfessionIcon = (prof: string) => {
        const profData = PROFESSIONS.find(p => p.id === prof);
        return profData?.icon || 'person';
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.title}>Professional Details</Text>
                <Text style={styles.subtitle}>
                    Tell us about your professional qualifications and expertise
                </Text>
            </View>

            {/* Profession Selection */}
            <View style={styles.section}>
                <Text style={styles.label}>Profession *</Text>
                <View style={styles.professionGrid}>
                    {PROFESSIONS.map((prof) => (
                        <TouchableOpacity
                            key={prof.id}
                            style={[
                                styles.professionCard,
                                profession === prof.id && styles.professionCardSelected,
                            ]}
                            onPress={() => handleProfessionSelect(prof.id)}
                        >
                            <Ionicons
                                name={prof.icon as any}
                                size={24}
                                color={profession === prof.id ? '#ffffff' : '#007AFF'}
                            />
                            <Text
                                style={[
                                    styles.professionText,
                                    profession === prof.id && styles.professionTextSelected,
                                ]}
                            >
                                {prof.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Professional ID */}
            <View style={styles.section}>
                <Text style={styles.label}>Professional ID/Registration Number</Text>
                <Text style={styles.helperText}>
                    Your professional body registration number (e.g., ICAI membership number)
                </Text>
                <TextInput
                    style={styles.input}
                    value={professionalId}
                    onChangeText={setProfessionalId}
                    placeholder="Enter your professional ID"
                    placeholderTextColor="#666666"
                />
            </View>

            {/* Specialization */}
            <View style={styles.section}>
                <Text style={styles.label}>Specialization</Text>
                <Text style={styles.helperText}>
                    Your area of expertise or specialization
                </Text>
                <TextInput
                    style={styles.input}
                    value={specialization}
                    onChangeText={setSpecialization}
                    placeholder="e.g., Tax Law, Corporate Law, Internal Medicine"
                    placeholderTextColor="#666666"
                />
            </View>

            {/* Experience */}
            <View style={styles.section}>
                <Text style={styles.label}>Years of Experience *</Text>
                <View style={styles.experienceContainer}>
                    {EXPERIENCE_OPTIONS.map((exp) => (
                        <TouchableOpacity
                            key={exp}
                            style={[
                                styles.experienceButton,
                                experience === exp && styles.experienceButtonSelected,
                            ]}
                            onPress={() => setExperience(exp)}
                        >
                            <Text
                                style={[
                                    styles.experienceText,
                                    experience === exp && styles.experienceTextSelected,
                                ]}
                            >
                                {exp}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Credentials */}
            <View style={styles.section}>
                <Text style={styles.label}>Professional Credentials</Text>
                <Text style={styles.helperText}>
                    Select your professional achievements and recognitions
                </Text>

                {/* Credential Suggestions */}
                <View style={styles.credentialContainer}>
                    {CREDENTIAL_SUGGESTIONS.map((credential) => (
                        <TouchableOpacity
                            key={credential}
                            style={[
                                styles.credentialChip,
                                credentials.includes(credential) && styles.credentialChipSelected,
                            ]}
                            onPress={() => handleCredentialToggle(credential)}
                        >
                            <Text
                                style={[
                                    styles.credentialChipText,
                                    credentials.includes(credential) && styles.credentialChipTextSelected,
                                ]}
                            >
                                {credential}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Custom Credential Input */}
                <View style={styles.customCredentialContainer}>
                    <TextInput
                        style={styles.customCredentialInput}
                        value={customCredential}
                        onChangeText={setCustomCredential}
                        placeholder="Add custom credential"
                        placeholderTextColor="#666666"
                        onSubmitEditing={handleAddCustomCredential}
                    />
                    <TouchableOpacity
                        style={[
                            styles.addCredentialButton,
                            (!customCredential.trim() || credentials.includes(customCredential.trim())) && styles.addCredentialButtonDisabled,
                        ]}
                        onPress={handleAddCustomCredential}
                        disabled={!customCredential.trim() || credentials.includes(customCredential.trim())}
                    >
                        <Ionicons name="add" size={20} color="#007AFF" />
                    </TouchableOpacity>
                </View>

                {/* Selected Credentials */}
                {credentials.length > 0 && (
                    <View style={styles.selectedCredentialsContainer}>
                        <Text style={styles.selectedCredentialsTitle}>Selected Credentials:</Text>
                        <View style={styles.selectedCredentialsList}>
                            {credentials.map((credential) => (
                                <View key={credential} style={styles.selectedCredentialChip}>
                                    <Text style={styles.selectedCredentialText}>{credential}</Text>
                                    <TouchableOpacity
                                        style={styles.removeCredentialButton}
                                        onPress={() => handleRemoveCredential(credential)}
                                    >
                                        <Ionicons name="close" size={16} color="#ffffff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </View>

            <View style={styles.infoContainer}>
                <Ionicons name="information-circle" size={20} color="#007AFF" />
                <Text style={styles.infoText}>
                    Your professional credentials will be verified during the approval process.
                    Please ensure all information is accurate and up-to-date.
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
    professionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    professionCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    professionCardSelected: {
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderColor: '#007AFF',
    },
    professionText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#ffffff',
        textAlign: 'center',
        marginTop: 8,
    },
    professionTextSelected: {
        color: '#007AFF',
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
    experienceContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    experienceButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 122, 255, 0.3)',
    },
    experienceButtonSelected: {
        backgroundColor: '#007AFF',
    },
    experienceText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '500',
    },
    experienceTextSelected: {
        color: '#ffffff',
    },
    credentialContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    credentialChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 122, 255, 0.3)',
    },
    credentialChipSelected: {
        backgroundColor: '#007AFF',
    },
    credentialChipText: {
        color: '#007AFF',
        fontSize: 12,
        fontWeight: '500',
    },
    credentialChipTextSelected: {
        color: '#ffffff',
    },
    customCredentialContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    customCredentialInput: {
        flex: 1,
        backgroundColor: '#222222',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#ffffff',
        borderWidth: 1,
        borderColor: '#333333',
    },
    addCredentialButton: {
        width: 44,
        height: 44,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 122, 255, 0.3)',
    },
    addCredentialButtonDisabled: {
        opacity: 0.3,
    },
    selectedCredentialsContainer: {
        marginTop: 8,
    },
    selectedCredentialsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 8,
    },
    selectedCredentialsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    selectedCredentialChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    selectedCredentialText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '500',
        marginRight: 4,
    },
    removeCredentialButton: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
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
});

