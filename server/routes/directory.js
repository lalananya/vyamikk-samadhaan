const express = require('express');
const { z } = require('zod');
const { db } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// Validation schemas
const searchSchema = z.object({
    query: z.string().min(1).max(100),
    limit: z.number().int().min(1).max(50).optional().default(20),
    offset: z.number().int().min(0).optional().default(0)
});

const resolveSchema = z.object({
    ueid: z.string().min(1).max(50)
});

// GET /search - Search users in directory
router.get('/search', requireAuth, async (req, res) => {
    try {
        const { query, limit, offset } = searchSchema.parse({
            query: req.query.q || '',
            limit: req.query.limit ? parseInt(req.query.limit) : 20,
            offset: req.query.offset ? parseInt(req.query.offset) : 0
        });

        // Search users by name, phone, or UEID
        const users = db.all(`
            SELECT 
                u.id,
                u.phone,
                u.role,
                u.createdAt,
                p.fullName,
                p.displayName,
                p.ueid
            FROM users u
            LEFT JOIN profiles p ON u.id = p.userId
            WHERE 
                p.fullName LIKE ? OR 
                p.displayName LIKE ? OR 
                p.ueid LIKE ? OR
                u.phone LIKE ?
            ORDER BY u.createdAt DESC
            LIMIT ? OFFSET ?
        `, [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, limit, offset]);

        res.json({
            ok: true,
            users: users.map(user => ({
                id: user.id,
                phone: user.phone,
                role: user.role,
                fullName: user.fullName,
                displayName: user.displayName,
                ueid: user.ueid,
                createdAt: user.createdAt
            })),
            pagination: {
                limit,
                offset,
                total: users.length
            }
        });
    } catch (error) {
        console.error('Directory search error:', error);
        res.status(400).json({
            ok: false,
            error: 'Invalid search parameters'
        });
    }
});

// GET /resolve - Resolve UEID to user profile
router.get('/resolve', requireAuth, async (req, res) => {
    try {
        const { ueid } = resolveSchema.parse(req.query);

        const user = db.get(`
            SELECT 
                u.id,
                u.phone,
                u.role,
                u.createdAt,
                p.fullName,
                p.displayName,
                p.ueid,
                p.email
            FROM users u
            LEFT JOIN profiles p ON u.id = p.userId
            WHERE p.ueid = ?
        `, [ueid]);

        if (!user) {
            return res.status(404).json({
                ok: false,
                error: 'User not found'
            });
        }

        res.json({
            ok: true,
            user: {
                id: user.id,
                phone: user.phone,
                role: user.role,
                fullName: user.fullName,
                displayName: user.displayName,
                ueid: user.ueid,
                email: user.email,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Directory resolve error:', error);
        res.status(400).json({
            ok: false,
            error: 'Invalid UEID'
        });
    }
});

// GET /me - Get current user's directory info
router.get('/me', requireAuth, async (req, res) => {
    try {
        const { sub: userId } = req.auth;

        const user = db.get(`
            SELECT 
                u.id,
                u.phone,
                u.role,
                u.createdAt,
                p.fullName,
                p.displayName,
                p.ueid,
                p.email
            FROM users u
            LEFT JOIN profiles p ON u.id = p.userId
            WHERE u.id = ?
        `, [userId]);

        if (!user) {
            return res.status(404).json({
                ok: false,
                error: 'User not found'
            });
        }

        res.json({
            ok: true,
            user: {
                id: user.id,
                phone: user.phone,
                role: user.role,
                fullName: user.fullName,
                displayName: user.displayName,
                ueid: user.ueid,
                email: user.email,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Directory me error:', error);
        res.status(500).json({
            ok: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;
