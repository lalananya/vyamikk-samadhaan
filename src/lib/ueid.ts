/**
 * Unique Ecosystem ID (UEID) System
 * Format: VS-XXXX-XXXX-XXXX (14 visible chars incl. dashes)
 * Alphabet: Crockford Base32 (0-9 A-Z excluding I, L, O)
 * Length: 12 data chars + 1 check char
 */

import { randomUUID } from 'expo-crypto';
import * as Crypto from 'expo-crypto';

// Crockford Base32 alphabet (excluding I, L, O for ambiguity)
const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CROCKFORD_BASE32_LOWER = '0123456789abcdefghjkmnpqrstuvwxyz';

// SALT for HMAC generation (in production, use env var)
const UEID_SALT = process.env.UEID_SALT || 'vyaamikk-samadhaan-ueid-salt-2025';

export interface UEIDResult {
  success: boolean;
  ueid?: string;
  error?: string;
}

export interface UEIDValidation {
  valid: boolean;
  normalized?: string;
  error?: string;
}

/**
 * Generate a new UEID
 */
export async function generateUEID(userId: string, counter: number = 0): Promise<string> {
  // Create input for HMAC: UUID + userId + counter
  const input = `${randomUUID()}-${userId}-${counter}`;
  
  // Generate HMAC using Expo Crypto
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input + UEID_SALT
  );
  
  // Convert to base32 and take first 11 characters
  const base32 = toCrockfordBase32(hash);
  const dataChars = base32.substring(0, 11);
  
  // Calculate check character using Luhn mod 32
  const checkChar = calculateLuhnCheckChar(dataChars);
  
  // Format as VS-XXXX-XXXX-XXXX
  return formatUEID(dataChars + checkChar);
}

/**
 * Validate UEID format and checksum
 */
export function validateUEID(ueid: string): UEIDValidation {
  try {
    // Normalize input
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
 * Normalize UEID input (strip spaces/dashes, uppercase, map ambiguous chars)
 */
export function normalizeUEID(input: string): string | null {
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
export function formatUEID(data: string): string {
  if (data.length !== 12) {
    throw new Error('Data must be exactly 12 characters');
  }
  
  return `VS-${data.substring(0, 4)}-${data.substring(4, 8)}-${data.substring(8, 12)}`;
}

/**
 * Calculate Luhn check character for mod 32
 */
export function calculateLuhnCheckChar(data: string): string {
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
 * Convert hex string to Crockford Base32
 */
function toCrockfordBase32(hexString: string): string {
  let result = '';
  let bits = 0;
  let value = 0;
  
  // Convert hex string to bytes
  for (let i = 0; i < hexString.length; i += 2) {
    const byte = parseInt(hexString.substr(i, 2), 16);
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
export async function generateUEIDWithCollisionHandling(
  userId: string,
  checkCollision: (ueid: string) => Promise<boolean>
): Promise<string> {
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

// Unit tests
export function runTests(): void {
  console.log('Running UEID tests...');
  
  // Test generation
  const testUserId = 'test-user-123';
  const ueid = generateUEID(testUserId);
  console.log('Generated UEID:', ueid);
  
  // Test validation
  const validation = validateUEID(ueid);
  console.log('Validation result:', validation);
  
  // Test normalization
  const testInputs = [
    'vs-1234-5678-9abc',
    'VS-1234-5678-9ABC',
    'vs 1234 5678 9abc',
    'vs-1234-5678-9abc',
    'VS-ILO-ILO-ILO', // Should normalize to VS-110-110-110
  ];
  
  for (const input of testInputs) {
    const normalized = normalizeUEID(input);
    console.log(`Input: "${input}" -> Normalized: "${normalized}"`);
  }
  
  console.log('UEID tests completed');
}

// Tests can be run manually if needed
// runTests();
