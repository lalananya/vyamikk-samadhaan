import { appState } from '../state/AppState';
// import { generateUEID } from '../lib/ueid'; // Temporarily disabled

export interface UniqueIdData {
    ecosystemId: string;
    displayName: string;
    generatedAt: string;
    userId: string;
    phone: string;
}

class UniqueIdGeneratorService {
    private static instance: UniqueIdGeneratorService;
    private generatedIds: Set<string> = new Set();

    static getInstance(): UniqueIdGeneratorService {
        if (!UniqueIdGeneratorService.instance) {
            UniqueIdGeneratorService.instance = new UniqueIdGeneratorService();
        }
        return UniqueIdGeneratorService.instance;
    }

    /**
     * Generate a unique ecosystem-wide user identity
     * Format: VS-PIN-XXXX-XXXX (UEID format with PIN)
     */
    async generateUniqueId(profileData: any): Promise<UniqueIdData> {
        const user = appState.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Extract PIN from profile data
        const pin = profileData.pin || '0000';
        
        // Generate UEID using the proper format with PIN
        const randomPart1 = Math.random().toString(36).substr(2, 4).toUpperCase();
        const randomPart2 = Math.random().toString(36).substr(2, 4).toUpperCase();
        const ecosystemId = `VS-${pin}-${randomPart1}-${randomPart2}`;

        const uniqueIdData: UniqueIdData = {
            ecosystemId,
            displayName: profileData.fullName,
            generatedAt: new Date().toISOString(),
            userId: user.id,
            phone: user.phone,
        };

        // Store the generated ID to prevent duplicates
        this.generatedIds.add(ecosystemId);

        return uniqueIdData;
    }

    /**
     * Generate unique 18-digit alphanumeric special character ID
     */
    private generateUniqueAlphanumericId(): string {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let id = '';

        // Generate 18 characters
        for (let i = 0; i < 18; i++) {
            id += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        // Ensure uniqueness
        while (this.generatedIds.has(id)) {
            id = '';
            for (let i = 0; i < 18; i++) {
                id += characters.charAt(Math.floor(Math.random() * characters.length));
            }
        }

        return id;
    }

    /**
     * Validate ecosystem ID format (UEID format: VS-XXXX-XXXX-XXXX)
     */
    validateEcosystemId(ecosystemId: string): boolean {
        const pattern = /^VS-[0-9A-HJ-NP-Z]{4}-[0-9A-HJ-NP-Z]{4}-[0-9A-HJ-NP-Z]{4}$/i;
        return pattern.test(ecosystemId);
    }

    /**
     * Check if ecosystem ID is available
     */
    isEcosystemIdAvailable(ecosystemId: string): boolean {
        return !this.generatedIds.has(ecosystemId);
    }

    /**
     * Get all generated IDs (for debugging)
     */
    getAllGeneratedIds(): string[] {
        return Array.from(this.generatedIds);
    }

    /**
     * Clear generated IDs (for testing)
     */
    clearGeneratedIds(): void {
        this.generatedIds.clear();
    }
}

export const uniqueIdGenerator = UniqueIdGeneratorService.getInstance();
