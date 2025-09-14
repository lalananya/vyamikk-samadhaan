/**
 * Stateless /me endpoint
 * Verifies JWT and returns auth info without depending on in-memory users Map
 */
import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// In-memory users store (for profile enrichment only)
const users = new Map<string, any>();

// GET /api/v1/me - Stateless authentication endpoint
router.get('/', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
        const { sub, phone } = req.auth;

        // Always return auth info from JWT (stateless)
        const authInfo = {
            id: sub,
            phone: phone
        };

        // Try to enrich with profile data if available (optional)
        let profile = null;
        if (users.has(phone)) {
            profile = users.get(phone);
        }

        res.json({
            ok: true,
            auth: authInfo,
            profile: profile,
            // Include profile data for backward compatibility
            ...(profile && {
                id: profile.id,
                phone: profile.phone,
                role: profile.role || 'admin',
                category: profile.category || 'owner',
                onboardingCompleted: profile.onboardingCompleted || false,
                organizations: profile.organizations || [],
                registeredAt: profile.createdAt?.toISOString() || new Date().toISOString()
            })
        });
    } catch (error) {
        console.error('❌ /me endpoint error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to process /me request'
            }
        });
    }
});

// Helper function to set user profile (called from auth routes)
export function setUserProfile(phone: string, profile: any): void {
    users.set(phone, profile);
}

// Helper function to get user profile
export function getUserProfile(phone: string): any {
    return users.get(phone);
}

export default router;

