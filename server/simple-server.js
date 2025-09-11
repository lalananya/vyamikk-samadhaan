const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 4000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Simple logger
app.use((req, res, next) => {
  console.log(`→ ${req.method} ${req.url}`);
  next();
});

// In-memory storage
const users = new Map();
const otpStore = new Map();

// Test user states for gating logic testing
function getTestUserState(userId, phone) {
  // Use phone number to determine test state
  const phoneSuffix = phone.slice(-4);

  switch (phoneSuffix) {
    case "0001": // +919876543210
      return {
        category: "owner",
        onboarding_complete: false, // Gate 1: Force onboarding
        memberships: [],
      };
    case "0002": // +919876543211
      return {
        category: "owner",
        onboarding_complete: true,
        memberships: [], // Gate 2: Force org setup
      };
    case "0003": // +919876543212
      return {
        category: "labour",
        onboarding_complete: true,
        memberships: [], // Gate 3: Force join employer
      };
    case "0004": // +919876543213
      return {
        category: "professional",
        onboarding_complete: true,
        memberships: [], // Gate 4: Force link client
      };
    case "0005": // +919876543214
      return {
        category: "owner",
        onboarding_complete: true,
        memberships: [
          { id: "org1", name: "Test Org", role: "owner", status: "active" },
        ], // All gates passed
      };
    default:
      return {
        category: "owner",
        onboarding_complete: false,
        memberships: [],
      };
  }
}

// Health endpoints
app.get("/healthz", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/v1/healthz", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/v1/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Test endpoint to simulate server downtime
app.get("/api/v1/test/down", (req, res) => {
  console.log("🚨 Simulating server downtime...");
  res.status(503).json({
    error: "Service Unavailable",
    message: "Server is temporarily down for testing",
  });
});

// Auth endpoints
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

  // Generate OTP
  const code = "123456"; // Fixed OTP for development
  const otpToken = Math.random().toString(36).substring(2, 15);

  // Store OTP
  otpStore.set(otpToken, {
    code,
    expires: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  });

  console.log(`🔐 OTP for ${phone}: ${code}`);

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

  const stored = otpStore.get(otpToken);
  if (!stored || stored.expires < new Date()) {
    return res.status(400).json({
      error: {
        code: "INVALID_OTP",
        message: "Invalid or expired OTP",
      },
    });
  }

  if (stored.code !== code) {
    return res.status(400).json({
      error: {
        code: "INVALID_CODE",
        message: "Invalid OTP code",
      },
    });
  }

  // Remove used OTP
  otpStore.delete(otpToken);

  // Create or get user
  const phone = "+919876543210"; // Mock phone
  let user = users.get(phone);
  if (!user) {
    user = {
      id: Math.random().toString(36).substring(2, 15),
      phone,
      role: "pro",
      createdAt: new Date(),
    };
    users.set(phone, user);
  }

  // Generate JWT tokens
  const accessJwt = jwt.sign(
    { sub: user.id, phone: user.phone, jti: Math.random().toString(36) },
    "dev_access_change_me_in_production",
    { expiresIn: "15m" },
  );

  const refreshJwt = jwt.sign(
    { sub: user.id, phone: user.phone, jti: Math.random().toString(36) },
    "dev_refresh_change_me_in_production",
    { expiresIn: "30d" },
  );

  res.json({
    accessJwt,
    refreshJwt,
    user: {
      id: user.id,
      phone: user.phone,
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

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    const user = users.get(payload.phone);
    if (!user) {
      return res.status(401).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    const response = {
      authenticated: true,
      profile: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        registered_at:
          user.createdAt?.toISOString() || new Date().toISOString(),
        category: user.category || null,
        onboarding_complete: user.onboardingCompleted || false,
      },
      memberships: user.organizations || [],
    };

    // Log the exact /me payload on dev (mask PII)
    if (process.env.NODE_ENV === "development") {
      console.log("📋 /api/v1/auth/me response payload:", {
        ...response,
        profile: {
          ...response.profile,
          phone: response.profile.phone
            ? "***" + response.profile.phone.slice(-4)
            : null,
        },
      });
    }

    res.json(response);
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Add the missing /api/v1/me endpoint (alias for /api/v1/auth/me)
app.get("/api/v1/me", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    const user = users.get(payload.phone);
    if (!user) {
      return res.status(401).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    // Create different user states for testing gating logic and error scenarios
    let testUserState = getTestUserState(user.id, user.phone);

    // Test error scenarios based on phone number
    const phoneSuffix = user.phone.slice(-4);

    // Simulate different error conditions for testing
    if (phoneSuffix === "9999") {
      // Simulate 401 error
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Token expired or invalid",
        },
      });
    } else if (phoneSuffix === "9998") {
      // Simulate malformed response
      return res.json({ invalid: "response" });
    } else if (phoneSuffix === "9997") {
      // Simulate network timeout (this will be caught by fetch timeout)
      return new Promise(() => {}); // Never resolves
    }

    const response = {
      authenticated: true,
      profile: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        registered_at:
          user.createdAt?.toISOString() || new Date().toISOString(),
        category: testUserState.category || user.category || null,
        onboarding_complete: testUserState.onboarding_complete,
      },
      memberships: testUserState.memberships || user.organizations || [],
    };

    // Log the exact /me payload on dev (mask PII)
    if (process.env.NODE_ENV === "development") {
      console.log("📋 /api/v1/me response payload:", {
        ...response,
        profile: {
          ...response.profile,
          phone: response.profile.phone
            ? "***" + response.profile.phone.slice(-4)
            : null,
        },
      });
    }

    res.json(response);
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

app.post("/api/v1/auth/refresh", (req, res) => {
  const { refreshJwt } = req.body || {};

  if (!refreshJwt) {
    return res.status(400).json({
      error: {
        code: "MISSING_REFRESH_TOKEN",
        message: "refreshJwt is required",
      },
    });
  }

  try {
    const payload = jwt.verify(
      refreshJwt,
      "dev_refresh_change_me_in_production",
    );
    const user = users.get(payload.phone);

    if (!user) {
      return res.status(401).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    // Generate new tokens
    const newAccessJwt = jwt.sign(
      { sub: user.id, phone: user.phone, jti: Math.random().toString(36) },
      "dev_access_change_me_in_production",
      { expiresIn: "15m" },
    );

    const newRefreshJwt = jwt.sign(
      { sub: user.id, phone: user.phone, jti: Math.random().toString(36) },
      "dev_refresh_change_me_in_production",
      { expiresIn: "30d" },
    );

    res.json({
      accessJwt: newAccessJwt,
      refreshJwt: newRefreshJwt,
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_REFRESH_TOKEN",
        message: "Invalid or expired refresh token",
      },
    });
  }
});

app.post("/api/v1/auth/logout", (req, res) => {
  // In a real app, you'd blacklist the token
  res.status(204).send();
});

// Mock organizations endpoint
app.get("/api/v1/organizations/my", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Only return mock data in development with explicit flag
    if (
      process.env.NODE_ENV === "development" &&
      process.env.DEV_MOCK_ORGS === "1"
    ) {
      console.warn("🚨 DEV SHORTCUT: Returning mock organizations");
      const mockOrganizations = [
        {
          id: "org1",
          name: "Acme Manufacturing",
          slug: "acme-manufacturing",
          type: "msme",
          industry: "Manufacturing",
          member: {
            role: {
              name: "Owner",
              level: 100,
            },
            status: "active",
            joinedAt: new Date("2024-01-15").toISOString(),
          },
        },
        {
          id: "org2",
          name: "Tech Solutions Ltd",
          slug: "tech-solutions",
          type: "enterprise",
          industry: "Technology",
          member: {
            role: {
              name: "Manager",
              level: 80,
            },
            status: "active",
            joinedAt: new Date("2024-02-01").toISOString(),
          },
        },
      ];
      res.json(mockOrganizations);
    } else {
      // In production or without dev flag, return empty array
      res.json([]);
    }
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Debug endpoint
app.get("/api/v1/__debug/otp/:phone", (req, res) => {
  const { phone } = req.params;

  // Find OTP for this phone
  for (const [token, data] of otpStore.entries()) {
    if (data.phone === phone || phone === "+919876543210") {
      return res.json({
        code: data.code,
        expires: data.expires,
        phone: phone,
      });
    }
  }

  res.json({
    code: "123456",
    expires: new Date(Date.now() + 5 * 60 * 1000),
    phone: phone,
  });
});

// Mock onboarding completion endpoint
app.post("/api/v1/user/onboarding/complete", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock onboarding completion
    const onboardingData = req.body;
    console.log("📝 Onboarding completed:", {
      userId: payload.userId,
      category: onboardingData.category,
      legalEntity: onboardingData.legalEntity,
      displayName: onboardingData.displayName,
    });

    res.json({
      success: true,
      message: "Onboarding completed successfully",
      data: {
        userId: payload.userId,
        onboardingCompleted: true,
        registeredAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Mock partnership registration endpoint
app.post("/api/v1/partnership/register", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock partnership registration
    const partnershipData = req.body;
    console.log("🏢 Partnership registration:", {
      userId: payload.userId,
      gstin: partnershipData.gstin,
      tradeName: partnershipData.tradeName,
      partnerCount: partnershipData.partners?.length || 0,
    });

    res.json({
      success: true,
      message: "Partnership registration created successfully",
      data: {
        partnershipId: `partnership_${Date.now()}`,
        organizationId: `org_${Date.now()}`,
        status: "awaiting_acknowledgements",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Mock partner acknowledgement endpoint
app.post("/api/v1/partnership/acknowledge", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock partner acknowledgement
    const ackData = req.body;
    console.log("✅ Partner acknowledgement:", {
      userId: payload.userId,
      partnershipId: ackData.partnershipId,
      partnerId: ackData.partnerId,
      acknowledged: ackData.acknowledged,
    });

    res.json({
      success: true,
      message: "Acknowledgement recorded successfully",
      data: {
        acknowledged: ackData.acknowledged,
        acknowledgedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Mock employee creation endpoint
app.post("/api/v1/employees", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock employee creation
    const employeeData = req.body;
    console.log("👷 Employee created:", {
      userId: payload.userId,
      organizationId: employeeData.organizationId,
      name: employeeData.name,
      category: employeeData.category,
      code: employeeData.code,
    });

    res.json({
      success: true,
      message: "Employee created successfully",
      data: {
        employeeId: `emp_${Date.now()}`,
        organizationId: employeeData.organizationId,
        status: "pending",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Mock employee acknowledgement endpoint
app.post("/api/v1/employees/acknowledge", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock employee acknowledgement
    const ackData = req.body;
    console.log("✅ Employee acknowledgement:", {
      userId: payload.userId,
      employeeId: ackData.employeeId,
      acknowledged: ackData.acknowledged,
    });

    res.json({
      success: true,
      message: "Acknowledgement recorded successfully",
      data: {
        acknowledged: ackData.acknowledged,
        acknowledgedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Mock punch in/out endpoint
app.post("/api/v1/employees/punch", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock punch record
    const punchData = req.body;
    console.log("⏰ Employee punch:", {
      userId: payload.userId,
      employeeId: punchData.employeeId,
      type: punchData.type,
      clientTime: punchData.clientTime,
    });

    res.json({
      success: true,
      message: "Punch recorded successfully",
      data: {
        punchId: `punch_${Date.now()}`,
        serverTime: new Date().toISOString(),
        synced: true,
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Mock machine issue creation endpoint
app.post("/api/v1/machine-issues", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock machine issue creation
    const issueData = req.body;
    console.log("🔧 Machine issue created:", {
      userId: payload.userId,
      organizationId: issueData.organizationId,
      machineName: issueData.machineName,
      problemType: issueData.problemType,
      urgency: issueData.urgency,
    });

    res.json({
      success: true,
      message: "Issue created successfully",
      data: {
        issueId: `issue_${Date.now()}`,
        organizationId: issueData.organizationId,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Mock machine issue acknowledgement endpoint
app.post("/api/v1/machine-issues/:issueId/acknowledge", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock issue acknowledgement
    const { issueId } = req.params;
    const ackData = req.body;
    console.log("✅ Issue acknowledged:", {
      userId: payload.userId,
      issueId,
      acknowledgedBy: ackData.acknowledgedBy,
    });

    res.json({
      success: true,
      message: "Issue acknowledged successfully",
      data: {
        acknowledgedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Mock machine issue status update endpoint
app.post("/api/v1/machine-issues/:issueId/status", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock issue status update
    const { issueId } = req.params;
    const statusData = req.body;
    console.log("📝 Issue status updated:", {
      userId: payload.userId,
      issueId,
      status: statusData.status,
      updatedBy: statusData.updatedBy,
    });

    res.json({
      success: true,
      message: "Issue status updated successfully",
      data: {
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Mock machine issue notes endpoint
app.post("/api/v1/machine-issues/:issueId/notes", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock issue note addition
    const { issueId } = req.params;
    const noteData = req.body;
    console.log("📝 Issue note added:", {
      userId: payload.userId,
      issueId,
      addedBy: noteData.addedBy,
    });

    res.json({
      success: true,
      message: "Note added successfully",
      data: {
        noteId: `note_${Date.now()}`,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Mock cash transaction initiation endpoint
app.post("/api/v1/cash-transactions", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock cash transaction initiation
    const txData = req.body;
    console.log("💰 Cash transaction initiated:", {
      userId: payload.userId,
      organizationId: txData.organizationId,
      recipientName: txData.recipientName,
      amount: txData.amount,
      purpose: txData.purpose,
      otpCode: txData.otpCode,
    });

    res.json({
      success: true,
      message: "Transaction initiated successfully",
      data: {
        transactionId: `tx_${Date.now()}`,
        organizationId: txData.organizationId,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Mock cash transaction confirmation endpoint
app.post("/api/v1/cash-transactions/:transactionId/confirm", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock transaction confirmation
    const { transactionId } = req.params;
    const confirmData = req.body;
    console.log("✅ Cash transaction confirmed:", {
      userId: payload.userId,
      transactionId,
      otpCode: confirmData.otpCode,
      confirmedBy: confirmData.confirmedBy,
    });

    res.json({
      success: true,
      message: "Transaction confirmed successfully",
      data: {
        confirmedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Mock cash transaction override endpoint
app.post("/api/v1/cash-transactions/:transactionId/override", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock transaction override
    const { transactionId } = req.params;
    const overrideData = req.body;
    console.log("⚠️ Cash transaction overridden:", {
      userId: payload.userId,
      transactionId,
      overriddenBy: overrideData.overriddenBy,
      reason: overrideData.reason,
    });

    res.json({
      success: true,
      message: "Transaction overridden successfully",
      data: {
        overriddenAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Mock float allocation endpoint
app.post("/api/v1/fund-disbursement/allocate-float", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock float allocation
    const allocationData = req.body;
    console.log("💰 Float allocated:", {
      userId: payload.userId,
      organizationId: allocationData.organizationId,
      supervisorName: allocationData.supervisorName,
      amount: allocationData.amount,
      purpose: allocationData.purpose,
    });

    res.json({
      success: true,
      message: "Float allocated successfully",
      data: {
        allocationId: `allocation_${Date.now()}`,
        organizationId: allocationData.organizationId,
        allocatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Mock payout request endpoint
app.post("/api/v1/fund-disbursement/payout-request", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock payout request creation
    const payoutData = req.body;
    console.log("💸 Payout request created:", {
      userId: payload.userId,
      organizationId: payoutData.organizationId,
      labourName: payoutData.labourName,
      amount: payoutData.amount,
      purpose: payoutData.purpose,
      otpCode: payoutData.otpCode,
    });

    res.json({
      success: true,
      message: "Payout request created successfully",
      data: {
        payoutId: `payout_${Date.now()}`,
        organizationId: payoutData.organizationId,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Mock payout confirmation endpoint
app.post(
  "/api/v1/fund-disbursement/payout-request/:payoutId/confirm",
  (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Missing or invalid authorization header",
        },
      });
    }

    try {
      const token = authHeader.substring(7);
      const payload = jwt.verify(token, "dev_access_change_me_in_production");

      // Mock payout confirmation
      const { payoutId } = req.params;
      const confirmData = req.body;
      console.log("✅ Payout confirmed:", {
        userId: payload.userId,
        payoutId,
        otpCode: confirmData.otpCode,
        confirmedBy: confirmData.confirmedBy,
      });

      res.json({
        success: true,
        message: "Payout confirmed successfully",
        data: {
          confirmedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired token",
        },
      });
    }
  },
);

// Mock bill submission endpoint
app.post("/api/v1/fund-disbursement/bill-submission", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock bill submission
    const billData = req.body;
    console.log("📄 Bill submitted:", {
      userId: payload.userId,
      organizationId: billData.organizationId,
      amount: billData.amount,
      purpose: billData.purpose,
      description: billData.description,
    });

    res.json({
      success: true,
      message: "Bill submitted successfully",
      data: {
        billId: `bill_${Date.now()}`,
        organizationId: billData.organizationId,
        submittedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Mock bill approval endpoint
app.post(
  "/api/v1/fund-disbursement/bill-submission/:billId/approve",
  (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Missing or invalid authorization header",
        },
      });
    }

    try {
      const token = authHeader.substring(7);
      const payload = jwt.verify(token, "dev_access_change_me_in_production");

      // Mock bill approval
      const { billId } = req.params;
      const approveData = req.body;
      console.log("✅ Bill approved:", {
        userId: payload.userId,
        billId,
        approvedBy: approveData.approvedBy,
        paymentMethod: approveData.paymentMethod,
      });

      res.json({
        success: true,
        message: "Bill approved successfully",
        data: {
          approvedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired token",
        },
      });
    }
  },
);

// Mock float return endpoint
app.post("/api/v1/fund-disbursement/return-float", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock float return
    const returnData = req.body;
    console.log("🔄 Float return initiated:", {
      userId: payload.userId,
      organizationId: returnData.organizationId,
      supervisorName: returnData.supervisorName,
      amount: returnData.amount,
      reason: returnData.reason,
      otpCode: returnData.otpCode,
    });

    res.json({
      success: true,
      message: "Float return initiated successfully",
      data: {
        returnId: `return_${Date.now()}`,
        organizationId: returnData.organizationId,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Mock float return confirmation endpoint
app.post(
  "/api/v1/fund-disbursement/return-float/:returnId/confirm",
  (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Missing or invalid authorization header",
        },
      });
    }

    try {
      const token = authHeader.substring(7);
      const payload = jwt.verify(token, "dev_access_change_me_in_production");

      // Mock float return confirmation
      const { returnId } = req.params;
      const confirmData = req.body;
      console.log("✅ Float return confirmed:", {
        userId: payload.userId,
        returnId,
        otpCode: confirmData.otpCode,
        confirmedBy: confirmData.confirmedBy,
      });

      res.json({
        success: true,
        message: "Float return confirmed successfully",
        data: {
          confirmedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired token",
        },
      });
    }
  },
);

// Mock professional invite endpoint
app.post("/api/v1/professional/invite", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock professional invite
    const inviteData = req.body;
    console.log("🔗 Professional invited:", {
      userId: payload.userId,
      organizationId: inviteData.organizationId,
      professionalName: inviteData.professionalName,
      professionalPhone: inviteData.professionalPhone,
      scopeCount: inviteData.scopes?.length || 0,
      inviteToken: inviteData.inviteToken,
    });

    res.json({
      success: true,
      message: "Professional invite sent successfully",
      data: {
        inviteId: `invite_${Date.now()}`,
        organizationId: inviteData.organizationId,
        invitedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Mock professional accept endpoint
app.post("/api/v1/professional/accept", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock professional accept
    const acceptData = req.body;
    console.log("✅ Professional accepted:", {
      userId: payload.userId,
      inviteToken: acceptData.inviteToken,
      professionalId: acceptData.professionalId,
      professionalName: acceptData.professionalName,
    });

    res.json({
      success: true,
      message: "Professional access granted successfully",
      data: {
        linkId: `link_${Date.now()}`,
        linkedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Mock professional decline endpoint
app.post("/api/v1/professional/decline", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock professional decline
    const declineData = req.body;
    console.log("❌ Professional declined:", {
      userId: payload.userId,
      inviteToken: declineData.inviteToken,
      reason: declineData.reason,
    });

    res.json({
      success: true,
      message: "Professional invite declined successfully",
      data: {
        declinedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Mock professional revoke endpoint
app.post("/api/v1/professional/revoke", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock professional revoke
    const revokeData = req.body;
    console.log("🚫 Professional access revoked:", {
      userId: payload.userId,
      linkId: revokeData.linkId,
      revokedBy: revokeData.revokedBy,
      reason: revokeData.reason,
    });

    res.json({
      success: true,
      message: "Professional access revoked successfully",
      data: {
        revokedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Permission Audit endpoints
app.get("/api/v1/audit/permissions", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock audit logs
    const auditLogs = [
      {
        id: `audit_${Date.now()}_1`,
        userId: payload.userId,
        organizationId: req.headers["x-org-id"] || "org_123",
        resource: "employees",
        action: "create",
        allowed: true,
        screen: "dashboard",
        timestamp: new Date().toISOString(),
        metadata: { widgetId: "add_employee" },
      },
      {
        id: `audit_${Date.now()}_2`,
        userId: payload.userId,
        organizationId: req.headers["x-org-id"] || "org_123",
        resource: "cash_transactions",
        action: "create",
        allowed: false,
        reason: "Insufficient permissions for cash transactions",
        screen: "dashboard",
        timestamp: new Date(Date.now() - 300000).toISOString(),
        metadata: { widgetId: "create_cash_tx" },
      },
      {
        id: `audit_${Date.now()}_3`,
        userId: payload.userId,
        organizationId: req.headers["x-org-id"] || "org_123",
        resource: "machine_issues",
        action: "read",
        allowed: true,
        screen: "dashboard",
        timestamp: new Date(Date.now() - 600000).toISOString(),
        metadata: { widgetId: "open_issues" },
      },
    ];

    console.log("📊 Permission audit logs requested:", {
      userId: payload.userId,
      organizationId: req.headers["x-org-id"],
      logCount: auditLogs.length,
    });

    res.json({
      success: true,
      data: {
        auditLogs,
        totalCount: auditLogs.length,
        deniedCount: auditLogs.filter((log) => !log.allowed).length,
        grantedCount: auditLogs.filter((log) => log.allowed).length,
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

app.post("/api/v1/audit/permissions/log", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock permission audit log creation
    const auditData = req.body;
    console.log("🔒 Permission audit logged:", {
      userId: payload.userId,
      organizationId: req.headers["x-org-id"],
      resource: auditData.resource,
      action: auditData.action,
      allowed: auditData.allowed,
      screen: auditData.screen,
      reason: auditData.reason,
    });

    res.json({
      success: true,
      message: "Permission audit logged successfully",
      data: {
        auditId: `audit_${Date.now()}`,
        loggedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

// Audit and Analytics endpoints
app.get("/api/v1/audit/logs", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock audit logs
    const auditLogs = [
      {
        id: `audit_${Date.now()}_1`,
        timestamp: new Date().toISOString(),
        organizationId: req.headers["x-org-id"] || "org_123",
        actorId: payload.userId,
        actorRole: "owner",
        actorCategory: "owner",
        action: "category_changed",
        resource: "user_profile",
        resourceId: payload.userId,
        targetId: payload.userId,
        targetType: "user",
        success: true,
        metadata: {
          oldCategory: "labour",
          newCategory: "owner",
          changeType: "category_update",
        },
        dataRetentionTag: {
          category: "compliance",
          retentionPeriod: 1825,
          autoDelete: false,
          legalHold: true,
          description: "Compliance and regulatory events",
        },
        sessionId: `session_${Date.now()}`,
      },
      {
        id: `audit_${Date.now()}_2`,
        timestamp: new Date(Date.now() - 300000).toISOString(),
        organizationId: req.headers["x-org-id"] || "org_123",
        actorId: payload.userId,
        actorRole: "owner",
        actorCategory: "owner",
        action: "cash_transaction_initiated",
        resource: "cash_transaction",
        resourceId: `tx_${Date.now()}`,
        targetId: "labour_123",
        targetType: "user",
        success: true,
        metadata: {
          amount: 5000,
          purpose: "salary",
          currency: "INR",
        },
        dataRetentionTag: {
          category: "financial",
          retentionPeriod: 2555,
          autoDelete: false,
          legalHold: true,
          description: "Financial transactions and records",
        },
        sessionId: `session_${Date.now()}`,
      },
    ];

    console.log("📊 Audit logs requested:", {
      userId: payload.userId,
      organizationId: req.headers["x-org-id"],
      logCount: auditLogs.length,
    });

    res.json({
      success: true,
      data: {
        auditLogs,
        totalCount: auditLogs.length,
        successCount: auditLogs.filter((log) => log.success).length,
        failureCount: auditLogs.filter((log) => !log.success).length,
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

app.get("/api/v1/analytics/events", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, "dev_access_change_me_in_production");

    // Mock analytics events
    const analyticsEvents = [
      {
        event: "category_changed",
        properties: {
          organizationId: req.headers["x-org-id"] || "org_123",
          userId: payload.userId,
          oldCategory: "labour",
          newCategory: "owner",
          success: true,
          timestamp: new Date().toISOString(),
          platform: "mobile",
          appVersion: "1.0.0",
        },
        timestamp: new Date().toISOString(),
        userId: payload.userId,
        organizationId: req.headers["x-org-id"] || "org_123",
        sessionId: `session_${Date.now()}`,
      },
      {
        event: "cash_tx_initiated",
        properties: {
          organizationId: req.headers["x-org-id"] || "org_123",
          userId: payload.userId,
          transactionId: `tx_${Date.now()}`,
          amount: 5000,
          purpose: "salary",
          success: true,
          timestamp: new Date().toISOString(),
          platform: "mobile",
          appVersion: "1.0.0",
        },
        timestamp: new Date().toISOString(),
        userId: payload.userId,
        organizationId: req.headers["x-org-id"] || "org_123",
        sessionId: `session_${Date.now()}`,
      },
    ];

    console.log("📈 Analytics events requested:", {
      userId: payload.userId,
      organizationId: req.headers["x-org-id"],
      eventCount: analyticsEvents.length,
    });

    res.json({
      success: true,
      data: {
        events: analyticsEvents,
        totalCount: analyticsEvents.length,
        uniqueUsers: new Set(analyticsEvents.map((e) => e.userId)).size,
        successCount: analyticsEvents.filter((e) => e.properties.success)
          .length,
        failureCount: analyticsEvents.filter((e) => !e.properties.success)
          .length,
      },
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Simple server running on http://0.0.0.0:${PORT}`);
  console.log(`📚 Health check: http://0.0.0.0:${PORT}/healthz`);
  console.log(`🔐 Auth endpoints ready for testing`);
  console.log(`📱 API Base: http://0.0.0.0:${PORT}/api/v1`);
});
