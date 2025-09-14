const express = require('express');
const { z } = require('zod');
const { db } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// Validation schemas
const messageSchema = z.object({
    content: z.string().min(1).max(1000),
    recipientId: z.string().uuid().optional(),
    ueid: z.string().min(1).max(50).optional()
});

const conversationSchema = z.object({
    participantId: z.string().uuid()
});

// GET /health - Health check
router.get('/health', (req, res) => {
    res.json({
        ok: true,
        service: 'chat',
        timestamp: new Date().toISOString()
    });
});

// GET /conversations - Get user's conversations
router.get('/conversations', requireAuth, async (req, res) => {
    try {
        const { sub: userId } = req.auth;

        const conversations = db.all(`
            SELECT DISTINCT
                c.id,
                c.participant_id,
                c.last_message,
                c.last_message_at,
                c.unread_count,
                u.phone,
                p.fullName,
                p.displayName,
                p.ueid
            FROM conversations c
            LEFT JOIN users u ON c.participant_id = u.id
            LEFT JOIN profiles p ON u.id = p.userId
            WHERE c.user_id = ?
            ORDER BY c.last_message_at DESC
        `, [userId]);

        res.json({
            ok: true,
            conversations: conversations.map(conv => ({
                id: conv.id,
                participantId: conv.participant_id,
                participant: {
                    phone: conv.phone,
                    fullName: conv.fullName,
                    displayName: conv.displayName,
                    ueid: conv.ueid
                },
                lastMessage: conv.last_message,
                lastMessageAt: conv.last_message_at,
                unreadCount: conv.unread_count || 0
            }))
        });
    } catch (error) {
        console.error('Chat conversations error:', error);
        res.status(500).json({
            ok: false,
            error: 'Internal server error'
        });
    }
});

// GET /conversations/:id/messages - Get messages for a conversation
router.get('/conversations/:id/messages', requireAuth, async (req, res) => {
    try {
        const { sub: userId } = req.auth;
        const { id: conversationId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const messages = db.all(`
            SELECT 
                m.id,
                m.content,
                m.sender_id,
                m.created_at,
                u.phone,
                p.fullName,
                p.displayName
            FROM messages m
            LEFT JOIN users u ON m.sender_id = u.id
            LEFT JOIN profiles p ON u.id = p.userId
            WHERE m.conversation_id = ?
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        `, [conversationId, limit, offset]);

        res.json({
            ok: true,
            messages: messages.map(msg => ({
                id: msg.id,
                content: msg.content,
                senderId: msg.sender_id,
                sender: {
                    phone: msg.phone,
                    fullName: msg.fullName,
                    displayName: msg.displayName
                },
                createdAt: msg.created_at
            }))
        });
    } catch (error) {
        console.error('Chat messages error:', error);
        res.status(500).json({
            ok: false,
            error: 'Internal server error'
        });
    }
});

// POST /conversations - Create or get conversation
router.post('/conversations', requireAuth, async (req, res) => {
    try {
        const { sub: userId } = req.auth;
        const { participantId } = conversationSchema.parse(req.body);

        // Check if conversation already exists
        let conversation = db.get(`
            SELECT * FROM conversations 
            WHERE user_id = ? AND participant_id = ?
        `, [userId, participantId]);

        if (!conversation) {
            // Create new conversation
            const conversationId = require('uuid').v4();
            db.run(`
                INSERT INTO conversations (id, user_id, participant_id, created_at)
                VALUES (?, ?, ?, ?)
            `, [conversationId, userId, participantId, new Date().toISOString()]);

            conversation = {
                id: conversationId,
                user_id: userId,
                participant_id: participantId,
                created_at: new Date().toISOString()
            };
        }

        res.json({
            ok: true,
            conversation: {
                id: conversation.id,
                participantId: conversation.participant_id,
                createdAt: conversation.created_at
            }
        });
    } catch (error) {
        console.error('Chat create conversation error:', error);
        res.status(400).json({
            ok: false,
            error: 'Invalid request'
        });
    }
});

// POST /messages - Send a message
router.post('/messages', requireAuth, async (req, res) => {
    try {
        const { sub: userId } = req.auth;
        const { content, recipientId, ueid } = messageSchema.parse(req.body);

        let conversationId;
        
        if (recipientId) {
            // Direct message by user ID
            let conversation = db.get(`
                SELECT * FROM conversations 
                WHERE user_id = ? AND participant_id = ?
            `, [userId, recipientId]);

            if (!conversation) {
                conversationId = require('uuid').v4();
                db.run(`
                    INSERT INTO conversations (id, user_id, participant_id, created_at)
                    VALUES (?, ?, ?, ?)
                `, [conversationId, userId, recipientId, new Date().toISOString()]);
            } else {
                conversationId = conversation.id;
            }
        } else if (ueid) {
            // Message by UEID - find user by UEID
            const recipient = db.get(`
                SELECT u.id FROM users u
                LEFT JOIN profiles p ON u.id = p.userId
                WHERE p.ueid = ?
            `, [ueid]);

            if (!recipient) {
                return res.status(404).json({
                    ok: false,
                    error: 'Recipient not found'
                });
            }

            let conversation = db.get(`
                SELECT * FROM conversations 
                WHERE user_id = ? AND participant_id = ?
            `, [userId, recipient.id]);

            if (!conversation) {
                conversationId = require('uuid').v4();
                db.run(`
                    INSERT INTO conversations (id, user_id, participant_id, created_at)
                    VALUES (?, ?, ?, ?)
                `, [conversationId, userId, recipient.id, new Date().toISOString()]);
            } else {
                conversationId = conversation.id;
            }
        } else {
            return res.status(400).json({
                ok: false,
                error: 'Either recipientId or ueid is required'
            });
        }

        // Create message
        const messageId = require('uuid').v4();
        db.run(`
            INSERT INTO messages (id, conversation_id, sender_id, content, created_at)
            VALUES (?, ?, ?, ?, ?)
        `, [messageId, conversationId, userId, content, new Date().toISOString()]);

        // Update conversation last message
        db.run(`
            UPDATE conversations 
            SET last_message = ?, last_message_at = ?
            WHERE id = ?
        `, [content, new Date().toISOString(), conversationId]);

        res.json({
            ok: true,
            message: {
                id: messageId,
                content,
                conversationId,
                senderId: userId,
                createdAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Chat send message error:', error);
        res.status(400).json({
            ok: false,
            error: 'Invalid request'
        });
    }
});

module.exports = router;
