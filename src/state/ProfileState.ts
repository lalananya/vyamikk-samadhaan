import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileData, ProfileDraft } from '../types/Profile';

const PROFILE_DRAFT_KEY = 'profile_draft';
const PROFILE_DATA_KEY = 'profile_data';

class ProfileStateManager {
    private draft: ProfileDraft | null = null;
    private profile: ProfileData | null = null;
    private listeners: ((profile: ProfileData | null) => void)[] = [];
    private draftListeners: ((draft: ProfileDraft | null) => void)[] = [];

    async initialize(): Promise<void> {
        try {
            // Load existing profile
            const profileData = await AsyncStorage.getItem(PROFILE_DATA_KEY);
            if (profileData) {
                this.profile = JSON.parse(profileData);
            }

            // Load existing draft
            const draftData = await AsyncStorage.getItem(PROFILE_DRAFT_KEY);
            if (draftData) {
                this.draft = JSON.parse(draftData);
            }

            this.notifyListeners();
        } catch (error) {
            console.error('Failed to initialize profile state:', error);
        }
    }

    subscribe(listener: (profile: ProfileData | null) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    subscribeDraft(listener: (draft: ProfileDraft | null) => void): () => void {
        this.draftListeners.push(listener);
        return () => {
            this.draftListeners = this.draftListeners.filter(l => l !== listener);
        };
    }

    getProfile(): ProfileData | null {
        return this.profile;
    }

    getDraft(): ProfileDraft | null {
        return this.draft;
    }

    async saveDraft(draft: ProfileDraft): Promise<void> {
        try {
            this.draft = draft;
            await AsyncStorage.setItem(PROFILE_DRAFT_KEY, JSON.stringify(draft));
            this.notifyDraftListeners();
        } catch (error) {
            console.error('Failed to save profile draft:', error);
        }
    }

    async updateDraft(updates: Partial<ProfileDraft>): Promise<void> {
        if (!this.draft) return;

        const updatedDraft = {
            ...this.draft,
            ...updates,
            lastSavedAt: new Date().toISOString(),
        };

        await this.saveDraft(updatedDraft);
    }

    async saveProfile(profile: ProfileData): Promise<void> {
        try {
            this.profile = profile;
            await AsyncStorage.setItem(PROFILE_DATA_KEY, JSON.stringify(profile));
            this.notifyListeners();
        } catch (error) {
            console.error('Failed to save profile:', error);
        }
    }

    async completeProfile(profile: ProfileData): Promise<void> {
        try {
            const completedProfile: ProfileData = {
                ...profile,
                completedAt: new Date().toISOString(),
                isComplete: true,
                completionPercentage: this.calculateCompletionPercentage(profile),
            };

            await this.saveProfile(completedProfile);

            // Clear draft
            await this.clearDraft();
        } catch (error) {
            console.error('Failed to complete profile:', error);
        }
    }

    async clearDraft(): Promise<void> {
        try {
            this.draft = null;
            await AsyncStorage.removeItem(PROFILE_DRAFT_KEY);
            this.notifyDraftListeners();
        } catch (error) {
            console.error('Failed to clear profile draft:', error);
        }
    }

    calculateCompletionPercentage(profile: Partial<ProfileData>): number {
        const requiredFields = [
            'fullName',
            'role',
        ];

        const recommendedFields = [
            'profilePhoto',
            'email',
        ];

        let score = 0;
        const totalWeight = requiredFields.length * 2 + recommendedFields.length;

        // Required fields (2 points each)
        requiredFields.forEach(field => {
            if (profile[field as keyof ProfileData]) {
                score += 2;
            }
        });

        // Recommended fields (1 point each)
        recommendedFields.forEach(field => {
            if (profile[field as keyof ProfileData]) {
                score += 1;
            }
        });

        return Math.round((score / totalWeight) * 100);
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener(this.profile));
    }

    private notifyDraftListeners(): void {
        this.draftListeners.forEach(listener => listener(this.draft));
    }
}

export const profileState = new ProfileStateManager();
