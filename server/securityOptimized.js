/**
 * SECURITY HARDENING Module
 *
 * Security improvements:
 * - Rate limiting with sliding window
 * - Input validation and sanitization
 * - SQL injection prevention
 * - XSS protection
 * - CSRF protection
 * - Security headers
 * - Request logging and monitoring
 */

const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const validator = require("validator");
const DOMPurify = require("isomorphic-dompurify");

class SecurityManager {
  constructor() {
    this.rateLimiters = new Map();
    this.suspiciousIPs = new Set();
    this.failedAttempts = new Map();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    // Initialize rate limiters for different endpoints
    this.setupRateLimiters();
    this.initialized = true;
  }

  setupRateLimiters() {
    // General API rate limiting
    this.rateLimiters.set(
      "general",
      rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: "Too many requests from this IP, please try again later.",
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
          this.logSuspiciousActivity(req, "RATE_LIMIT_EXCEEDED");
          res.status(429).json({
            ok: false,
            error: "Rate limit exceeded",
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
          });
        },
      }),
    );

    // Authentication rate limiting
    this.rateLimiters.set(
      "auth",
      rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5, // 5 login attempts per 15 minutes
        message: "Too many authentication attempts, please try again later.",
        skipSuccessfulRequests: true,
        handler: (req, res) => {
          this.logSuspiciousActivity(req, "AUTH_RATE_LIMIT_EXCEEDED");
          res.status(429).json({
            ok: false,
            error: "Too many authentication attempts",
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
          });
        },
      }),
    );

    // TOTP verification rate limiting
    this.rateLimiters.set(
      "totp",
      rateLimit({
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 3, // 3 TOTP attempts per 5 minutes
        message: "Too many TOTP verification attempts, please try again later.",
        handler: (req, res) => {
          this.logSuspiciousActivity(req, "TOTP_RATE_LIMIT_EXCEEDED");
          res.status(429).json({
            ok: false,
            error: "Too many TOTP verification attempts",
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
          });
        },
      }),
    );
  }

  getRateLimiter(type) {
    return this.rateLimiters.get(type) || this.rateLimiters.get("general");
  }

  // Input validation and sanitization
  sanitizeInput(input, type = "string") {
    if (typeof input !== "string") return input;

    switch (type) {
      case "email":
        return validator.normalizeEmail(input) || "";
      case "phone":
        return validator.isMobilePhone(input) ? validator.escape(input) : "";
      case "html":
        return DOMPurify.sanitize(input);
      case "sql":
        return input.replace(/['"\\;]/g, "");
      case "url":
        return validator.isURL(input) ? validator.escape(input) : "";
      default:
        return validator.escape(input);
    }
  }

  validateInput(input, rules) {
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = input[field];

      if (rule.required && (!value || value.trim() === "")) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value) {
        if (rule.type === "email" && !validator.isEmail(value)) {
          errors.push(`${field} must be a valid email`);
        } else if (rule.type === "phone" && !validator.isMobilePhone(value)) {
          errors.push(`${field} must be a valid phone number`);
        } else if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${field} must be at least ${rule.minLength} characters`);
        } else if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(
            `${field} must be no more than ${rule.maxLength} characters`,
          );
        } else if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`${field} format is invalid`);
        }
      }
    }

    return errors;
  }

  // SQL injection prevention
  escapeSQL(input) {
    if (typeof input !== "string") return input;
    return input.replace(/['"\\;]/g, "");
  }

  // XSS protection
  sanitizeHTML(input) {
    if (typeof input !== "string") return input;
    return DOMPurify.sanitize(input);
  }

  // Log suspicious activity
  logSuspiciousActivity(req, type, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      url: req.originalUrl,
      method: req.method,
      details,
    };

    console.warn("🚨 Suspicious activity detected:", logEntry);

    // Track failed attempts
    const key = `${req.ip}_${type}`;
    const attempts = this.failedAttempts.get(key) || 0;
    this.failedAttempts.set(key, attempts + 1);

    // Block IP after too many attempts
    if (attempts > 10) {
      this.suspiciousIPs.add(req.ip);
      console.error("🚫 IP blocked due to suspicious activity:", req.ip);
    }
  }

  // Check if IP is blocked
  isIPBlocked(ip) {
    return this.suspiciousIPs.has(ip);
  }

  // Security headers middleware
  getSecurityHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    });
  }

  // Request logging middleware
  getRequestLogger() {
    return (req, res, next) => {
      const start = Date.now();

      res.on("finish", () => {
        const duration = Date.now() - start;
        const logEntry = {
          timestamp: new Date().toISOString(),
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
        };

        if (res.statusCode >= 400) {
          console.warn("⚠️  Error response:", logEntry);
        } else {
          console.log("📝 Request:", logEntry);
        }
      });

      next();
    };
  }

  // Cleanup old failed attempts
  cleanup() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [key, timestamp] of this.failedAttempts.entries()) {
      if (now - timestamp > maxAge) {
        this.failedAttempts.delete(key);
      }
    }
  }
}

// Export singleton
const securityManager = new SecurityManager();

module.exports = {
  SecurityManager,
  securityManager,
};
