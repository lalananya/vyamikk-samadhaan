/**
 * Authentication middleware
 * Verifies JWT tokens and sets req.auth
 */
import { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from '../config/jwt';

export interface AuthenticatedRequest extends Request {
    auth: {
        sub: string;
        phone: string;
    };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.status(401).json({
            error: {
                code: 'UNAUTHORIZED',
                message: 'Missing authorization header'
            }
        });
        return;
    }

    if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            error: {
                code: 'UNAUTHORIZED',
                message: 'Invalid authorization header format. Expected: Bearer <token>'
            }
        });
        return;
    }

    const token = authHeader.substring(7);

    if (!token) {
        res.status(401).json({
            error: {
                code: 'UNAUTHORIZED',
                message: 'Missing token in authorization header'
            }
        });
        return;
    }

    try {
        const payload = verifyAuthToken(token);

        // Set auth info on request
        req.auth = {
            sub: payload.sub,
            phone: payload.phone
        };

        next();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'TOKEN_VERIFICATION_FAILED';

        res.status(401).json({
            error: {
                code: 'INVALID_TOKEN',
                message: `Token verification failed: ${errorMessage}`
            }
        });
    }
}

