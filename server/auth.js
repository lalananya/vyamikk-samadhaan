const jwt = require("jsonwebtoken");
const { z } = require("zod");
const crypto = require("node:crypto");

// Role validation schema
const roleSchema = z.enum(["organisation", "professional"]);

// Role validation helper
function validateRole(value) {
  try {
    return roleSchema.parse(value);
  } catch (error) {
    throw new Error('Invalid role. Must be "organisation" or "professional"');
  }
}

// Role change request schema
const roleChangeSchema = z.object({
  to_role: roleSchema,
  reason: z
    .string()
    .min(10, "Reason must be at least 10 characters")
    .max(500, "Reason must be less than 500 characters"),
});

const JWT_SECRET =
  process.env.JWT_SECRET || "vyaamik-samadhaan-dev-secret-change-in-production";
const JWT_EXPIRES_IN = "24h";

// Phone validation and canonicalization
const INDIAN_MOBILE_REGEX = /^(?:\+91|0)?[6-9]\d{9}$/;
const PINCODE_REGEX = /^[1-9]\d{5}$/;

/**
 * Canonicalize Indian mobile number to E.164 format
 * @param {string} phone - Raw phone input
 * @returns {string} - Canonical E.164 format (+91XXXXXXXXXX)
 */
function canonicalizeIndianMobile(phone) {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");

  // Handle different input formats
  if (digits.length === 10 && digits[0] >= "6" && digits[0] <= "9") {
    return `+91${digits}`;
  } else if (
    digits.length === 11 &&
    digits[0] === "0" &&
    digits[1] >= "6" &&
    digits[1] <= "9"
  ) {
    return `+91${digits.substring(1)}`;
  } else if (
    digits.length === 12 &&
    digits.startsWith("91") &&
    digits[2] >= "6" &&
    digits[2] <= "9"
  ) {
    return `+${digits}`;
  }

  throw new Error("Invalid Indian mobile number format");
}

/**
 * Validate Indian mobile number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
function isValidIndianMobile(phone) {
  return INDIAN_MOBILE_REGEX.test(phone);
}

/**
 * Hash phone number for privacy
 * @param {string} phone - Canonical phone number
 * @returns {string} - SHA-256 hash
 */
function hashPhone(phone) {
  return crypto.createHash("sha256").update(phone).digest("hex");
}

/**
 * Get last 4 digits of phone
 * @param {string} phone - Canonical phone number
 * @returns {string} - Last 4 digits
 */
function getPhoneLast4(phone) {
  return phone.slice(-4);
}

/**
 * Generate JWT token for user
 * @param {Object} payload - Token payload
 * @returns {string} - JWT token
 */
function sign(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: "vyaamik-samadhaan",
    audience: "mobile-app",
  });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token payload
 */
function verify(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: "vyaamik-samadhaan",
      audience: "mobile-app",
    });
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

/**
 * Express middleware to authenticate requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      ok: false,
      error: "Access token required",
    });
  }

  try {
    const decoded = verify(token);
    req.auth = {
      userId: decoded.userId,
      vpiId: decoded.vpiId,
      role: decoded.role,
    };
    next();
  } catch (error) {
    return res.status(403).json({
      ok: false,
      error: "Invalid or expired token",
    });
  }
}

// Zod validation schemas
const signupSchema = z.object({
  phone: z
    .string()
    .refine(isValidIndianMobile, "Invalid Indian mobile number format"),
  role: roleSchema,
});

const pincodeSchema = z.object({
  pincode: z.string().regex(PINCODE_REGEX, "Invalid PIN code format"),
});

const totpVerifySchema = z.object({
  phone: z
    .string()
    .refine(isValidIndianMobile, "Invalid Indian mobile number format"),
  code: z.string().regex(/^\d{6}$/, "TOTP code must be 6 digits"),
});

const loginSchema = z
  .object({
    phone: z
      .string()
      .refine(isValidIndianMobile, "Invalid Indian mobile number format"),
    totpCode: z
      .string()
      .regex(/^\d{6}$/, "TOTP code must be 6 digits")
      .optional(),
    otp: z
      .string()
      .regex(/^\d{6}$/, "OTP code must be 6 digits")
      .optional(),
  })
  .refine((data) => data.totpCode || data.otp, {
    message: "Either totpCode or otp is required",
  });

const ledgerSchema = z.object({
  to_vpi: z.string().uuid("Invalid VPI ID"),
  type: z.string().min(1, "Type is required"),
  amount: z.number().int().positive("Amount must be positive"),
  note: z.string().optional(),
});

const ledgerAckSchema = z.object({
  totpCode: z.string().regex(/^\d{6}$/, "TOTP code must be 6 digits"),
});

const loiSchema = z.object({
  partyB_vpi: z.string().uuid("Invalid VPI ID"),
  terms: z.object({
    en: z.record(z.any()),
    local: z.record(z.any()),
  }),
  lang: z.string().min(2, "Language code required"),
});

const loiSignSchema = z.object({
  totpCode: z.string().regex(/^\d{6}$/, "TOTP code must be 6 digits"),
});

const attendancePunchSchema = z.object({
  type: z.enum(["in", "out"]),
  lat: z.number().optional(),
  lng: z.number().optional(),
  ts: z.number().int().optional(),
});

const attendanceBulkSchema = z.object({
  entries: z.array(
    z.object({
      worker_vpi: z.string().uuid("Invalid VPI ID"),
      type: z.enum(["in", "out"]),
      ts: z.number().int(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    }),
  ),
  totpCode: z.string().regex(/^\d{6}$/, "TOTP code must be 6 digits"),
});

const approvalSchema = z.object({
  totpCode: z.string().regex(/^\d{6}$/, "TOTP code must be 6 digits"),
});

module.exports = {
  sign,
  verify,
  requireAuth,
  canonicalizeIndianMobile,
  isValidIndianMobile,
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
};
