/**
 * Phone number normalization utilities
 * Converts various phone formats to E.164 standard
 */

export function toE164(raw: string): string | null {
    if (!raw) return null;

    // Remove all non-digit characters
    const digits = raw.replace(/\D/g, '');

    // Handle different input formats
    if (digits.startsWith('91') && digits.length === 12) {
        // 91XXXXXXXXXX -> +91XXXXXXXXXX
        return '+' + digits;
    }

    if (digits.length === 10) {
        // XXXXXXXXXX -> +91XXXXXXXXXX (assuming India)
        return '+91' + digits;
    }

    if (raw.startsWith('+')) {
        // Already in E.164 format
        return raw;
    }

    // Default: assume 10-digit number needs +91 prefix
    if (digits.length === 10) {
        return '+91' + digits;
    }

    return null;
}

export function isValidE164(phone: string): boolean {
    return /^\+[1-9]\d{1,14}$/.test(phone);
}

