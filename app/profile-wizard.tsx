import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Switch,
    Alert,
    SafeAreaView,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../src/hooks/useI18n';

interface ProfileData {
    role: 'company' | 'professional' | 'employee';
    fullName: string;
    roleSpecificName: string; // Proprietor/Director/Partner for company, Designation for employee, Qualification for professional
    pin: string;
    email: string;
    aadhaar: string;
    pan: string;
    // Company specific
    companyType?: string; // Proprietorship, Partnership, Private Limited, etc.
    // Employee specific
    designation?: string; // Manager, Executive, etc.
    department?: string;
    // Professional specific
    qualification?: string; // CA, Advocate, CS, etc.
    practiceArea?: string;
}

const STEPS = [
    { id: 'role', title: 'Select your role' },
    { id: 'details', title: 'Tell us about yourself' },
    { id: 'review', title: 'Review & confirm' },
];

export default function ProfileWizard() {
    const { t } = useI18n();
    const [currentStep, setCurrentStep] = useState(0);
    const [profileData, setProfileData] = useState<ProfileData>({
        role: 'professional',
        fullName: '',
        roleSpecificName: '',
        pin: '',
        email: '',
        aadhaar: '',
        pan: '',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadUserData();
    }, []);


    const loadUserData = async () => {
        try {
            // TODO: Load from /api/v1/auth/me
            // For now, use defaults
        } catch (error) {
            console.error('Failed to load user data:', error);
        }
    };

    const saveDraft = async () => {
        try {
            // TODO: Save draft to backend
            Alert.alert('Draft saved', 'Your progress has been saved');
        } catch (error) {
            Alert.alert('Error', 'Failed to save draft');
        }
    };

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 0:
                // Step 1: Role selection - only need role to be selected
                return profileData.role.length > 0;
            case 1:
                // Step 2: Details - need role-specific fields and basic info
                const hasBasicInfo = profileData.fullName.trim().length > 0 && 
                                   profileData.pin.length === 4 && 
                                   /^\d{4}$/.test(profileData.pin);
                
                // Check role-specific required fields
                const hasRoleSpecificInfo = profileData.roleSpecificName.trim().length > 0;
                
                
                return hasBasicInfo && hasRoleSpecificInfo;
            case 2:
                // Step 3: Review - all previous validations should be met
                return profileData.fullName.trim().length > 0 && 
                       profileData.pin.length === 4 && 
                       /^\d{4}$/.test(profileData.pin) &&
                       profileData.role.length > 0 &&
                       profileData.roleSpecificName.trim().length > 0;
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            if (validateStep(currentStep)) {
                setCurrentStep(currentStep + 1);
            } else {
                Alert.alert('Required fields', 'Please fill in all required fields');
            }
        } else {
            handleFinish();
        }
    };

    const handleFinish = async () => {
        try {
            setLoading(true);
            
            // Generate UEID using the UniqueIdGenerator
            const { uniqueIdGenerator } = await import('../src/services/UniqueIdGenerator');
            const uniqueIdData = await uniqueIdGenerator.generateUniqueId(profileData);
            
            // Save profile data to user state
            const { appState } = await import('../src/state/AppState');
            const currentUser = appState.getUser();
            
            if (currentUser) {
                // Update user with profile data
                const updatedUser = {
                    ...currentUser,
                    ...profileData,
                    ueid: uniqueIdData.ecosystemId,
                    onboardingCompleted: true
                };
                
                appState.setUser(updatedUser);
                console.log('Profile data saved to user state:', updatedUser);
            }
            
            // TODO: Submit profile data and UEID to backend
            console.log('Generated UEID:', uniqueIdData.ecosystemId);
            
            Alert.alert(
                'Profile Completed!', 
                `Your Unique Ecosystem ID (UEID) is:\n\n${uniqueIdData.ecosystemId}\n\nThis ID is visible to other users in the app.`, 
                [
                    { text: 'OK', onPress: () => router.replace('/main') }
                ]
            );
        } catch (error) {
            console.error('Profile completion error:', error);
            Alert.alert('Error', 'Failed to complete profile');
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 0:
                return <RoleSelectionStep data={profileData} onChange={setProfileData} />;
            case 1:
                return <DetailsStep data={profileData} onChange={setProfileData} />;
            case 2:
                return <ReviewStep data={profileData} />;
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1C1C1E" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Complete Profile</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View 
                        style={[
                            styles.progressFill, 
                            { width: `${((currentStep + 1) / STEPS.length) * 100}%` }
                        ]} 
                    />
                </View>
                <Text style={styles.progressText}>Step {currentStep + 1} of {STEPS.length}</Text>
            </View>

            <KeyboardAvoidingView 
                style={styles.content} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    {renderStep()}
                </ScrollView>

                {/* Bottom Actions */}
                <View style={styles.bottomActions}>
                    <TouchableOpacity 
                        style={styles.secondaryButton} 
                        onPress={saveDraft}
                    >
                        <Text style={styles.secondaryButtonText}>Save & Exit</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[
                            styles.primaryButton, 
                            !validateStep(currentStep) && styles.primaryButtonDisabled
                        ]} 
                        onPress={handleNext}
                        disabled={!validateStep(currentStep) || loading}
                    >
                        <Text style={styles.primaryButtonText}>
                            {currentStep === STEPS.length - 1 ? 'Finish' : 'Continue'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// Step 1: Role Selection
function RoleSelectionStep({ data, onChange }: { data: ProfileData; onChange: (data: ProfileData) => void }) {
    const roles = [
        { 
            id: 'company', 
            label: 'Company/Organization', 
            icon: 'business',
            description: 'Business owner, director, or partner'
        },
        { 
            id: 'professional', 
            label: 'Professional', 
            icon: 'person',
            description: 'CA, Advocate, CS, or other professional'
        },
        { 
            id: 'employee', 
            label: 'Employee', 
            icon: 'briefcase',
            description: 'Working for a company or organization'
        },
    ];

    return (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Your Role</Text>
            <Text style={styles.stepSubtitle}>Choose the role that best describes you</Text>

            <View style={styles.roleSelectionContainer}>
                {roles.map((role) => (
                    <TouchableOpacity
                        key={role.id}
                        style={[
                            styles.roleCard,
                            data.role === role.id && styles.roleCardSelected
                        ]}
                        onPress={() => onChange({ ...data, role: role.id as any })}
                    >
                        <View style={styles.roleCardHeader}>
                            <View style={[
                                styles.roleIconContainer,
                                data.role === role.id && styles.roleIconContainerSelected
                            ]}>
                                <Ionicons 
                                    name={role.icon as any} 
                                    size={24} 
                                    color={data.role === role.id ? '#FFFFFF' : '#007AFF'} 
                                />
                            </View>
                            <View style={styles.roleCardContent}>
                                <Text style={[
                                    styles.roleCardTitle,
                                    data.role === role.id && styles.roleCardTitleSelected
                                ]}>
                                    {role.label}
                                </Text>
                                <Text style={[
                                    styles.roleCardDescription,
                                    data.role === role.id && styles.roleCardDescriptionSelected
                                ]}>
                                    {role.description}
                                </Text>
                            </View>
                            {data.role === role.id && (
                                <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}


// Step 3: Compliance (Optional)
// Step 2: Role-Specific Details
function DetailsStep({ data, onChange }: { data: ProfileData; onChange: (data: ProfileData) => void }) {
    const getRoleSpecificFields = () => {
        switch (data.role) {
            case 'company':
                return (
                    <>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Company/Organization Name</Text>
                            <TextInput
                                style={styles.textInput}
                                value={data.fullName}
                                onChangeText={(text) => onChange({ ...data, fullName: text })}
                                placeholder="Enter company name"
                                placeholderTextColor="#8E8E93"
                            />
                        </View>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Your Name & Designation</Text>
                            <TextInput
                                style={styles.textInput}
                                value={data.roleSpecificName}
                                onChangeText={(text) => onChange({ ...data, roleSpecificName: text })}
                                placeholder="e.g., John Doe - Proprietor/Director/Partner"
                                placeholderTextColor="#8E8E93"
                            />
                            <Text style={styles.fieldHelper}>Enter your name and position in the company</Text>
                        </View>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Company Type</Text>
                            <TextInput
                                style={styles.textInput}
                                value={data.companyType || ''}
                                onChangeText={(text) => onChange({ ...data, companyType: text })}
                                placeholder="e.g., Proprietorship, Partnership, Private Limited"
                                placeholderTextColor="#8E8E93"
                            />
                        </View>
                    </>
                );
            case 'employee':
                return (
                    <>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Your Full Name</Text>
                            <TextInput
                                style={styles.textInput}
                                value={data.fullName}
                                onChangeText={(text) => onChange({ ...data, fullName: text })}
                                placeholder="Enter your full name"
                                placeholderTextColor="#8E8E93"
                            />
                        </View>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Designation & Department</Text>
                            <TextInput
                                style={styles.textInput}
                                value={data.roleSpecificName}
                                onChangeText={(text) => onChange({ ...data, roleSpecificName: text })}
                                placeholder="e.g., Manager - Sales Department"
                                placeholderTextColor="#8E8E93"
                            />
                            <Text style={styles.fieldHelper}>Enter your job title and department</Text>
                        </View>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Company Name</Text>
                            <TextInput
                                style={styles.textInput}
                                value={data.department || ''}
                                onChangeText={(text) => onChange({ ...data, department: text })}
                                placeholder="Name of your employer"
                                placeholderTextColor="#8E8E93"
                            />
                        </View>
                    </>
                );
            case 'professional':
                return (
                    <>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Your Full Name</Text>
                            <TextInput
                                style={styles.textInput}
                                value={data.fullName}
                                onChangeText={(text) => onChange({ ...data, fullName: text })}
                                placeholder="Enter your full name"
                                placeholderTextColor="#8E8E93"
                            />
                        </View>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Professional Qualification</Text>
                            <TextInput
                                style={styles.textInput}
                                value={data.roleSpecificName}
                                onChangeText={(text) => onChange({ ...data, roleSpecificName: text })}
                                placeholder="e.g., CA, Advocate, CS, Doctor, Engineer"
                                placeholderTextColor="#8E8E93"
                            />
                            <Text style={styles.fieldHelper}>Enter your professional qualification</Text>
                        </View>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Practice Area</Text>
                            <TextInput
                                style={styles.textInput}
                                value={data.practiceArea || ''}
                                onChangeText={(text) => onChange({ ...data, practiceArea: text })}
                                placeholder="e.g., Tax Advisory, Corporate Law, Audit"
                                placeholderTextColor="#8E8E93"
                            />
                        </View>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Tell Us About Yourself</Text>
            <Text style={styles.stepSubtitle}>
                {data.role === 'company' && 'Provide details about your company and your role'}
                {data.role === 'employee' && 'Tell us about your employment details'}
                {data.role === 'professional' && 'Share your professional qualifications'}
            </Text>

            {getRoleSpecificFields()}

            <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>4-Digit PIN</Text>
                <TextInput
                    style={styles.textInput}
                    value={data.pin}
                    onChangeText={(text) => {
                        const numericText = text.replace(/[^0-9]/g, '');
                        if (numericText.length <= 4) {
                            onChange({ ...data, pin: numericText });
                        }
                    }}
                    placeholder="1234"
                    placeholderTextColor="#8E8E93"
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                />
                <Text style={styles.fieldHelper}>Create a 4-digit PIN for secure access</Text>
            </View>

            <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <TextInput
                    style={styles.textInput}
                    value={data.email}
                    onChangeText={(text) => onChange({ ...data, email: text })}
                    placeholder="your@email.com"
                    placeholderTextColor="#8E8E93"
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <Text style={styles.fieldHelper}>For important updates and notifications</Text>
            </View>

            <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Aadhaar Number (Optional)</Text>
                <TextInput
                    style={styles.textInput}
                    value={data.aadhaar}
                    onChangeText={(text) => {
                        const numericText = text.replace(/[^0-9]/g, '');
                        if (numericText.length <= 12) {
                            onChange({ ...data, aadhaar: numericText });
                        }
                    }}
                    placeholder="1234 5678 9012"
                    placeholderTextColor="#8E8E93"
                    keyboardType="numeric"
                    maxLength={12}
                />
                <Text style={styles.fieldHelper}>12-digit Aadhaar number for verification</Text>
            </View>

            <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>PAN Number (Optional)</Text>
                <TextInput
                    style={styles.textInput}
                    value={data.pan}
                    onChangeText={(text) => onChange({ ...data, pan: text.toUpperCase() })}
                    placeholder="ABCDE1234F"
                    placeholderTextColor="#8E8E93"
                    autoCapitalize="characters"
                    maxLength={10}
                />
                <Text style={styles.fieldHelper}>10-character PAN number for verification</Text>
            </View>
        </View>
    );
}

// Step 3: Review & Confirm
function ReviewStep({ data }: { data: ProfileData }) {
    const { t } = useI18n();
    const [generatedUEID, setGeneratedUEID] = useState<string>('');
    
    useEffect(() => {
        // Generate UEID preview for display
        const generatePreview = async () => {
            try {
                const { uniqueIdGenerator } = await import('../src/services/UniqueIdGenerator');
                const uniqueIdData = await uniqueIdGenerator.generateUniqueId(data);
                setGeneratedUEID(uniqueIdData.ecosystemId);
            } catch (error) {
                console.error('Error generating UEID preview:', error);
                setGeneratedUEID('VS-' + (data.pin || '0000') + '-XXXX-XXXX');
            }
        };
        
        if (data.pin && data.pin.length === 4) {
            generatePreview();
        }
    }, [data]);
    
    return (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t('profile-wizard.review.title')}</Text>
            <Text style={styles.stepSubtitle}>{t('profile-wizard.review.subtitle')}</Text>

            <View style={styles.reviewList}>
                <View style={styles.reviewItem}>
                    <Text style={styles.reviewLabel}>Role</Text>
                    <Text style={styles.reviewValue}>
                        {data.role === 'company' ? 'Company/Organization' : 
                         data.role === 'professional' ? 'Professional' : 'Employee'}
                    </Text>
                </View>
                
                <View style={styles.reviewItem}>
                    <Text style={styles.reviewLabel}>
                        {data.role === 'company' ? 'Company Name' : 'Full Name'}
                    </Text>
                    <Text style={styles.reviewValue}>{data.fullName || 'Not provided'}</Text>
                </View>
                
                <View style={styles.reviewItem}>
                    <Text style={styles.reviewLabel}>
                        {data.role === 'company' ? 'Your Name & Designation' : 
                         data.role === 'employee' ? 'Designation & Department' : 
                         'Professional Qualification'}
                    </Text>
                    <Text style={styles.reviewValue}>{data.roleSpecificName || 'Not provided'}</Text>
                </View>
                
                {data.role === 'company' && data.companyType && (
                    <View style={styles.reviewItem}>
                        <Text style={styles.reviewLabel}>Company Type</Text>
                        <Text style={styles.reviewValue}>{data.companyType}</Text>
                    </View>
                )}
                
                {data.role === 'employee' && data.department && (
                    <View style={styles.reviewItem}>
                        <Text style={styles.reviewLabel}>Company Name</Text>
                        <Text style={styles.reviewValue}>{data.department}</Text>
                    </View>
                )}
                
                {data.role === 'professional' && data.practiceArea && (
                    <View style={styles.reviewItem}>
                        <Text style={styles.reviewLabel}>Practice Area</Text>
                        <Text style={styles.reviewValue}>{data.practiceArea}</Text>
                    </View>
                )}
                
                <View style={styles.reviewItem}>
                    <Text style={styles.reviewLabel}>4-Digit PIN</Text>
                    <Text style={styles.reviewValue}>••••</Text>
                </View>
                
                <View style={styles.reviewItem}>
                    <Text style={styles.reviewLabel}>Email Address</Text>
                    <Text style={styles.reviewValue}>{data.email || 'Not provided'}</Text>
                </View>
                
                <View style={styles.reviewItem}>
                    <Text style={styles.reviewLabel}>Generated UEID</Text>
                    <Text style={[styles.reviewValue, styles.ueidValue]}>
                        {generatedUEID || 'VS-' + (data.pin || '0000') + '-XXXX-XXXX'}
                    </Text>
                </View>
                {data.aadhaar && (
                    <View style={styles.reviewItem}>
                        <Text style={styles.reviewLabel}>{t('profile-wizard.review.aadhaar')}</Text>
                        <Text style={styles.reviewValue}>•••• •••• {data.aadhaar.slice(-4)}</Text>
                    </View>
                )}
                {data.pan && (
                    <View style={styles.reviewItem}>
                        <Text style={styles.reviewLabel}>{t('profile-wizard.review.pan')}</Text>
                        <Text style={styles.reviewValue}>{data.pan}</Text>
                    </View>
                )}
            </View>
        </View>
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
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#1C1C1E',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    placeholder: {
        width: 32,
    },
    progressContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#1C1C1E',
    },
    progressBar: {
        height: 4,
        backgroundColor: '#3A3A3C',
        borderRadius: 2,
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4A90E2',
        borderRadius: 2,
    },
    progressText: {
        fontSize: 12,
        color: '#8E8E93',
        textAlign: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    scrollView: {
        flex: 1,
    },
    stepContainer: {
        paddingVertical: 32,
        paddingHorizontal: 24,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    stepSubtitle: {
        fontSize: 15,
        color: '#8E8E93',
        marginBottom: 28,
        lineHeight: 20,
    },
    fieldGroup: {
        marginBottom: 20,
    },
    fieldLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: '#3A3A3C',
        paddingHorizontal: 0,
        paddingVertical: 12,
        fontSize: 16,
        color: '#FFFFFF',
        minHeight: 44,
    },
    fieldHelper: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 4,
    },
    fieldDisclaimer: {
        fontSize: 11,
        color: '#FF9500',
        marginTop: 6,
        fontStyle: 'italic',
    },
    privacyNote: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        paddingVertical: 8,
    },
    privacyNoteText: {
        fontSize: 14,
        color: '#8E8E93',
        marginLeft: 8,
    },
    reviewList: {
        marginTop: 8,
    },
    roleContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    roleChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: 'transparent',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#3A3A3C',
        gap: 10,
        minHeight: 48,
    },
    roleChipSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    roleChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#8E8E93',
    },
    roleChipTextSelected: {
        color: '#FFFFFF',
    },
    roleSelectionContainer: {
        gap: 16,
    },
    roleCard: {
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: '#3A3A3C',
    },
    roleCardSelected: {
        borderColor: '#007AFF',
        backgroundColor: '#1A1A1C',
    },
    roleCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    roleIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    roleIconContainerSelected: {
        backgroundColor: '#007AFF',
    },
    roleCardContent: {
        flex: 1,
    },
    roleCardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    roleCardTitleSelected: {
        color: '#FFFFFF',
    },
    roleCardDescription: {
        fontSize: 14,
        color: '#8E8E93',
        lineHeight: 18,
    },
    roleCardDescriptionSelected: {
        color: '#A0A0A0',
    },
    preferenceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
    },
    preferenceContent: {
        flex: 1,
        marginRight: 16,
    },
    preferenceTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    preferenceSubtitle: {
        fontSize: 14,
        color: '#8E8E93',
    },
    reviewItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#3A3A3C',
    },
    reviewLabel: {
        fontSize: 16,
        color: '#8E8E93',
    },
    reviewValue: {
        fontSize: 16,
        fontWeight: '500',
        color: '#FFFFFF',
    },
    ueidValue: {
        color: '#007AFF',
        fontFamily: 'monospace',
        fontSize: 14,
    },
    bottomActions: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingVertical: 20,
        backgroundColor: '#000000',
        gap: 16,
    },
    primaryButton: {
        flex: 1,
        backgroundColor: '#007AFF',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    primaryButtonDisabled: {
        backgroundColor: '#3A3A3C',
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    secondaryButton: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#3A3A3C',
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#8E8E93',
    },
});