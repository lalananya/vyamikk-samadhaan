const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Simple logger
app.use((req, res, next) => {
  console.log(`→ ${req.method} ${req.url}`);
  next();
});

// Health endpoints
app.get("/api/v1/healthz", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/v1/readyz", (req, res) => {
  res.json({ status: "ready", timestamp: new Date().toISOString() });
});

// Mock auth endpoints for testing
app.post("/api/v1/auth/login", (req, res) => {
  const { phone } = req.body || {};

  if (!phone || !/^\+91\d{10}$/.test(phone)) {
    return res.status(400).json({
      error: {
        code: "INVALID_PHONE",
        message: "Phone must be in format +91XXXXXXXXXX",
      },
    });
  }

  // Mock OTP generation
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpToken = Math.random().toString(36).substring(2, 15);

  console.log(`🔐 OTP for ${phone}: ${otpCode}`);

  res.json({
    otpToken,
    resendIn: 60,
  });
});

app.post("/api/v1/auth/verify", (req, res) => {
  const { otpToken, code, device } = req.body || {};

  if (!otpToken || !code) {
    return res.status(400).json({
      error: {
        code: "MISSING_FIELDS",
        message: "otpToken and code are required",
      },
    });
  }

  // Mock verification (accept any 6-digit code)
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({
      error: {
        code: "INVALID_CODE",
        message: "Code must be 6 digits",
      },
    });
  }

  // Mock user creation
  const userId = Math.random().toString(36).substring(2, 15);
  const phone = "+919876543210"; // Mock phone from login

  // Mock JWT tokens
  const accessJwt = `access-${userId}-${Date.now()}`;
  const refreshJwt = `refresh-${userId}-${Date.now()}`;

  res.json({
    accessJwt,
    refreshJwt,
    user: {
      id: userId,
      phone,
    },
  });
});

app.get("/api/v1/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  res.json({
    id: "mock-user-id",
    phone: "+919876543210",
    orgs: [],
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Test server running on http://0.0.0.0:${PORT}`);
  console.log(`📚 Health check: http://0.0.0.0:${PORT}/api/v1/healthz`);
  console.log(`🔐 Auth endpoints ready for testing`);
});
