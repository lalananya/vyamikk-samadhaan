/**
 * Unique Ecosystem ID (UEID) System - JavaScript version
 * Format: VS-XXXX-XXXX-XXXX (14 visible chars incl. dashes)
 * Alphabet: Crockford Base32 (0-9 A-Z excluding I, L, O)
 * Length: 12 data chars + 1 check char
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Crockford Base32 alphabet (excluding I, L, O for ambiguity)
const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTUVWXYZ';

// SALT for HMAC generation (in production, use env var)
const UEID_SALT = process.env.UEID_SALT || 'vyaamikk-samadhaan-ueid-salt-2025';

/**
 * Generate a new UEID with PIN
 */
function generateUEID(userId, pin = '0000', counter = 0) {
  // Create input for HMAC: UUIDv4 + userId + pin + counter
  const input = `${uuidv4()}-${userId}-${pin}-${counter}`;
  
  // Generate HMAC
  const hmac = crypto.createHmac('sha256', UEID_SALT);
  hmac.update(input);
  const hash = hmac.digest();
  
  // Convert to base32 and take first 7 characters (reduced due to PIN)
  const base32 = toCrockfordBase32(hash);
  const dataChars = base32.substring(0, 7);
  
  // Calculate check character using Luhn mod 32 for 7 characters
  const checkChar = calculateLuhnCheckChar7(dataChars);
  
  // Format as VS-PIN-XXXX-XXXX
  return formatUEIDWithPIN(pin, dataChars + checkChar);
}

/**
 * Validate UEID format and checksum
 */
function validateUEID(ueid) {
  try {
    // Check if it's the new PIN format VS-PIN-XXXX-XXXX
    if (ueid.match(/^VS-\d{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
      return validateUEIDWithPIN(ueid);
    }
    
    // Fallback to old format validation
    const normalized = normalizeUEID(ueid);
    
    if (!normalized) {
      return { valid: false, error: 'Invalid format' };
    }
    
    // Check format
    const formatRegex = /^VS-[0-9A-HJ-NP-Z]{4}-[0-9A-HJ-NP-Z]{4}-[0-9A-HJ-NP-Z]{4}$/i;
    if (!formatRegex.test(normalized)) {
      return { valid: false, error: 'Invalid format' };
    }
    
    // Extract data and check character
    const clean = normalized.replace(/^VS-/, '').replace(/-/g, '');
    const dataChars = clean.substring(0, 11);
    const checkChar = clean.substring(11, 12);
    
    // Verify checksum
    const expectedCheckChar = calculateLuhnCheckChar(dataChars);
    if (checkChar !== expectedCheckChar) {
      return { valid: false, error: 'Invalid checksum' };
    }
    
    return { valid: true, normalized };
  } catch (error) {
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate UEID with PIN format VS-PIN-XXXX-XXXX
 */
function validateUEIDWithPIN(ueid) {
  try {
    // Extract parts
    const parts = ueid.split('-');
    if (parts.length !== 4 || parts[0] !== 'VS') {
      return { valid: false, error: 'Invalid format' };
    }
    
    const pin = parts[1];
    const dataPart1 = parts[2];
    const dataPart2 = parts[3];
    
    // Validate PIN (4 digits)
    if (!pin.match(/^\d{4}$/)) {
      return { valid: false, error: 'Invalid PIN format' };
    }
    
    // Validate data parts (4 chars each, Crockford Base32)
    const dataChars = dataPart1 + dataPart2;
    for (const char of dataChars) {
      if (!CROCKFORD_BASE32.includes(char)) {
        return { valid: false, error: 'Invalid character in data part' };
      }
    }
    
    // Verify checksum (7 data chars + 1 check char)
    const dataPart = dataChars.substring(0, 7);
    const checkChar = dataChars.substring(7, 8);
    const expectedCheckChar = calculateLuhnCheckChar7(dataPart);
    
    if (checkChar !== expectedCheckChar) {
      return { valid: false, error: 'Invalid checksum' };
    }
    
    return { valid: true, data: ueid, pin: pin };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Normalize UEID input (strip spaces/dashes, uppercase, map ambiguous chars)
 */
function normalizeUEID(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }
  
  // Remove spaces and dashes, convert to uppercase
  let normalized = input.replace(/[\s-]/g, '').toUpperCase();
  
  // Map ambiguous characters
  normalized = normalized
    .replace(/[IL]/g, '1')  // I, L -> 1
    .replace(/O/g, '0');    // O -> 0
  
  // Check if it looks like a UEID (starts with VS)
  if (!normalized.startsWith('VS')) {
    return null;
  }
  
  // Remove VS prefix for processing
  const withoutPrefix = normalized.substring(2);
  
  // Check length (should be 12 chars)
  if (withoutPrefix.length !== 12) {
    return null;
  }
  
  // Check all characters are valid Crockford Base32
  for (const char of withoutPrefix) {
    if (!CROCKFORD_BASE32.includes(char)) {
      return null;
    }
  }
  
  // Format back to VS-XXXX-XXXX-XXXX
  return formatUEID(withoutPrefix);
}

/**
 * Format 12-character string as VS-XXXX-XXXX-XXXX
 */
function formatUEID(data) {
  if (data.length !== 12) {
    throw new Error('Data must be exactly 12 characters');
  }
  
  return `VS-${data.substring(0, 4)}-${data.substring(4, 8)}-${data.substring(8, 12)}`;
}

/**
 * Format 8-character string as VS-PIN-XXXX-XXXX
 */
function formatUEIDWithPIN(pin, data) {
  if (data.length !== 8) {
    throw new Error('Data must be exactly 8 characters');
  }
  
  if (pin.length !== 4) {
    throw new Error('PIN must be exactly 4 characters');
  }
  
  return `VS-${pin}-${data.substring(0, 4)}-${data.substring(4, 8)}`;
}

/**
 * Calculate Luhn check character for mod 32 (7 characters)
 */
function calculateLuhnCheckChar7(data) {
  if (data.length !== 7) {
    throw new Error('Data must be exactly 7 characters for checksum calculation');
  }
  
  let sum = 0;
  let alternate = false;
  
  // Process from right to left
  for (let i = data.length - 1; i >= 0; i--) {
    const char = data[i];
    const value = CROCKFORD_BASE32.indexOf(char);
    
    if (value === -1) {
      throw new Error(`Invalid character: ${char}`);
    }
    
    let digit = value;
    
    if (alternate) {
      digit *= 2;
      if (digit >= 32) {
        digit = Math.floor(digit / 32) + (digit % 32);
      }
    }
    
    sum += digit;
    alternate = !alternate;
  }
  
  const checkDigit = (32 - (sum % 32)) % 32;
  return CROCKFORD_BASE32[checkDigit];
}

/**
 * Calculate Luhn check character for mod 32 (11 characters)
 */
function calculateLuhnCheckChar(data) {
  if (data.length !== 11) {
    throw new Error('Data must be exactly 11 characters for checksum calculation');
  }
  
  let sum = 0;
  let alternate = false;
  
  // Process from right to left
  for (let i = data.length - 1; i >= 0; i--) {
    const char = data[i];
    const value = CROCKFORD_BASE32.indexOf(char);
    
    if (value === -1) {
      throw new Error(`Invalid character: ${char}`);
    }
    
    let digit = value;
    
    if (alternate) {
      digit *= 2;
      if (digit >= 32) {
        digit = Math.floor(digit / 32) + (digit % 32);
      }
    }
    
    sum += digit;
    alternate = !alternate;
  }
  
  const checkDigit = (32 - (sum % 32)) % 32;
  return CROCKFORD_BASE32[checkDigit];
}

/**
 * Convert buffer to Crockford Base32
 */
function toCrockfordBase32(buffer) {
  let result = '';
  let bits = 0;
  let value = 0;
  
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    
    while (bits >= 5) {
      const index = (value >>> (bits - 5)) & 0x1f;
      result += CROCKFORD_BASE32[index];
      value &= (1 << (bits - 5)) - 1;
      bits -= 5;
    }
  }
  
  if (bits > 0) {
    const index = (value << (5 - bits)) & 0x1f;
    result += CROCKFORD_BASE32[index];
  }
  
  return result;
}

/**
 * Generate UEID with collision handling
 */
async function generateUEIDWithCollisionHandling(userId, checkCollision) {
  let counter = 0;
  let maxAttempts = 100; // Prevent infinite loops
  
  while (counter < maxAttempts) {
    const ueid = generateUEID(userId, counter);
    
    // Check for collision
    const isCollision = await checkCollision(ueid);
    if (!isCollision) {
      return ueid;
    }
    
    counter++;
  }
  
  throw new Error('Unable to generate unique UEID after maximum attempts');
}

module.exports = {
  generateUEID,
  validateUEID,
  validateUEIDWithPIN,
  normalizeUEID,
  formatUEID,
  formatUEIDWithPIN,
  calculateLuhnCheckChar,
  calculateLuhnCheckChar7,
  generateUEIDWithCollisionHandling
};
