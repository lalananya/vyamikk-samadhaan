/**
 * Environment configuration
 * Centralized API_BASE resolution with LAN IP fallback
 */
import Constants from 'expo-constants';

function getApiBase(): string {
    // Try to get from expo config first
    const configApiBase = Constants.expoConfig?.extra?.API_BASE;
    if (configApiBase) {
        return configApiBase;
    }

    // Try to derive from manifest
    const manifest = Constants.manifest2 || Constants.manifest;
    if (manifest?.extra?.devClientIp) {
        return `http://${manifest.extra.devClientIp}:4001/api/v1`;
    }

    // Try to derive from hostUri
    if (manifest?.hostUri) {
        const hostUri = manifest.hostUri;
        const match = hostUri.match(/(\d+\.\d+\.\d+\.\d+):\d+/);
        if (match) {
            return `http://${match[1]}:4001/api/v1`;
        }
    }

    // Fallback to hardcoded LAN IP
    return 'http://192.168.29.242:4001/api/v1';
}

export const API_BASE = getApiBase();

// Development logging
if (__DEV__) {
    console.log(`🔧 API_BASE resolved to: ${API_BASE}`);
    console.log(`🔧 Constants.executionEnvironment: ${Constants.executionEnvironment}`);
    console.log(`🔧 Constants.appOwnership: ${Constants.appOwnership}`);
}
