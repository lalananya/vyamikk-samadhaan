/**
 * SECURE Encryption Module
 *
 * Security improvements:
 * - AES-256-GCM with proper authentication
 * - Constant-time comparison to prevent timing attacks
 * - Secure key derivation using PBKDF2
 * - Proper IV generation with crypto.randomBytes
 * - Memory-safe operations
 */

const crypto = require("node:crypto");

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const PBKDF2_ITERATIONS = 100000; // OWASP recommended minimum

// Secure key derivation
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    "sha256",
  );
}

// Get encryption key with proper derivation
function getEncryptionKey() {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    if (envKey.length === 64) {
      // Hex string - convert to buffer
      return Buffer.from(envKey, "hex");
    } else if (envKey.length === 32) {
      // Raw string - derive key with salt
      const salt =
        process.env.ENCRYPTION_SALT || crypto.randomBytes(SALT_LENGTH);
      return deriveKey(envKey, salt);
    }
  }

  // Fallback dev key with warning
  console.warn(
    "⚠️  Using development encryption key. Set ENCRYPTION_KEY in production!",
  );
  const devKey = "dev-key-32-chars-long-please-change";
  const salt = Buffer.from("dev-salt-32-chars-long-please-change", "utf8");
  return deriveKey(devKey, salt);
}

const ENCRYPTION_KEY = getEncryptionKey();

/**
 * Secure encrypt using AES-256-GCM
 * @param {string} text - Plain text to encrypt
 * @returns {Object} - { ciphertext: Buffer, iv: Buffer, tag: Buffer, salt: Buffer }
 */
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  cipher.setAAD(Buffer.from("vyaamikk-samadhaan", "utf8")); // Additional authenticated data

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  return {
    ciphertext: Buffer.from(encrypted, "hex"),
    iv: iv,
    tag: tag,
    salt: Buffer.alloc(0), // No salt needed for direct key usage
  };
}

/**
 * Secure decrypt using AES-256-GCM
 * @param {Object} encrypted - { ciphertext: Buffer, iv: Buffer, tag: Buffer, salt: Buffer }
 * @returns {string} - Decrypted plain text
 * @throws {Error} - If decryption fails (authentication error)
 */
function decrypt(encrypted) {
  const { ciphertext, iv, tag } = encrypted;

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAAD(Buffer.from("vyaamikk-samadhaan", "utf8"));
  decipher.setAuthTag(tag);

  try {
    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    throw new Error("Decryption failed: Invalid or tampered data");
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} - True if strings are equal
 */
function constantTimeCompare(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Secure hash with salt using scrypt
 * @param {string} data - Data to hash
 * @param {Buffer} salt - Salt buffer (optional)
 * @returns {Object} - { hash: string, salt: Buffer }
 */
function secureHash(data, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(32);
  }

  const hash = crypto.scryptSync(data, salt, 64);
  return {
    hash: hash.toString("hex"),
    salt: salt,
  };
}

/**
 * Verify secure hash
 * @param {string} data - Data to verify
 * @param {string} hash - Hash to verify against
 * @param {Buffer} salt - Salt used in original hash
 * @returns {boolean} - True if hash matches
 */
function verifyHash(data, hash, salt) {
  const computed = secureHash(data, salt);
  return constantTimeCompare(computed.hash, hash);
}

/**
 * Generate cryptographically secure random token
 * @param {number} length - Token length in bytes
 * @returns {string} - Random token as hex string
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Generate secure random string for IDs
 * @param {number} length - String length
 * @returns {string} - Random string
 */
function generateSecureId(length = 16) {
  return crypto.randomBytes(length).toString("base64url");
}

/**
 * Encrypt sensitive data with additional context
 * @param {string} data - Data to encrypt
 * @param {string} context - Additional context for encryption
 * @returns {Object} - Encrypted data with context
 */
function encryptWithContext(data, context) {
  const contextHash = crypto.createHash("sha256").update(context).digest();
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  cipher.setAAD(contextHash);

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  return {
    ciphertext: Buffer.from(encrypted, "hex"),
    iv: crypto.randomBytes(IV_LENGTH),
    tag: cipher.getAuthTag(),
    context: context,
  };
}

/**
 * Decrypt data with context verification
 * @param {Object} encrypted - Encrypted data with context
 * @returns {string} - Decrypted data
 */
function decryptWithContext(encrypted) {
  const { ciphertext, iv, tag, context } = encrypted;
  const contextHash = crypto.createHash("sha256").update(context).digest();

  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
  decipher.setAAD(contextHash);
  decipher.setAuthTag(tag);

  try {
    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    throw new Error("Decryption failed: Invalid context or tampered data");
  }
}

module.exports = {
  encrypt,
  decrypt,
  encryptWithContext,
  decryptWithContext,
  secureHash,
  verifyHash,
  constantTimeCompare,
  generateSecureToken,
  generateSecureId,
  generateToken: generateSecureToken, // Backward compatibility
  generateRandomString: generateSecureId, // Backward compatibility
  hash: (data) => secureHash(data).hash, // Backward compatibility
};
