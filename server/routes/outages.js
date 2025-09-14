const express = require('express');
const { z } = require('zod');
const { db } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// GET /health - Health check
router.get('/health', (req, res) => {
    res.json({
        ok: true,
        service: 'outages',
        timestamp: new Date().toISOString()
    });
});

// GET /current - Get current outages
router.get('/current', requireAuth, (req, res) => {
    try {
        res.json({
            ok: true,
            outages: []
        });
    } catch (error) {
        console.error('Outages error:', error);
        res.status(500).json({
            ok: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;
