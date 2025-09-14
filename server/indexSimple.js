const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// simple logger to see requests hit the server
app.use((req, res, next) => {
  console.log("→", req.method, req.url);
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.post("/auth/login", (req, res) => {
  const { phone, totp } = req.body || {};

  // High-end debugging
  console.log("🔐 AUTH LOGIN REQUEST:", {
    phone,
    totp,
    timestamp: new Date().toISOString(),
  });

  if (!phone) {
    console.log("❌ Missing phone number");
    return res.status(400).json({ error: "phone required" });
  }

  // Accept any 10-digit phone in development
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(phone)) {
    console.log("❌ Invalid phone format:", phone);
    return res.status(400).json({ error: "phone must be 10 digits" });
  }

  // Accept OTP 000000 for any phone
  if (totp === "000000") {
    const user = {
      id: `dev-user-${phone}`,
      phone: phone,
      role: "professional",
      onboardingCompleted: true,
      vpiId: `dev-vpi-${phone}`,
      createdAt: Date.now(),
    };

    const token = `dev-token-${phone}-${Date.now()}`;

    console.log("✅ DEV LOGIN SUCCESS:", { phone, user, token });

    return res.json({
      ok: true,
      token,
      user,
      message: "Development mode: any 10-digit phone accepted",
    });
  }

  console.log("❌ Invalid OTP:", totp);
  return res
    .status(401)
    .json({ error: "invalid otp - use 000000 in development" });
});

// User profile endpoint for dashboard
app.get("/me", (req, res) => {
  const authHeader = req.headers.authorization;
  console.log("👤 PROFILE REQUEST:", {
    authHeader: authHeader?.substring(0, 20) + "...",
  });

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ Missing or invalid auth header");
    return res.status(401).json({ error: "Missing authorization header" });
  }

  const token = authHeader.substring(7);

  // Extract phone from dev token
  const phoneMatch = token.match(/dev-token-(\d{10})-/);
  if (!phoneMatch) {
    console.log("❌ Invalid token format:", token);
    return res.status(401).json({ error: "Invalid token format" });
  }

  const phone = phoneMatch[1];
  const user = {
    id: `dev-user-${phone}`,
    phone: phone,
    role: "professional",
    onboardingCompleted: true,
    vpiId: `dev-vpi-${phone}`,
    createdAt: Date.now(),
  };

  console.log("✅ PROFILE SUCCESS:", { phone, user });

  res.json({ ok: true, user });
});

// Dashboard data endpoint
app.get("/dashboard", (req, res) => {
  const authHeader = req.headers.authorization;
  console.log("📊 DASHBOARD REQUEST:", {
    authHeader: authHeader?.substring(0, 20) + "...",
  });

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  const token = authHeader.substring(7);
  const phoneMatch = token.match(/dev-token-(\d{10})-/);
  if (!phoneMatch) {
    return res.status(401).json({ error: "Invalid token format" });
  }

  const phone = phoneMatch[1];

  // Mock dashboard data
  const dashboardData = {
    ok: true,
    user: {
      id: `dev-user-${phone}`,
      phone: phone,
      role: "professional",
      onboardingCompleted: true,
      vpiId: `dev-vpi-${phone}`,
    },
    stats: {
      totalWork: 0,
      completedTasks: 0,
      pendingApprovals: 0,
      trustScore: 100,
    },
    recentActivity: [],
    notifications: [],
  };

  console.log("✅ DASHBOARD SUCCESS:", { phone, stats: dashboardData.stats });

  res.json(dashboardData);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => console.log(`API on http://0.0.0.0:${PORT}`));
