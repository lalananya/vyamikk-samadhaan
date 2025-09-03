const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('Server alive ✅'));

// Demo login: accepts { phone, otp }, returns a token
app.post('/login', (req, res) => {
    const { phone, otp } = req.body || {};
    if (!phone) return res.status(400).json({ message: 'phone required' });
    // In real life, validate OTP etc.
    const token = `demo-${phone}`;
    res.json({ token, user: { phone, role: 'user' } });
});

// Protected: requires Authorization: Bearer <token>
app.get('/me', (req, res) => {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'missing or invalid token' });
    }
    const token = auth.slice(7);
    const phone = token.replace('demo-', '');
    res.json({ id: 1, phone, role: 'user' });
});

const PORT = 4000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`API listening on http://0.0.0.0:${PORT}`);
});
