const express = require('express');
const { z } = require('zod');
const { db } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// Validation schemas
const punchSchema = z.object({
    type: z.enum(['IN', 'OUT']),
    location: z.object({
        latitude: z.number(),
        longitude: z.number(),
        accuracy: z.number().optional()
    }).optional(),
    notes: z.string().max(500).optional()
});

const attendanceQuerySchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.string().transform(Number).optional(),
    offset: z.string().transform(Number).optional()
});

// GET /health - Health check
router.get('/health', (req, res) => {
    res.json({
        ok: true,
        service: 'attendance',
        timestamp: new Date().toISOString()
    });
});

// POST /punch - Record attendance punch
router.post('/punch', requireAuth, async (req, res) => {
    try {
        const { sub: userId } = req.auth;
        const { type, location, notes } = punchSchema.parse(req.body);

        const punchId = require('uuid').v4();
        const now = new Date().toISOString();

        db.run(`
            INSERT INTO attendance_punches (
                id, user_id, type, location_lat, location_lng, 
                location_accuracy, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            punchId,
            userId,
            type,
            location?.latitude || null,
            location?.longitude || null,
            location?.accuracy || null,
            notes || null,
            now
        ]);

        res.json({
            ok: true,
            punch: {
                id: punchId,
                type,
                location,
                notes,
                createdAt: now
            }
        });
    } catch (error) {
        console.error('Attendance punch error:', error);
        res.status(400).json({
            ok: false,
            error: 'Invalid request'
        });
    }
});

// GET /history - Get attendance history
router.get('/history', requireAuth, async (req, res) => {
    try {
        const { sub: userId } = req.auth;
        const { startDate, endDate, limit = 50, offset = 0 } = attendanceQuerySchema.parse(req.query);

        let query = `
            SELECT 
                id, type, location_lat, location_lng, 
                location_accuracy, notes, created_at
            FROM attendance_punches 
            WHERE user_id = ?
        `;
        const params = [userId];

        if (startDate) {
            query += ` AND created_at >= ?`;
            params.push(startDate);
        }

        if (endDate) {
            query += ` AND created_at <= ?`;
            params.push(endDate);
        }

        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const punches = db.all(query, params);

        res.json({
            ok: true,
            punches: punches.map(punch => ({
                id: punch.id,
                type: punch.type,
                location: punch.location_lat ? {
                    latitude: punch.location_lat,
                    longitude: punch.location_lng,
                    accuracy: punch.location_accuracy
                } : null,
                notes: punch.notes,
                createdAt: punch.created_at
            })),
            pagination: {
                limit,
                offset,
                total: punches.length
            }
        });
    } catch (error) {
        console.error('Attendance history error:', error);
        res.status(400).json({
            ok: false,
            error: 'Invalid request'
        });
    }
});

// GET /summary - Get attendance summary
router.get('/summary', requireAuth, async (req, res) => {
    try {
        const { sub: userId } = req.auth;
        const { startDate, endDate } = attendanceQuerySchema.parse(req.query);

        let query = `
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as total_punches,
                MIN(CASE WHEN type = 'IN' THEN created_at END) as first_in,
                MAX(CASE WHEN type = 'OUT' THEN created_at END) as last_out
            FROM attendance_punches 
            WHERE user_id = ?
        `;
        const params = [userId];

        if (startDate) {
            query += ` AND created_at >= ?`;
            params.push(startDate);
        }

        if (endDate) {
            query += ` AND created_at <= ?`;
            params.push(endDate);
        }

        query += ` GROUP BY DATE(created_at) ORDER BY date DESC`;

        const summary = db.all(query, params);

        res.json({
            ok: true,
            summary: summary.map(day => ({
                date: day.date,
                totalPunches: day.total_punches,
                firstIn: day.first_in,
                lastOut: day.last_out,
                hoursWorked: day.first_in && day.last_out ? 
                    Math.round((new Date(day.last_out) - new Date(day.first_in)) / (1000 * 60 * 60) * 100) / 100 : 0
            }))
        });
    } catch (error) {
        console.error('Attendance summary error:', error);
        res.status(400).json({
            ok: false,
            error: 'Invalid request'
        });
    }
});

module.exports = router;
