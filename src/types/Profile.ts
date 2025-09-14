export interface ProfileData {
    // Basic Info
    fullName: string;
    profilePhoto?: string; // base64 or local URI

    // Ecosystem Identity
    ecosystemId?: string;
    ecosystemIdGenerated?: boolean;

    // Work Details
    role: 'Company/Organisation' | 'Professional Services' | 'Skilled & Other Employees' | 'Non Registered Entity/Person';
    // Note: Role is locked to mobile number and personal details once selected

    // Role-specific details (Step 3)
    roleDetails?: {
        // Company/Organisation fields
        companyName?: string;
        gstin?: string;
        cin?: string;
        udyamNumber?: string;
        registeredOffice?: string;
        workAddress?: string;

        // Professional Services fields
        profession?: 'CA' | 'Advocate' | 'CS' | 'Doctor' | 'Engineer' | 'Consultant' | 'Other';
        professionalId?: string;
        specialization?: string;
        experience?: string;
        credentials?: string[];

        // Skilled & Other Employees fields
        skills?: string[];
        currentJobLocation?: string;
        state?: string;
        currentlyWorking?: boolean;
        jobTitle?: string;
        about?: string;

        // Non Registered Entity/Person fields
        serviceType?: string;
        workingLocation?: string;
        serviceSkills?: string[];
        serviceDescription?: string;
    };

    // Contact & Identity
    phone: string; // readonly for self-onboarding
    altPhone?: string;
    email?: string;
    address?: string;

    // Compliance (stub)
    idDocument?: {
        type: 'Aadhaar' | 'PAN';
        number: string; // masked
        addedAt: string;
    };

    // Preferences
    notifications: {
        attendanceReminders: boolean;
    };
    privacy: {
        hidePhoneFromCoworkers: boolean;
    };
    language: 'EN' | 'HI';

    // Metadata
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    isComplete: boolean;
    completionPercentage: number;
}

export interface ProfileDraft {
    currentStep: number;
    data: Partial<ProfileData>;
    lastSavedAt: string;
    isOffline: boolean;
}

export interface ProfileWizardProps {
    mode: 'self' | 'admin';
    initialRole?: 'Company/Organisation' | 'Professional Services' | 'Skilled & Other Employees' | 'Non Registered Entity/Person';
    initialPhone?: string;
    onComplete: (profile: ProfileData) => void;
    onSaveAndExit: (draft: ProfileDraft) => void;
}

export interface ProfileHomeProps {
    profile: ProfileData;
    onEdit: (section: string) => void;
    onShare: () => void;
    onExport: () => void;
}
