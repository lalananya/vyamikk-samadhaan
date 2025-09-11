// Phone validation and canonicalization for Indian mobile numbers

const INDIAN_MOBILE_REGEX = /^(?:\+91|0)?[6-9]\d{9}$/;

/**
 * Validate Indian mobile number format
 * @param phone - Phone number to validate
 * @returns true if valid Indian mobile format
 */
export function isValidIndianMobile(phone: string): boolean {
  return INDIAN_MOBILE_REGEX.test(phone);
}

/**
 * Canonicalize Indian mobile number to E.164 format
 * @param phone - Raw phone input
 * @returns Canonical E.164 format (+91XXXXXXXXXX)
 * @throws Error if invalid format
 */
export function toE164India(phone: string): string {
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
 * Format phone number for display
 * @param phone - Phone number in any format
 * @returns Formatted phone number for display
 */
export function formatPhoneDisplay(phone: string): string {
  try {
    const canonical = toE164India(phone);
    // Display as +91 XXXXX XXXXX
    return canonical.replace(/(\+91)(\d{5})(\d{5})/, "$1 $2 $3");
  } catch {
    return phone; // Return original if can't format
  }
}

/**
 * Get last 4 digits of phone number
 * @param phone - Phone number in any format
 * @returns Last 4 digits
 */
export function getPhoneLast4(phone: string): string {
  try {
    const canonical = toE164India(phone);
    return canonical.slice(-4);
  } catch {
    return phone.slice(-4); // Fallback to last 4 of input
  }
}
