// src/universal-id.ts
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";

const UNIVERSAL_ID_KEY = "universal_id";
const DEVICE_ID_KEY = "device_id";

export interface UniversalID {
  id: string;
  type: "employer" | "labour";
  deviceId: string;
  phone: string;
  createdAt: string;
  lastUpdated: string;
}

export interface DeviceInfo {
  deviceId: string;
  platform: string;
  version: string;
  model?: string;
}

/**
 * Generate a unique device ID based on device characteristics
 */
export async function generateDeviceId(): Promise<string> {
  try {
    // Try to get existing device ID
    const existingId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (existingId) {
      return existingId;
    }

    // Generate new device ID
    const deviceInfo = await getDeviceInfo();
    const deviceId = `${deviceInfo.platform}_${deviceInfo.version}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store device ID
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
    return deviceId;
  } catch (error) {
    // Fallback to memory-based ID
    const fallbackId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return fallbackId;
  }
}

/**
 * Get device information
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  const deviceId = await generateDeviceId();

  return {
    deviceId,
    platform: Platform.OS,
    version: Platform.Version.toString(),
    model: Constants.deviceName || "Unknown",
  };
}

/**
 * Generate universal unique ID for user
 */
export async function generateUniversalId(
  type: "employer" | "labour",
  phone: string,
): Promise<UniversalID> {
  try {
    const deviceId = await generateDeviceId();
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 9);

    const universalId: UniversalID = {
      id: `${type.toUpperCase()}_${timestamp}_${randomSuffix}`,
      type,
      deviceId,
      phone,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    // Store universal ID
    await SecureStore.setItemAsync(
      UNIVERSAL_ID_KEY,
      JSON.stringify(universalId),
    );

    return universalId;
  } catch (error) {
    throw new Error("Failed to generate universal ID");
  }
}

/**
 * Get current universal ID
 */
export async function getUniversalId(): Promise<UniversalID | null> {
  try {
    const stored = await SecureStore.getItemAsync(UNIVERSAL_ID_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Update universal ID
 */
export async function updateUniversalId(
  updates: Partial<UniversalID>,
): Promise<UniversalID | null> {
  try {
    const current = await getUniversalId();
    if (!current) {
      throw new Error("No universal ID found");
    }

    const updated: UniversalID = {
      ...current,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };

    await SecureStore.setItemAsync(UNIVERSAL_ID_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    return null;
  }
}

/**
 * Clear universal ID
 */
export async function clearUniversalId(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(UNIVERSAL_ID_KEY);
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Validate universal ID format
 */
export function validateUniversalId(id: string): boolean {
  const pattern = /^(EMPLOYER|LABOUR)_\d+_[a-z0-9]{9}$/;
  return pattern.test(id);
}

/**
 * Get ID type from universal ID
 */
export function getIdType(id: string): "employer" | "labour" | null {
  if (id.startsWith("EMPLOYER_")) return "employer";
  if (id.startsWith("LABOUR_")) return "labour";
  return null;
}

/**
 * Generate OTP for universal ID verification
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Verify OTP
 */
export function verifyOTP(inputOTP: string, expectedOTP: string): boolean {
  return inputOTP === expectedOTP;
}

/**
 * Create anonymous job post ID for employers
 */
export function generateAnonymousJobId(): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 9);
  return `JOB_${timestamp}_${randomSuffix}`;
}

/**
 * Create anonymous application ID for labour
 */
export function generateAnonymousApplicationId(): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 9);
  return `APP_${timestamp}_${randomSuffix}`;
}

/**
 * Hash sensitive data for storage
 */
export function hashData(data: string): string {
  // Simple hash function - in production, use a proper hashing library
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate secure token for API calls
 */
export async function generateSecureToken(
  universalId: string,
): Promise<string> {
  const deviceId = await generateDeviceId();
  const timestamp = Date.now();
  const randomData = Math.random().toString(36).substr(2, 9);

  const tokenData = `${universalId}:${deviceId}:${timestamp}:${randomData}`;
  return hashData(tokenData);
}
