const express = require('express');
const { z } = require('zod');
const { db } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// GET /health - Health check
router.get('/health', (req, res) => {
    res.json({
        ok: true,
        service: 'consent',
        timestamp: new Date().toISOString()
    });
});

// GET /preferences - Get user consent preferences
router.get('/preferences', requireAuth, (req, res) => {
    try {
        res.json({
            ok: true,
            preferences: {
                analytics: { marketingAnalytics: false, performanceAnalytics: true, usageAnalytics: false },
                notifications: { email: false, push: false, sms: false }
            }
        });
    } catch (error) {
        console.error('Consent preferences error:', error);
        res.status(500).json({
            ok: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;
