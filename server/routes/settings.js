const express = require('express');
const { z } = require('zod');
const { db } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// GET /health - Health check
router.get('/health', (req, res) => {
    res.json({
        ok: true,
        service: 'settings',
        timestamp: new Date().toISOString()
    });
});

// GET /profile - Get user settings
router.get('/profile', requireAuth, (req, res) => {
    try {
        res.json({
            ok: true,
            settings: {
                theme: 'light',
                language: 'en',
                notifications: true
            }
        });
    } catch (error) {
        console.error('Settings error:', error);
        res.status(500).json({
            ok: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;
