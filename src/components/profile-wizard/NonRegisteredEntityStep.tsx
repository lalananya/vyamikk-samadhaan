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

interface NonRegisteredEntityStepProps {
    data: Partial<ProfileData>;
    onDataChange: (data: Partial<ProfileData>) => void;
    mode: 'self' | 'admin';
}

const SERVICE_TYPES = [
    'Home Services', 'Repair & Maintenance', 'Cleaning Services', 'Delivery Services',
    'Personal Care', 'Tutoring', 'Consulting', 'Freelance Work', 'Gig Work',
    'Event Services', 'Transportation', 'Pet Services', 'Gardening',
    'Security Services', 'Catering', 'Photography', 'Other'
];

const SERVICE_SKILLS = [
    'Customer Service', 'Problem Solving', 'Time Management', 'Communication',
    'Technical Skills', 'Physical Work', 'Driving', 'Cooking', 'Cleaning',
    'Repair Work', 'Teaching', 'Photography', 'Event Planning', 'Sales',
    'Administration', 'IT Support', 'Healthcare', 'Childcare', 'Elderly Care',
    'Pet Care', 'Gardening', 'Security', 'Transportation', 'Delivery'
];

const LOCATION_TYPES = [
    'Local Area', 'City-wide', 'State-wide', 'National', 'Online Services'
];

export default function NonRegisteredEntityStep({ data, onDataChange, mode }: NonRegisteredEntityStepProps) {
    const [serviceType, setServiceType] = useState(data.roleDetails?.serviceType || '');
    const [workingLocation, setWorkingLocation] = useState(data.roleDetails?.workingLocation || '');
    const [serviceSkills, setServiceSkills] = useState<string[]>(data.roleDetails?.serviceSkills || []);
    const [serviceDescription, setServiceDescription] = useState(data.roleDetails?.serviceDescription || '');
    const [customServiceType, setCustomServiceType] = useState('');
    const [customSkill, setCustomSkill] = useState('');

    useEffect(() => {
        onDataChange({
            roleDetails: {
                serviceType,
                workingLocation,
                serviceSkills,
                serviceDescription,
            },
        });
    }, [serviceType, workingLocation, serviceSkills, serviceDescription]);

    const handleServiceTypeSelect = (type: string) => {
        setServiceType(type);
    };

    const handleCustomServiceType = () => {
        if (customServiceType.trim()) {
            setServiceType(customServiceType.trim());
            setCustomServiceType('');
        }
    };

    const handleSkillToggle = (skill: string) => {
        if (serviceSkills.includes(skill)) {
            setServiceSkills(serviceSkills.filter(s => s !== skill));
        } else if (serviceSkills.length < 10) {
            setServiceSkills([...serviceSkills, skill]);
        }
    };

    const handleAddCustomSkill = () => {
        if (customSkill.trim() && !serviceSkills.includes(customSkill.trim()) && serviceSkills.length < 10) {
            setServiceSkills([...serviceSkills, customSkill.trim()]);
            setCustomSkill('');
        }
    };

    const handleRemoveSkill = (skill: string) => {
        setServiceSkills(serviceSkills.filter(s => s !== skill));
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.title}>Service Provider Details</Text>
                <Text style={styles.subtitle}>
                    Tell us about the services you provide and your working area
                </Text>
            </View>

            {/* Service Type */}
            <View style={styles.section}>
                <Text style={styles.label}>Type of Services *</Text>
                <Text style={styles.helperText}>
                    What kind of services do you provide?
                </Text>

                {/* Service Type Options */}
                <View style={styles.serviceTypeContainer}>
                    {SERVICE_TYPES.map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={[
                                styles.serviceTypeChip,
                                serviceType === type && styles.serviceTypeChipSelected,
                            ]}
                            onPress={() => handleServiceTypeSelect(type)}
                        >
                            <Text
                                style={[
                                    styles.serviceTypeChipText,
                                    serviceType === type && styles.serviceTypeChipTextSelected,
                                ]}
                            >
                                {type}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Custom Service Type Input */}
                <View style={styles.customServiceContainer}>
                    <TextInput
                        style={styles.customServiceInput}
                        value={customServiceType}
                        onChangeText={setCustomServiceType}
                        placeholder="Enter custom service type"
                        placeholderTextColor="#666666"
                        onSubmitEditing={handleCustomServiceType}
                    />
                    <TouchableOpacity
                        style={[
                            styles.addServiceButton,
                            !customServiceType.trim() && styles.addServiceButtonDisabled,
                        ]}
                        onPress={handleCustomServiceType}
                        disabled={!customServiceType.trim()}
                    >
                        <Ionicons name="add" size={20} color="#007AFF" />
                    </TouchableOpacity>
                </View>

                {serviceType && (
                    <View style={styles.selectedServiceContainer}>
                        <Text style={styles.selectedServiceText}>
                            Selected: {serviceType}
                        </Text>
                    </View>
                )}
            </View>

            {/* Working Location */}
            <View style={styles.section}>
                <Text style={styles.label}>Working Location *</Text>
                <Text style={styles.helperText}>
                    Where do you provide your services?
                </Text>
                <TextInput
                    style={styles.input}
                    value={workingLocation}
                    onChangeText={setWorkingLocation}
                    placeholder="e.g., Mumbai, Delhi, Bangalore, or specific areas"
                    placeholderTextColor="#666666"
                />
            </View>

            {/* Service Skills */}
            <View style={styles.section}>
                <Text style={styles.label}>Service Skills</Text>
                <Text style={styles.helperText}>
                    Select up to 10 skills relevant to your services
                </Text>

                {/* Skill Suggestions */}
                <View style={styles.skillContainer}>
                    {SERVICE_SKILLS.map((skill) => (
                        <TouchableOpacity
                            key={skill}
                            style={[
                                styles.skillChip,
                                serviceSkills.includes(skill) && styles.skillChipSelected,
                                serviceSkills.includes(skill) || serviceSkills.length < 10 ? {} : styles.skillChipDisabled,
                            ]}
                            onPress={() => handleSkillToggle(skill)}
                            disabled={!serviceSkills.includes(skill) && serviceSkills.length >= 10}
                        >
                            <Text
                                style={[
                                    styles.skillChipText,
                                    serviceSkills.includes(skill) && styles.skillChipTextSelected,
                                ]}
                            >
                                {skill}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Custom Skill Input */}
                <View style={styles.customSkillContainer}>
                    <TextInput
                        style={styles.customSkillInput}
                        value={customSkill}
                        onChangeText={setCustomSkill}
                        placeholder="Add custom skill"
                        placeholderTextColor="#666666"
                        onSubmitEditing={handleAddCustomSkill}
                    />
                    <TouchableOpacity
                        style={[
                            styles.addSkillButton,
                            (!customSkill.trim() || serviceSkills.includes(customSkill.trim()) || serviceSkills.length >= 10) && styles.addSkillButtonDisabled,
                        ]}
                        onPress={handleAddCustomSkill}
                        disabled={!customSkill.trim() || serviceSkills.includes(customSkill.trim()) || serviceSkills.length >= 10}
                    >
                        <Ionicons name="add" size={20} color="#007AFF" />
                    </TouchableOpacity>
                </View>

                {/* Selected Skills */}
                {serviceSkills.length > 0 && (
                    <View style={styles.selectedSkillsContainer}>
                        <Text style={styles.selectedSkillsTitle}>Selected Skills:</Text>
                        <View style={styles.selectedSkillsList}>
                            {serviceSkills.map((skill) => (
                                <View key={skill} style={styles.selectedSkillChip}>
                                    <Text style={styles.selectedSkillText}>{skill}</Text>
                                    <TouchableOpacity
                                        style={styles.removeSkillButton}
                                        onPress={() => handleRemoveSkill(skill)}
                                    >
                                        <Ionicons name="close" size={16} color="#ffffff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                        <Text style={styles.counterText}>
                            {serviceSkills.length}/10 selected
                        </Text>
                    </View>
                )}
            </View>

            {/* Service Description */}
            <View style={styles.section}>
                <Text style={styles.label}>Service Description</Text>
                <Text style={styles.helperText}>
                    Describe your services, experience, and what makes you unique
                </Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={serviceDescription}
                    onChangeText={setServiceDescription}
                    placeholder="Tell us about your services, experience, rates, availability, and what makes you stand out..."
                    placeholderTextColor="#666666"
                    multiline
                    numberOfLines={5}
                />
            </View>

            <View style={styles.infoContainer}>
                <Ionicons name="information-circle" size={20} color="#007AFF" />
                <Text style={styles.infoText}>
                    Your service information will help potential customers find and connect with you.
                    Be specific about your offerings and working areas.
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
    serviceTypeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    serviceTypeChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 122, 255, 0.3)',
    },
    serviceTypeChipSelected: {
        backgroundColor: '#007AFF',
    },
    serviceTypeChipText: {
        color: '#007AFF',
        fontSize: 12,
        fontWeight: '500',
    },
    serviceTypeChipTextSelected: {
        color: '#ffffff',
    },
    customServiceContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    customServiceInput: {
        flex: 1,
        backgroundColor: '#222222',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#ffffff',
        borderWidth: 1,
        borderColor: '#333333',
    },
    addServiceButton: {
        width: 44,
        height: 44,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 122, 255, 0.3)',
    },
    addServiceButtonDisabled: {
        opacity: 0.3,
    },
    selectedServiceContainer: {
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
    },
    selectedServiceText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '500',
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
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    skillContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    skillChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 122, 255, 0.3)',
    },
    skillChipSelected: {
        backgroundColor: '#007AFF',
    },
    skillChipDisabled: {
        opacity: 0.3,
    },
    skillChipText: {
        color: '#007AFF',
        fontSize: 12,
        fontWeight: '500',
    },
    skillChipTextSelected: {
        color: '#ffffff',
    },
    customSkillContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    customSkillInput: {
        flex: 1,
        backgroundColor: '#222222',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#ffffff',
        borderWidth: 1,
        borderColor: '#333333',
    },
    addSkillButton: {
        width: 44,
        height: 44,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 122, 255, 0.3)',
    },
    addSkillButtonDisabled: {
        opacity: 0.3,
    },
    selectedSkillsContainer: {
        marginTop: 8,
    },
    selectedSkillsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 8,
    },
    selectedSkillsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    selectedSkillChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    selectedSkillText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '500',
        marginRight: 4,
    },
    removeSkillButton: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    counterText: {
        fontSize: 12,
        color: '#999999',
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

