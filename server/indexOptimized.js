/**
 * OPTIMIZED Main Server
 *
 * Performance improvements:
 * - Optimized database with connection pooling
 * - Redis caching layer
 * - Security hardening
 * - Rate limiting
 * - Request/response compression
 * - Health monitoring
 */

const express = require("express");
const cors = require("cors");
const compression = require("compression");
const { v4: uuidv4 } = require("uuid");

// Import optimized modules
const { db } = require("./dbOptimized");
const {
  encrypt,
  decrypt,
  hash,
  constantTimeCompare,
} = require("./cryptoOptimized");
const { generateSecret, verify } = require("./totp");
const {
  sign,
  requireAuth,
  canonicalizeIndianMobile,
  hashPhone,
  getPhoneLast4,
  signupSchema,
  totpVerifySchema,
  loginSchema,
  validateRole,
} = require("./auth");
const { addEvent, bumpScoreOn } = require("./trust");
const { generateLoiPdf } = require("./pdf");
const mlClient = require("./mlClient");
const searchPipeline = require("./searchPipeline");
const { embeddingCache, userCache, generalCache } = require("./cacheOptimized");
const { securityManager } = require("./securityOptimized");

const app = express();

// Initialize security
securityManager.init();

// Security middleware
app.use(securityManager.getSecurityHeaders());
app.use(securityManager.getRequestLogger());

// CORS with security
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Token"],
  }),
);

// Compression
app.use(compression());

// Body parsing with limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const PORT = process.env.PORT || 4000;

// Admin guard helper
function adminGuard(req, res, next) {
  const adminToken = req.headers["x-admin-token"];
  if (
    !adminToken ||
    !constantTimeCompare(
      adminToken,
      process.env.ADMIN_TOKEN || "dev-admin-token",
    )
  ) {
    return res.status(401).json({ error: "admin token invalid" });
  }
  next();
}

// Health check with detailed status
app.get("/", async (req, res) => {
  try {
    const health = {
      ok: true,
      name: "Vyaamik Samadhaan API",
      port: PORT,
      timestamp: Date.now(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      routes: [
        "/signup",
        "/totp/verify",
        "/login",
        "/me",
        "/ledger",
        "/loi",
        "/attendance",
        "/approvals",
      ],
    };

    // Check database health
    try {
      await db.get("SELECT 1");
      health.database = "connected";
    } catch (error) {
      health.database = "error";
      health.databaseError = error.message;
    }

    // Check cache health
    try {
      await generalCache.set("health_check", "ok", 1000);
      const cacheTest = await generalCache.get("health_check");
      health.cache = cacheTest === "ok" ? "connected" : "error";
    } catch (error) {
      health.cache = "error";
      health.cacheError = error.message;
    }

    res.json(health);
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Health check failed",
      message: error.message,
    });
  }
});

// Lightweight ping endpoint
app.get("/health", (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.get("/debug/ping", (req, res) => {
  res.json({ ok: true, now: Date.now() });
});

// AUTH & VPI ENDPOINTS with rate limiting

// Signup with enhanced validation
app.post(
  "/signup",
  securityManager.getRateLimiter("auth"),
  async (req, res) => {
    try {
      const { phone, role } = signupSchema.parse(req.body);

      // Enhanced input validation
      const validationErrors = securityManager.validateInput(req.body, {
        phone: { required: true, type: "phone", minLength: 10, maxLength: 15 },
        role: { required: true, pattern: /^(organisation|professional)$/ },
      });

      if (validationErrors.length > 0) {
        return res.status(400).json({
          ok: false,
          error: "Validation failed",
          details: validationErrors,
        });
      }

      // Canonicalize and validate phone
      const phoneCanonical = canonicalizeIndianMobile(phone);
      const phoneHash = hashPhone(phoneCanonical);
      const phoneLast4 = getPhoneLast4(phoneCanonical);

      validateRole(role);

      // Check existing user with caching
      const cacheKey = `user:${phoneCanonical}`;
      let existingUser = await userCache.getUser(phoneCanonical);

      if (!existingUser) {
        existingUser = db.get(
          "SELECT id, role, role_locked FROM users WHERE phone_canonical = ?",
          [phoneCanonical],
        );
      }

      if (existingUser) {
        if (existingUser.role === role) {
          // Same role, allow signup (idempotent)
          const secret = generateSecret();
          const encrypted = encrypt(secret);

          await db.run(
            "UPDATE totp_secrets SET secret_enc = ?, iv = ?, tag = ?, active = 0, createdAt = ? WHERE userId = ?",
            [
              encrypted.ciphertext,
              encrypted.iv,
              encrypted.tag,
              Date.now(),
              existingUser.id,
            ],
          );

          const token = sign({ userId: existingUser.id, vpiId: null, role });

          // Cache user data
          await userCache.cacheUser(existingUser.id, existingUser);

          return res.json({
            ok: true,
            token,
            message: "User already exists, logged in",
          });
        } else if (existingUser.role_locked === 1) {
          return res.status(400).json({
            ok: false,
            error: "Role already set; contact support",
          });
        } else {
          // Role not locked, allow setting
          await db.run(
            "UPDATE users SET role = ?, role_locked = 1 WHERE id = ?",
            [role, existingUser.id],
          );
        }
      }

      const userId = uuidv4();
      const vpiId = uuidv4();
      const now = Date.now();

      // Generate TOTP secret
      const secret = generateSecret();
      const encrypted = encrypt(secret);

      // Create user with role locked
      await db.run(
        `
            INSERT INTO users (id, phone, phone_canonical, phone_hash, phone_last4, role, onboardingCompleted, role_locked, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?)
        `,
        [userId, phone, phoneCanonical, phoneHash, phoneLast4, role, now],
      );

      // Create VPI
      await db.run(
        `
            INSERT INTO vpi (vpiId, userId, trustScore, level, createdAt)
            VALUES (?, ?, 0, 1, ?)
        `,
        [vpiId, userId, now],
      );

      // Store TOTP secret
      await db.run(
        `
            INSERT INTO totp_secrets (userId, secret_enc, iv, tag, salt, active, createdAt)
            VALUES (?, ?, ?, ?, ?, 0, ?)
        `,
        [
          userId,
          encrypted.ciphertext,
          encrypted.iv,
          encrypted.tag,
          encrypted.salt || Buffer.alloc(0),
          now,
        ],
      );

      const token = sign({ userId, vpiId, role });

      res.json({
        ok: true,
        token,
        vpiId,
        message: "User created successfully",
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({
        ok: false,
        error: "Internal server error",
      });
    }
  },
);

// TOTP verification with rate limiting
app.post(
  "/totp/verify",
  securityManager.getRateLimiter("totp"),
  async (req, res) => {
    try {
      const { phone, totpCode } = totpVerifySchema.parse(req.body);
      const phoneCanonical = canonicalizeIndianMobile(phone);

      // Get user and TOTP secret
      const user = await db.get(
        `
            SELECT u.id, u.role, ts.secret_enc, ts.iv, ts.tag, ts.salt, ts.attemptCount
            FROM users u
            JOIN totp_secrets ts ON u.id = ts.userId
            WHERE u.phone_canonical = ?
        `,
        [phoneCanonical],
      );

      if (!user) {
        return res.status(404).json({
          ok: false,
          error: "User not found",
        });
      }

      // Check attempt count
      if (user.attemptCount >= 5) {
        return res.status(429).json({
          ok: false,
          error: "Too many failed attempts, please try again later",
        });
      }

      // Decrypt and verify TOTP
      const secret = decrypt({
        ciphertext: user.secret_enc,
        iv: user.iv,
        tag: user.tag,
        salt: user.salt,
      });

      if (!verify(totpCode, secret)) {
        // Increment attempt count
        await db.run(
          "UPDATE totp_secrets SET attemptCount = attemptCount + 1 WHERE userId = ?",
          [user.id],
        );

        return res.status(400).json({
          ok: false,
          error: "Invalid TOTP code",
        });
      }

      // Reset attempt count and activate TOTP
      await db.run(
        `
            UPDATE totp_secrets 
            SET active = 1, attemptCount = 0, lastUsedAt = ?
            WHERE userId = ?
        `,
        [Date.now(), user.id],
      );

      res.json({
        ok: true,
        message: "TOTP verified successfully",
      });
    } catch (error) {
      console.error("TOTP verification error:", error);
      res.status(500).json({
        ok: false,
        error: "Internal server error",
      });
    }
  },
);

// Login with enhanced security
app.post("/login", securityManager.getRateLimiter("auth"), async (req, res) => {
  try {
    const { phone, totpCode, otp } = loginSchema.parse(req.body);
    const totpCodeToUse = totpCode || otp;
    const phoneCanonical = canonicalizeIndianMobile(phone);

    // Get user and TOTP secret
    const user = await db.get(
      `
            SELECT u.id, u.phone, u.role, u.onboardingCompleted, v.vpiId, ts.secret_enc, ts.iv, ts.tag, ts.salt, ts.active
            FROM users u
            JOIN vpi v ON u.id = v.userId
            JOIN totp_secrets ts ON u.id = ts.userId
            WHERE u.phone_canonical = ? AND ts.active = 1
        `,
      [phoneCanonical],
    );

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "User not found or TOTP not verified",
      });
    }

    // Decrypt and verify TOTP (with dev escape hatch)
    const secret = decrypt({
      ciphertext: user.secret_enc,
      iv: user.iv,
      tag: user.tag,
      salt: user.salt,
    });

    // Dev escape hatch: skip TOTP verification if DEV_NO_TOTP=1
    if (process.env.DEV_NO_TOTP !== "1") {
      if (!verify(totpCodeToUse, secret)) {
        return res.status(400).json({
          ok: false,
          error: "Invalid TOTP code",
        });
      }
    } else {
      console.log("🔓 DEV MODE: TOTP verification skipped");
    }

    // Generate JWT token
    const token = sign({ userId: user.id, vpiId: user.vpiId, role: user.role });

    // Update last login
    await db.run("UPDATE users SET lastLoginAt = ? WHERE id = ?", [
      Date.now(),
      user.id,
    ]);

    // Cache user data
    await userCache.cacheUser(user.id, user);

    res.json({
      ok: true,
      token,
      vpiId: user.vpiId,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
});

// Protected routes with authentication
app.use(requireAuth);

// Get user profile with caching
app.get("/me", async (req, res) => {
  try {
    const { userId } = req.auth;

    // Try cache first
    let user = await userCache.getUser(userId);

    if (!user) {
      user = await db.get(
        `
                SELECT u.*, v.vpiId, v.trustScore, v.level
                FROM users u
                JOIN vpi v ON u.id = v.userId
                WHERE u.id = ?
            `,
        [userId],
      );

      if (user) {
        await userCache.cacheUser(userId, user);
      }
    }

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "User not found",
      });
    }

    res.json({
      ok: true,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        vpiId: user.vpiId,
        trustScore: user.trustScore,
        level: user.level,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
});

// Search endpoint with caching
app.get("/search", async (req, res) => {
  try {
    const { q: query, type, topK = 20 } = req.query;

    if (!query || !type) {
      return res.status(400).json({
        ok: false,
        error: "Query and type parameters are required",
      });
    }

    // Try cache first
    const cacheKey = `search:${type}:${query}:${topK}`;
    let results = await generalCache.get(cacheKey);

    if (!results) {
      results = await searchPipeline.search(type, query, parseInt(topK));
      await generalCache.set(cacheKey, results, 300000); // 5 minutes
    }

    res.json({
      ok: true,
      results,
      query,
      type,
      count: results.length,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      ok: false,
      error: "Search failed",
    });
  }
});

// Initialize server
async function startServer() {
  try {
    // Initialize database
    await db.init();
    console.log("✅ Database initialized");

    // Initialize caches
    await embeddingCache.init();
    await userCache.init();
    await generalCache.init();
    console.log("✅ Caches initialized");

    // Start server
    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `🚀 Vyaamik Samadhaan API listening on http://0.0.0.0:${PORT}`,
      );
      console.log("📊 Performance optimizations enabled");
      console.log("🔒 Security hardening active");
      console.log("💾 Caching layer ready");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM received, shutting down gracefully");
  await db.close();
  await embeddingCache.close();
  await userCache.close();
  await generalCache.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🛑 SIGINT received, shutting down gracefully");
  await db.close();
  await embeddingCache.close();
  await userCache.close();
  await generalCache.close();
  process.exit(0);
});

startServer();

module.exports = app;
