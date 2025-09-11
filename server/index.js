const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const { db } = require("./db");
const { encrypt, decrypt, hash } = require("./crypto");
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
  pincodeSchema,
  ledgerSchema,
  ledgerAckSchema,
  loiSchema,
  loiSignSchema,
  attendancePunchSchema,
  attendanceBulkSchema,
  approvalSchema,
  validateRole,
  roleSchema,
  roleChangeSchema,
} = require("./auth");
const { addEvent, bumpScoreOn } = require("./trust");
const { generateLoiPdf } = require("./pdf");
const mlClient = require("./mlClient");
const searchPipeline = require("./searchPipeline");

const app = express();

// CORS: allow Expo dev and tunnels
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Admin guard helper
function adminGuard(req, res, next) {
  if (req.headers["x-admin-token"] !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "admin token invalid" });
  }
  next();
}

// Health check
app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "Vyaamik Samadhaan API",
    port: PORT,
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
  });
});

// Lightweight debug ping for connectivity checks
// Health endpoint for connectivity checks
app.get("/health", (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.get("/debug/ping", (req, res) => {
  res.json({ ok: true, now: Date.now() });
});

// AUTH & VPI ENDPOINTS

// Signup
app.post("/signup", (req, res) => {
  try {
    const { phone, role } = signupSchema.parse(req.body);

    // Canonicalize phone number
    const phoneCanonical = canonicalizeIndianMobile(phone);
    const phoneHash = hashPhone(phoneCanonical);
    const phoneLast4 = getPhoneLast4(phoneCanonical);

    // Validate role
    validateRole(role);

    // Check if user already exists
    const existingUser = db.get(
      "SELECT id, role, role_locked FROM users WHERE phone_canonical = ?",
      [phoneCanonical],
    );
    if (existingUser) {
      if (existingUser.role === role) {
        // Same role, allow signup (idempotent)
        const secret = generateSecret();
        const encrypted = encrypt(secret);

        // Update TOTP secret
        db.run(
          "UPDATE totp_secrets SET secret_enc = ?, iv = ?, tag = ?, active = 0, createdAt = ? WHERE userId = ?",
          [
            encrypted.ciphertext,
            encrypted.iv,
            encrypted.tag,
            now,
            existingUser.id,
          ],
        );

        const token = sign({ userId: existingUser.id, vpiId: null, role });
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
        db.run("UPDATE users SET role = ?, role_locked = 1 WHERE id = ?", [
          role,
          existingUser.id,
        ]);
      }
    }

    const userId = uuidv4();
    const vpiId = uuidv4();
    const now = Date.now();

    // Generate TOTP secret
    const secret = generateSecret();
    const encrypted = encrypt(secret);

    // Create user with role locked
    db.run(
      "INSERT INTO users (id, phone, phone_canonical, phone_hash, phone_last4, role, role_locked, orgId, onboardingCompleted, createdAt) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)",
      [
        userId,
        phone,
        phoneCanonical,
        phoneHash,
        phoneLast4,
        role,
        null,
        0,
        now,
      ],
    );

    // Create VPI
    db.run(
      "INSERT INTO vpi (vpiId, userId, trustScore, level) VALUES (?, ?, ?, ?)",
      [vpiId, userId, 0, 1],
    );

    // Store encrypted TOTP secret
    db.run(
      "INSERT INTO totp_secrets (userId, secret_enc, iv, tag, active, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, encrypted.ciphertext, encrypted.iv, encrypted.tag, 0, now],
    );

    // Generate JWT token
    const token = sign({ userId, vpiId, role });

    res.status(201).json({
      ok: true,
      token,
      vpiId,
      needsTotpVerify: true,
      provisioning: {
        secret: secret, // Dev only - remove in production
      },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        ok: false,
        error: "Validation error",
        details: error.errors,
      });
    }

    console.error("Signup error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
});

// TOTP Verify
app.post("/totp/verify", (req, res) => {
  try {
    const { phone, code } = totpVerifySchema.parse(req.body);

    // Canonicalize phone number
    const phoneCanonical = canonicalizeIndianMobile(phone);

    // Get user and TOTP secret
    const user = db.get(
      `
      SELECT u.id, u.role, v.vpiId, ts.secret_enc, ts.iv, ts.tag, ts.active
      FROM users u
      JOIN vpi v ON u.id = v.userId
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

    if (user.active) {
      return res.status(400).json({
        ok: false,
        error: "TOTP already verified",
      });
    }

    // Decrypt and verify TOTP (with dev escape hatch)
    const secret = decrypt({
      ciphertext: user.secret_enc,
      iv: user.iv,
      tag: user.tag,
    });

    // Dev escape hatch: skip TOTP verification if DEV_NO_TOTP=1
    if (process.env.DEV_NO_TOTP !== "1") {
      if (!verify(code, secret)) {
        return res.status(400).json({
          ok: false,
          error: "Invalid TOTP code",
        });
      }
    } else {
      // In dev mode, accept 000000 as a valid TOTP code
      if (code !== "000000") {
        console.log("🔓 DEV MODE: TOTP verification skipped");
      }
    }

    // Mark as active
    db.run("UPDATE totp_secrets SET active = 1 WHERE userId = ?", [user.id]);

    res.json({
      ok: true,
      verified: true,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        ok: false,
        error: "Validation error",
        details: error.errors,
      });
    }

    console.error("TOTP verify error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
});

// Login
app.post("/login", (req, res) => {
  try {
    const { phone, totpCode, otp } = loginSchema.parse(req.body);
    const totpCodeToUse = totpCode || otp; // Support both field names

    // Canonicalize phone number
    const phoneCanonical = canonicalizeIndianMobile(phone);

    // Get user and TOTP secret
    const user = db.get(
      `
      SELECT u.id, u.phone, u.role, u.onboardingCompleted, v.vpiId, ts.secret_enc, ts.iv, ts.tag, ts.active
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
      // In dev mode, accept 000000 as a valid TOTP code
      if (totpCodeToUse !== "000000") {
        console.log("🔓 DEV MODE: TOTP verification skipped");
      }
    }

    // Generate JWT token
    const token = sign({ userId: user.id, vpiId: user.vpiId, role: user.role });

    // Map internal role to external role
    const roleMap = { employer: "organisation", labour: "professional" };
    const externalRole = roleMap[user.role] || user.role;

    res.json({
      ok: true,
      token,
      vpiId: user.vpiId,
      role: externalRole,
      roles: [externalRole],
      defaultRole: externalRole,
      onboardingCompleted: Boolean(user.onboardingCompleted),
      orgId: null,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        ok: false,
        error: "Validation error",
        details: error.errors,
      });
    }

    console.error("Login error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
});

// Get user profile
app.get("/me", requireAuth, (req, res) => {
  try {
    const { vpiId } = req.auth;

    const user = db.get(
      `
      SELECT u.phone, u.phone_last4, u.role, u.role_locked, u.onboardingCompleted, v.vpiId, u.orgId, v.trustScore
      FROM users u
      JOIN vpi v ON u.id = v.userId
      WHERE v.vpiId = ?
    `,
      [vpiId],
    );

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "User not found",
      });
    }

    // Map internal role to external role
    const roleMap = { employer: "organisation", labour: "professional" };
    const externalRole = roleMap[user.role] || user.role;

    res.json({
      ok: true,
      phone: user.phone,
      phoneLast4: user.phone_last4,
      vpiId: user.vpiId,
      role: externalRole,
      role_locked: user.role_locked,
      roles: [externalRole],
      defaultRole: externalRole,
      onboardingCompleted: Boolean(user.onboardingCompleted),
      orgId: user.orgId,
      trustScore: user.trustScore,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
});

// PINCODE ENDPOINT

// Get address by PIN code
app.get("/pincode/:pin", (req, res) => {
  try {
    const { pin } = req.params;

    // Validate PIN format
    if (!/^[1-9]\d{5}$/.test(pin)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid PIN code format",
      });
    }

    // Get all offices for this PIN
    const offices = db.all(
      `
      SELECT office_name, district, state, circle, lat, lng
      FROM pin_codes
      WHERE pincode = ?
      ORDER BY office_name
    `,
      [pin],
    );

    if (offices.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "PIN code not found",
      });
    }

    // Get unique state and district
    const state = offices[0].state;
    const district = offices[0].district;

    res.json({
      ok: true,
      pincode: pin,
      state,
      district,
      offices: offices.map((office) => ({
        office_name: office.office_name,
        circle: office.circle,
        lat: office.lat,
        lng: office.lng,
      })),
    });
  } catch (error) {
    console.error("Get pincode error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
});

// LEDGER ENDPOINTS

// Create ledger entry
app.post("/ledger", requireAuth, (req, res) => {
  try {
    const { to_vpi, type, amount, note } = ledgerSchema.parse(req.body);
    const { vpiId } = req.auth;

    const id = uuidv4();
    const now = Date.now();

    db.run(
      "INSERT INTO ledger_entries (id, from_vpi, to_vpi, type, amount, note, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, vpiId, to_vpi, type, amount, note || "", "pending", now],
    );

    res.status(201).json({
      ok: true,
      id,
      status: "pending",
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        ok: false,
        error: "Validation error",
        details: error.errors,
      });
    }

    console.error("Create ledger error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
});

// Acknowledge ledger entry
app.post("/ledger/:id/ack", requireAuth, (req, res) => {
  try {
    const { totpCode } = ledgerAckSchema.parse(req.body);
    const { vpiId, userId } = req.auth;
    const { id } = req.params;

    // Get ledger entry
    const entry = db.get("SELECT * FROM ledger_entries WHERE id = ?", [id]);
    if (!entry) {
      return res.status(404).json({
        ok: false,
        error: "Ledger entry not found",
      });
    }

    if (entry.to_vpi !== vpiId) {
      return res.status(403).json({
        ok: false,
        error: "Only counterparty can acknowledge this entry",
      });
    }

    if (entry.status !== "pending") {
      return res.status(400).json({
        ok: false,
        error: "Entry already acknowledged or rejected",
      });
    }

    // Verify TOTP
    const user = db.get(
      `
      SELECT ts.secret_enc, ts.iv, ts.tag
      FROM totp_secrets ts
      WHERE ts.userId = ? AND ts.active = 1
    `,
      [userId],
    );

    if (!user) {
      return res.status(400).json({
        ok: false,
        error: "TOTP not configured",
      });
    }

    const secret = decrypt({
      ciphertext: user.secret_enc,
      iv: user.iv,
      tag: user.tag,
    });

    if (!verify(totpCode, secret)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid TOTP code",
      });
    }

    // Update entry
    const now = Date.now();
    db.run(
      "UPDATE ledger_entries SET status = ?, ackBy_vpi = ?, ackAt = ? WHERE id = ?",
      ["acknowledged", vpiId, now, id],
    );

    // Add trust events
    bumpScoreOn("ledger_acknowledged", {
      from_vpi: entry.from_vpi,
      to_vpi: entry.to_vpi,
    });

    res.json({
      ok: true,
      acknowledged: true,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        ok: false,
        error: "Validation error",
        details: error.errors,
      });
    }

    console.error("Acknowledge ledger error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
});

// Get ledger entries
app.get("/ledger", requireAuth, (req, res) => {
  try {
    const { vpiId } = req.auth;
    const { peer } = req.query;

    let sql = "SELECT * FROM ledger_entries WHERE from_vpi = ? OR to_vpi = ?";
    let params = [vpiId, vpiId];

    if (peer) {
      sql += " AND (from_vpi = ? OR to_vpi = ?)";
      params.push(peer, peer);
    }

    sql += " ORDER BY createdAt DESC";

    const entries = db.all(sql, params);

    res.json({
      ok: true,
      entries,
    });
  } catch (error) {
    console.error("Get ledger error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
});

// LOI ENDPOINTS

// Create LOI
app.post("/loi", requireAuth, (req, res) => {
  try {
    const { partyB_vpi, terms, lang } = loiSchema.parse(req.body);
    const { vpiId } = req.auth;

    const id = uuidv4();
    const now = Date.now();
    const termsJson = JSON.stringify(terms);
    const termsHash = hash(termsJson);

    db.run(
      "INSERT INTO loi (id, partyA_vpi, partyB_vpi, terms_json, lang, status, hash, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, vpiId, partyB_vpi, termsJson, lang, "draft", termsHash, now],
    );

    res.status(201).json({
      ok: true,
      id,
      status: "draft",
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        ok: false,
        error: "Validation error",
        details: error.errors,
      });
    }

    console.error("Create LOI error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
});

// Sign LOI
app.post("/loi/:id/sign", requireAuth, (req, res) => {
  try {
    const { totpCode } = loiSignSchema.parse(req.body);
    const { vpiId, userId } = req.auth;
    const { id } = req.params;

    // Get LOI
    const loi = db.get("SELECT * FROM loi WHERE id = ?", [id]);
    if (!loi) {
      return res.status(404).json({
        ok: false,
        error: "LOI not found",
      });
    }

    if (loi.partyA_vpi !== vpiId && loi.partyB_vpi !== vpiId) {
      return res.status(403).json({
        ok: false,
        error: "Only parties can sign this LOI",
      });
    }

    // Check if already signed by this party
    const existingSig = db.get(
      "SELECT * FROM loi_signatures WHERE loiId = ? AND signer_vpi = ?",
      [id, vpiId],
    );
    if (existingSig) {
      return res.status(400).json({
        ok: false,
        error: "Already signed by this party",
      });
    }

    // Verify TOTP
    const user = db.get(
      `
      SELECT ts.secret_enc, ts.iv, ts.tag
      FROM totp_secrets ts
      WHERE ts.userId = ? AND ts.active = 1
    `,
      [userId],
    );

    if (!user) {
      return res.status(400).json({
        ok: false,
        error: "TOTP not configured",
      });
    }

    const secret = decrypt({
      ciphertext: user.secret_enc,
      iv: user.iv,
      tag: user.tag,
    });

    if (!verify(totpCode, secret)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid TOTP code",
      });
    }

    // Create signature
    const sigId = uuidv4();
    const now = Date.now();
    const sigHash = hash(`${id}:${vpiId}:${now}:${totpCode}`);

    db.run(
      "INSERT INTO loi_signatures (id, loiId, signer_vpi, signedAt, signature_hash) VALUES (?, ?, ?, ?, ?)",
      [sigId, id, vpiId, now, sigHash],
    );

    // Update LOI status
    const signatures = db.all("SELECT * FROM loi_signatures WHERE loiId = ?", [
      id,
    ]);
    let newStatus = "draft";

    if (signatures.length === 1) {
      newStatus = "signedA";
    } else if (signatures.length === 2) {
      newStatus = "active";
      // Add trust events when both parties sign
      bumpScoreOn("loi_signed", {
        partyA_vpi: loi.partyA_vpi,
        partyB_vpi: loi.partyB_vpi,
      });
    }

    db.run("UPDATE loi SET status = ? WHERE id = ?", [newStatus, id]);

    res.json({
      ok: true,
      signed: true,
      status: newStatus,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        ok: false,
        error: "Validation error",
        details: error.errors,
      });
    }

    console.error("Sign LOI error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
});

// Get LOI PDF
app.get("/loi/:id/pdf", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get LOI and signatures
    const loi = db.get("SELECT * FROM loi WHERE id = ?", [id]);
    if (!loi) {
      return res.status(404).json({
        ok: false,
        error: "LOI not found",
      });
    }

    const signatures = db.all(
      "SELECT * FROM loi_signatures WHERE loiId = ? ORDER BY signedAt",
      [id],
    );

    // Get party details (simplified for now)
    const partyA = { name: "Party A", vpi: loi.partyA_vpi };
    const partyB = { name: "Party B", vpi: loi.partyB_vpi };

    const terms = JSON.parse(loi.terms_json);

    // Generate PDF
    const pdfBuffer = await generateLoiPdf({
      loi,
      partyA,
      partyB,
      signatures,
      bilingualTerms: terms,
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdfBuffer.length,
      "Content-Disposition": `attachment; filename="loi-${id}.pdf"`,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Generate LOI PDF error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
});

// ATTENDANCE ENDPOINTS

// Self punch
app.post("/attendance/punch", requireAuth, (req, res) => {
  try {
    const { type, lat, lng, ts } = attendancePunchSchema.parse(req.body);
    const { vpiId } = req.auth;

    const id = uuidv4();
    const now = ts || Date.now();
    const method = lat && lng ? "geo" : "manual";

    // For now, use a default orgId (in real app, this would come from user's org)
    const orgId = "default-org";

    db.run(
      "INSERT INTO attendance (id, worker_vpi, orgId, supervisor_vpi, type, lat, lng, ts, method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, vpiId, orgId, null, type, lat || null, lng || null, now, method],
    );

    // Add trust event for on-time attendance (simplified)
    addEvent(vpiId, "attendance_punch", 1);

    res.status(201).json({
      ok: true,
      id,
      type,
      method,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        ok: false,
        error: "Validation error",
        details: error.errors,
      });
    }

    console.error("Punch attendance error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
});

// Bulk attendance submission
app.post("/attendance/bulk", requireAuth, (req, res) => {
  try {
    const { entries, totpCode } = attendanceBulkSchema.parse(req.body);
    const { vpiId, userId } = req.auth;

    // Verify TOTP
    const user = db.get(
      `
      SELECT ts.secret_enc, ts.iv, ts.tag
      FROM totp_secrets ts
      WHERE ts.userId = ? AND ts.active = 1
    `,
      [userId],
    );

    if (!user) {
      return res.status(400).json({
        ok: false,
        error: "TOTP not configured",
      });
    }

    const secret = decrypt({
      ciphertext: user.secret_enc,
      iv: user.iv,
      tag: user.tag,
    });

    if (!verify(totpCode, secret)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid TOTP code",
      });
    }

    // Create attendance entries
    const bulkId = uuidv4();
    const now = Date.now();

    for (const entry of entries) {
      const id = uuidv4();
      const method = entry.lat && entry.lng ? "geo" : "manual";

      db.run(
        "INSERT INTO attendance (id, worker_vpi, orgId, supervisor_vpi, type, lat, lng, ts, method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          id,
          entry.worker_vpi,
          "default-org",
          vpiId,
          entry.type,
          entry.lat || null,
          entry.lng || null,
          entry.ts,
          method,
        ],
      );
    }

    // Create approval request
    const approvalId = uuidv4();
    db.run(
      "INSERT INTO approvals (id, kind, refId, initiator_vpi, approver_vpi, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        approvalId,
        "attendance",
        bulkId,
        vpiId,
        "pending-approver",
        "pending",
        now,
      ],
    );

    res.json({
      ok: true,
      submitted: true,
      count: entries.length,
      bulkId,
      approvalId,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        ok: false,
        error: "Validation error",
        details: error.errors,
      });
    }

    console.error("Bulk attendance error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
});

// APPROVAL ENDPOINTS

// Approve
app.post("/approvals/:id/approve", requireAuth, (req, res) => {
  try {
    const { totpCode } = approvalSchema.parse(req.body);
    const { vpiId, userId } = req.auth;
    const { id } = req.params;

    // Get approval
    const approval = db.get("SELECT * FROM approvals WHERE id = ?", [id]);
    if (!approval) {
      return res.status(404).json({
        ok: false,
        error: "Approval not found",
      });
    }

    if (approval.status !== "pending") {
      return res.status(400).json({
        ok: false,
        error: "Approval already processed",
      });
    }

    // Verify TOTP
    const user = db.get(
      `
      SELECT ts.secret_enc, ts.iv, ts.tag
      FROM totp_secrets ts
      WHERE ts.userId = ? AND ts.active = 1
    `,
      [userId],
    );

    if (!user) {
      return res.status(400).json({
        ok: false,
        error: "TOTP not configured",
      });
    }

    const secret = decrypt({
      ciphertext: user.secret_enc,
      iv: user.iv,
      tag: user.tag,
    });

    if (!verify(totpCode, secret)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid TOTP code",
      });
    }

    // Update approval
    const now = Date.now();
    db.run(
      "UPDATE approvals SET status = ?, approver_vpi = ?, decidedAt = ? WHERE id = ?",
      ["approved", vpiId, now, id],
    );

    // Add trust events for approved attendance
    if (approval.kind === "attendance") {
      // This would need to be more sophisticated in a real app
      addEvent(approval.initiator_vpi, "attendance_approved", 2);
    }

    res.json({
      ok: true,
      approved: true,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        ok: false,
        error: "Validation error",
        details: error.errors,
      });
    }

    console.error("Approve error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
});

// Role change request endpoint
app.post("/support/role-change", requireAuth, (req, res) => {
  try {
    const { to_role, reason } = roleChangeSchema.parse(req.body);

    const { vpiId } = req.auth;
    const user = db.get(
      "SELECT id, role, role_locked FROM users WHERE id = (SELECT userId FROM vpi WHERE vpiId = ?)",
      [vpiId],
    );

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "User not found",
      });
    }

    // Always treat as locked for this endpoint (only requests, no direct changes)
    if (user.role === to_role) {
      return res.status(400).json({
        ok: false,
        error: "Already has this role",
      });
    }

    const requestId = uuidv4();
    const now = Date.now();

    db.run(
      `
            INSERT INTO role_change_requests (id, user_id, from_role, to_role, reason, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'pending', ?)
        `,
      [requestId, user.id, user.role, to_role, reason, now],
    );

    res.json({
      ok: true,
      id: requestId,
      status: "pending",
    });
  } catch (error) {
    console.error("Role change request error:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({
        ok: false,
        error: error.errors[0].message,
      });
    }
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

// Get user's role change requests
app.get("/support/role-change/me", requireAuth, (req, res) => {
  try {
    const { vpiId } = req.auth;
    const user = db.get(
      "SELECT id FROM users WHERE id = (SELECT userId FROM vpi WHERE vpiId = ?)",
      [vpiId],
    );

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "User not found",
      });
    }

    const requests = db.all(
      `
            SELECT id, from_role, to_role, reason, status, created_at, decided_at
            FROM role_change_requests
            WHERE user_id = ?
            ORDER BY created_at DESC
        `,
      [user.id],
    );

    res.json({
      ok: true,
      requests,
    });
  } catch (error) {
    console.error("Get role change requests error:", error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

// Admin endpoints for role change management
app.get("/admin/role-change", adminGuard, (req, res) => {
  try {
    const { status = "pending", limit = 50, offset = 0 } = req.query;

    const requests = db.all(
      `
            SELECT r.id, r.user_id, r.from_role, r.to_role, r.reason, r.status, r.created_at, r.decided_at,
                   u.phone, u.role as current_role
            FROM role_change_requests r
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.status = ?
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        `,
      [status, parseInt(limit), parseInt(offset)],
    );

    const total = db.get(
      `
            SELECT COUNT(*) as count FROM role_change_requests WHERE status = ?
        `,
      [status],
    ).count;

    res.json({
      ok: true,
      items: requests,
      total,
    });
  } catch (error) {
    console.error("Admin get role change requests error:", error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/admin/role-change/:id", adminGuard, (req, res) => {
  try {
    const { id } = req.params;

    const request = db.get(
      `
            SELECT r.*, u.phone, u.role as current_role
            FROM role_change_requests r
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.id = ?
        `,
      [id],
    );

    if (!request) {
      return res.status(404).json({
        ok: false,
        error: "Request not found",
      });
    }

    res.json({
      ok: true,
      request,
    });
  } catch (error) {
    console.error("Admin get role change request error:", error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.post("/admin/role-change/:id/approve", adminGuard, (req, res) => {
  try {
    const { id } = req.params;
    const request = db.get(
      "SELECT * FROM role_change_requests WHERE id = ? AND status = ?",
      [id, "pending"],
    );

    if (!request) {
      return res.status(404).json({
        ok: false,
        error: "Request not found or already processed",
      });
    }

    const now = Date.now();

    // Update user role
    db.run("UPDATE users SET role = ? WHERE id = ?", [
      request.to_role,
      request.user_id,
    ]);

    // Update request status
    db.run(
      "UPDATE role_change_requests SET status = ?, decided_at = ? WHERE id = ?",
      ["approved", now, id],
    );

    res.json({
      ok: true,
      message: "Role change approved",
    });
  } catch (error) {
    console.error("Admin role change approval error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
});

app.post("/admin/role-change/:id/reject", adminGuard, (req, res) => {
  try {
    const { id } = req.params;
    const request = db.get(
      "SELECT * FROM role_change_requests WHERE id = ? AND status = ?",
      [id, "pending"],
    );

    if (!request) {
      return res.status(404).json({
        ok: false,
        error: "Request not found or already processed",
      });
    }

    const now = Date.now();

    // Update request status
    db.run(
      "UPDATE role_change_requests SET status = ?, decided_at = ? WHERE id = ?",
      ["rejected", now, id],
    );

    res.json({
      ok: true,
      message: "Role change rejected",
    });
  } catch (error) {
    console.error("Admin role change rejection error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
});

// Policy endpoint (DEBUG)
if (process.env.ML_DEBUG === "1") {
  app.get("/_policy", (req, res) => {
    res.json({
      roleLocked: true,
      switchAllowed: false,
    });
  });
}

// ML DEBUG ROUTES (only when ML_DEBUG=1)
if (process.env.ML_DEBUG === "1") {
  // ML Health check
  app.get("/_ml/health", async (req, res) => {
    try {
      const health = await mlClient.health();
      res.json(health);
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  });

  // ML Embed proxy
  app.post("/_ml/embed", async (req, res) => {
    try {
      const { texts, normalize } = req.body;
      const result = await mlClient.embed(texts, normalize);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  });

  // VSS Status endpoint
  app.get("/_vss/status", (req, res) => {
    try {
      const status = searchPipeline.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  });
}

// SEMANTIC SEARCH (only when ML_SEARCH=1)
if (process.env.ML_SEARCH === "1") {
  // Enhanced search endpoint using search pipeline
  app.get("/search", async (req, res) => {
    try {
      const { q, type, topK = 20 } = req.query;

      if (!q || !type) {
        return res.status(400).json({
          ok: false,
          error: "Missing required parameters: q (query) and type",
        });
      }

      // Use enhanced search pipeline
      const results = await searchPipeline.search(type, q, parseInt(topK));

      res.json({
        usedML: true,
        type,
        q,
        topK: parseInt(topK),
        results,
      });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  });
}

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Vyaamik Samadhaan API listening on http://0.0.0.0:${PORT}`);
  console.log("Available endpoints:");
  console.log("  GET  / - Health check");
  console.log("  POST /signup - Create user account");
  console.log("  POST /totp/verify - Verify TOTP code");
  console.log("  POST /login - Login with phone and TOTP");
  console.log("  GET  /me - Get user profile (requires auth)");
  console.log("  POST /ledger - Create ledger entry (requires auth)");
  console.log(
    "  POST /ledger/:id/ack - Acknowledge ledger entry (requires auth)",
  );
  console.log("  GET  /ledger - Get ledger entries (requires auth)");
  console.log("  POST /loi - Create LOI (requires auth)");
  console.log("  POST /loi/:id/sign - Sign LOI (requires auth)");
  console.log("  GET  /loi/:id/pdf - Get LOI PDF (requires auth)");
  console.log(
    "  POST /attendance/punch - Self punch attendance (requires auth)",
  );
  console.log(
    "  POST /attendance/bulk - Bulk attendance submission (requires auth)",
  );
  console.log(
    "  POST /approvals/:id/approve - Approve request (requires auth)",
  );
});
