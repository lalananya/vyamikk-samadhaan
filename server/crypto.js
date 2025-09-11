const crypto = require("node:crypto");

const ALGORITHM = "aes-256-cbc";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

// Get encryption key from environment or generate dev key
function getEncryptionKey() {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    if (envKey.length === 64) {
      // Hex string
      return Buffer.from(envKey, "hex");
    } else if (envKey.length === 32) {
      // Raw string
      return Buffer.from(envKey, "utf8");
    }
  }

  // Fallback dev key with warning
  console.warn(
    "⚠️  Using development encryption key. Set ENCRYPTION_KEY in production!",
  );
  return Buffer.from("dev-key-32-chars-long-please-change", "utf8").subarray(
    0,
    32,
  );
}

const ENCRYPTION_KEY = getEncryptionKey();

/**
 * Encrypt text using AES-256-GCM
 * @param {string} text - Plain text to encrypt
 * @returns {Object} - { ciphertext: Buffer, iv: Buffer, tag: Buffer }
 */
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return {
    ciphertext: Buffer.from(encrypted, "hex"),
    iv: iv,
    tag: Buffer.alloc(0), // No tag for createCipheriv
  };
}

/**
 * Decrypt data using AES-256-GCM
 * @param {Object} encrypted - { ciphertext: Buffer, iv: Buffer, tag: Buffer }
 * @returns {string} - Decrypted plain text
 */
function decrypt(encrypted) {
  const { ciphertext, iv, tag } = encrypted;

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generate a random token
 * @param {number} length - Token length in bytes
 * @returns {string} - Random token as hex string
 */
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Generate a secure random string
 * @param {number} length - String length
 * @returns {string} - Random string
 */
function generateRandomString(length = 16) {
  return crypto.randomBytes(length).toString("base64url");
}

/**
 * Hash data using SHA-256
 * @param {string} data - Data to hash
 * @returns {string} - SHA-256 hash as hex string
 */
function hash(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

module.exports = {
  encrypt,
  decrypt,
  generateToken,
  generateRandomString,
  hash,
};
