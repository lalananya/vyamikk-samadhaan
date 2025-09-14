const express = require('express');
const { z } = require('zod');
const { db } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// GET /health - Health check
router.get('/health', (req, res) => {
    res.json({
        ok: true,
        service: 'payments',
        timestamp: new Date().toISOString()
    });
});

// GET /history - Get payment history
router.get('/history', requireAuth, (req, res) => {
    try {
        res.json({
            ok: true,
            payments: []
        });
    } catch (error) {
        console.error('Payment history error:', error);
        res.status(500).json({
            ok: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;
