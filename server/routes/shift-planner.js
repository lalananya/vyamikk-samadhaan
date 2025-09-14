const express = require('express');
const { z } = require('zod');
const { db } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// Validation schemas
const shiftSchema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    startTime: z.string(),
    endTime: z.string(),
    date: z.string(),
    assignedUsers: z.array(z.string().uuid()).optional(),
    location: z.string().max(200).optional(),
    requirements: z.string().max(1000).optional()
});

const shiftUpdateSchema = z.object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    date: z.string().optional(),
    assignedUsers: z.array(z.string().uuid()).optional(),
    location: z.string().max(200).optional(),
    requirements: z.string().max(1000).optional(),
    status: z.enum(['draft', 'published', 'cancelled']).optional()
});

const shiftQuerySchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.string().optional(),
    limit: z.string().transform(Number).optional(),
    offset: z.string().transform(Number).optional()
});

// GET /health - Health check
router.get('/health', (req, res) => {
    res.json({
        ok: true,
        service: 'shift-planner',
        timestamp: new Date().toISOString()
    });
});

// POST /shifts - Create a new shift
router.post('/shifts', requireAuth, async (req, res) => {
    try {
        const { sub: userId } = req.auth;
        const shiftData = shiftSchema.parse(req.body);

        const shiftId = require('uuid').v4();
        const now = new Date().toISOString();

        db.run(`
            INSERT INTO shifts (
                id, title, description, start_time, end_time, 
                date, location, requirements, created_by, created_at, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            shiftId,
            shiftData.title,
            shiftData.description || null,
            shiftData.startTime,
            shiftData.endTime,
            shiftData.date,
            shiftData.location || null,
            shiftData.requirements || null,
            userId,
            now,
            'draft'
        ]);

        // Assign users if provided
        if (shiftData.assignedUsers && shiftData.assignedUsers.length > 0) {
            const assignmentPromises = shiftData.assignedUsers.map(assignedUserId => {
                const assignmentId = require('uuid').v4();
                return db.run(`
                    INSERT INTO shift_assignments (
                        id, shift_id, user_id, assigned_by, assigned_at, status
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `, [assignmentId, shiftId, assignedUserId, userId, now, 'assigned']);
            });
        }

        res.json({
            ok: true,
            shift: {
                id: shiftId,
                ...shiftData,
                createdBy: userId,
                createdAt: now,
                status: 'draft'
            }
        });
    } catch (error) {
        console.error('Shift creation error:', error);
        res.status(400).json({
            ok: false,
            error: 'Invalid request'
        });
    }
});

// GET /shifts - Get shifts
router.get('/shifts', requireAuth, async (req, res) => {
    try {
        const { sub: userId } = req.auth;
        const { startDate, endDate, status, limit = 50, offset = 0 } = shiftQuerySchema.parse(req.query);

        let query = `
            SELECT 
                s.id, s.title, s.description, s.start_time, s.end_time, 
                s.date, s.location, s.requirements, s.status, s.created_at,
                u.phone as creator_phone, p.fullName as creator_name
            FROM shifts s
            LEFT JOIN users u ON s.created_by = u.id
            LEFT JOIN profiles p ON u.id = p.userId
            WHERE (s.created_by = ? OR s.id IN (
                SELECT shift_id FROM shift_assignments WHERE user_id = ?
            ))
        `;
        const params = [userId, userId];

        if (startDate) {
            query += ` AND s.date >= ?`;
            params.push(startDate);
        }

        if (endDate) {
            query += ` AND s.date <= ?`;
            params.push(endDate);
        }

        if (status) {
            query += ` AND s.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY s.date DESC, s.start_time DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const shifts = db.all(query, params);

        // Get assignments for each shift
        const shiftsWithAssignments = shifts.map(shift => {
            const assignments = db.all(`
                SELECT 
                    sa.id, sa.user_id, sa.status, sa.assigned_at,
                    u.phone, p.fullName, p.displayName
                FROM shift_assignments sa
                LEFT JOIN users u ON sa.user_id = u.id
                LEFT JOIN profiles p ON u.id = p.userId
                WHERE sa.shift_id = ?
            `, [shift.id]);

            return {
                id: shift.id,
                title: shift.title,
                description: shift.description,
                startTime: shift.start_time,
                endTime: shift.end_time,
                date: shift.date,
                location: shift.location,
                requirements: shift.requirements,
                status: shift.status,
                createdAt: shift.created_at,
                creator: {
                    phone: shift.creator_phone,
                    name: shift.creator_name
                },
                assignments: assignments.map(a => ({
                    id: a.id,
                    userId: a.user_id,
                    status: a.status,
                    assignedAt: a.assigned_at,
                    user: {
                        phone: a.phone,
                        fullName: a.fullName,
                        displayName: a.displayName
                    }
                }))
            };
        });

        res.json({
            ok: true,
            shifts: shiftsWithAssignments,
            pagination: {
                limit,
                offset,
                total: shifts.length
            }
        });
    } catch (error) {
        console.error('Shift query error:', error);
        res.status(400).json({
            ok: false,
            error: 'Invalid request'
        });
    }
});

// PUT /shifts/:id - Update a shift
router.put('/shifts/:id', requireAuth, async (req, res) => {
    try {
        const { sub: userId } = req.auth;
        const { id: shiftId } = req.params;
        const updateData = shiftUpdateSchema.parse(req.body);

        // Check if user owns the shift
        const existingShift = db.get(`
            SELECT * FROM shifts WHERE id = ? AND created_by = ?
        `, [shiftId, userId]);

        if (!existingShift) {
            return res.status(404).json({
                ok: false,
                error: 'Shift not found or not authorized'
            });
        }

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];

        Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined && key !== 'assignedUsers') {
                const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                updateFields.push(`${dbField} = ?`);
                updateValues.push(value);
            }
        });

        if (updateFields.length > 0) {
            updateValues.push(new Date().toISOString());
            updateValues.push(shiftId);
            
            db.run(`
                UPDATE shifts 
                SET ${updateFields.join(', ')}, updated_at = ?
                WHERE id = ?
            `, updateValues);
        }

        // Handle assigned users update
        if (updateData.assignedUsers) {
            // Remove existing assignments
            db.run(`DELETE FROM shift_assignments WHERE shift_id = ?`, [shiftId]);
            
            // Add new assignments
            if (updateData.assignedUsers.length > 0) {
                const now = new Date().toISOString();
                updateData.assignedUsers.forEach(assignedUserId => {
                    const assignmentId = require('uuid').v4();
                    db.run(`
                        INSERT INTO shift_assignments (
                            id, shift_id, user_id, assigned_by, assigned_at, status
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    `, [assignmentId, shiftId, assignedUserId, userId, now, 'assigned']);
                });
            }
        }

        res.json({
            ok: true,
            message: 'Shift updated successfully'
        });
    } catch (error) {
        console.error('Shift update error:', error);
        res.status(400).json({
            ok: false,
            error: 'Invalid request'
        });
    }
});

// DELETE /shifts/:id - Delete a shift
router.delete('/shifts/:id', requireAuth, async (req, res) => {
    try {
        const { sub: userId } = req.auth;
        const { id: shiftId } = req.params;

        // Check if user owns the shift
        const existingShift = db.get(`
            SELECT * FROM shifts WHERE id = ? AND created_by = ?
        `, [shiftId, userId]);

        if (!existingShift) {
            return res.status(404).json({
                ok: false,
                error: 'Shift not found or not authorized'
            });
        }

        // Delete assignments first
        db.run(`DELETE FROM shift_assignments WHERE shift_id = ?`, [shiftId]);
        
        // Delete shift
        db.run(`DELETE FROM shifts WHERE id = ?`, [shiftId]);

        res.json({
            ok: true,
            message: 'Shift deleted successfully'
        });
    } catch (error) {
        console.error('Shift deletion error:', error);
        res.status(400).json({
            ok: false,
            error: 'Invalid request'
        });
    }
});

module.exports = router;
