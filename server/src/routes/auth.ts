/**
 * Authentication routes with phone normalization
 */
import { Router } from 'express';
import { toE164 } from '../utils/phone';
import { signAuthToken, signRefreshToken } from '../config/jwt';
import { setUserProfile } from './me';

const router = Router();

// In-memory OTP store
const otpStore = new Map<string, { code: string; phone: string; expires: Date }>();

// POST /api/v1/auth/login - Request OTP
router.post('/login', (req, res) => {
    try {
        const { phone: rawPhone } = req.body || {};

        if (!rawPhone) {
            return res.status(400).json({
                error: {
                    code: 'MISSING_PHONE',
                    message: 'Phone number is required'
                }
            });
        }

        // Normalize phone number to E.164
        const phone = toE164(rawPhone);
        if (!phone) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_PHONE',
                    message: 'Invalid phone number format'
                }
            });
        }

        // Generate OTP
        let code: string;
        if (phone === '+919654604148') {
            code = '654321'; // Special OTP for testing
        } else {
            code = '123456'; // Default OTP
        }

        // Store OTP with normalized phone
        const otpToken = Math.random().toString(36).substring(2, 15);
        otpStore.set(otpToken, {
            code,
            phone,
            expires: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        });

        console.log(`🔐 OTP for ${phone}: ${code}`);

        res.json({
            otpToken,
            resendIn: 60
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to process login request'
            }
        });
    }
});

// POST /api/v1/auth/verify - Verify OTP and issue tokens
router.post('/verify', (req, res) => {
    try {
        const { otpToken, code, device } = req.body || {};

        if (!otpToken || !code) {
            return res.status(400).json({
                error: {
                    code: 'MISSING_CREDENTIALS',
                    message: 'OTP token and code are required'
                }
            });
        }

        // Get stored OTP data
        const stored = otpStore.get(otpToken);
        if (!stored) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_OTP_TOKEN',
                    message: 'Invalid or expired OTP token'
                }
            });
        }

        // Check if OTP is expired
        if (new Date() > stored.expires) {
            otpStore.delete(otpToken);
            return res.status(400).json({
                error: {
                    code: 'OTP_EXPIRED',
                    message: 'OTP has expired'
                }
            });
        }

        // Verify OTP code
        if (stored.code !== code) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_OTP',
                    message: 'Invalid OTP code'
                }
            });
        }

        // Clean up OTP
        otpStore.delete(otpToken);

        // Get normalized phone from stored data
        const phone = stored.phone;

        // Create or get user
        const userId = Math.random().toString(36).substring(2, 15);
        const userProfile = {
            id: userId,
            phone,
            role: 'admin',
            category: 'owner',
            createdAt: new Date(),
            onboardingCompleted: false,
            organizations: []
        };

        // Store user profile for /me endpoint enrichment
        setUserProfile(phone, userProfile);

        // Generate JWT tokens
        const accessJwt = signAuthToken({ sub: userId, phone });
        const refreshJwt = signRefreshToken({ sub: userId, phone });

        res.json({
            accessJwt,
            refreshJwt,
            user: userProfile
        });
    } catch (error) {
        console.error('❌ Verify error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to process verification request'
            }
        });
    }
});

export default router;

