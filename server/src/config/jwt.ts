/**
 * JWT configuration and utilities
 */
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev_access_change_me_in_production';
const ACCESS_EXPIRES = '24h';
const REFRESH_EXPIRES = '30d';

// Log JWT secret hash for debugging (dev only)
if (process.env.NODE_ENV !== 'production') {
    const secretHash = crypto.createHash('sha256').update(JWT_SECRET).digest('hex').slice(0, 12);
    console.log(`🔐 JWT Secret Hash: ${secretHash}`);
}

export interface AuthPayload {
    sub: string;
    phone: string;
    jti?: string;
    iat?: number;
    exp?: number;
}

export function signAuthToken(payload: Omit<AuthPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: ACCESS_EXPIRES,
        issuer: 'vyamikk-samadhaan',
        audience: 'vyamikk-samadhaan-app'
    });
}

export function signRefreshToken(payload: Omit<AuthPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: REFRESH_EXPIRES,
        issuer: 'vyamikk-samadhaan',
        audience: 'vyamikk-samadhaan-app'
    });
}

export function verifyAuthToken(token: string): AuthPayload {
    try {
        return jwt.verify(token, JWT_SECRET, {
            issuer: 'vyamikk-samadhaan',
            audience: 'vyamikk-samadhaan-app',
            clockTolerance: 5 // 5 seconds tolerance for device clock skew
        }) as AuthPayload;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('TOKEN_EXPIRED');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('TOKEN_INVALID');
        }
        throw new Error('TOKEN_VERIFICATION_FAILED');
    }
}

export { JWT_SECRET, ACCESS_EXPIRES, REFRESH_EXPIRES };

