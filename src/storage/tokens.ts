/**
 * Token storage utilities
 * Centralized token management with AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';

export async function getToken(): Promise<string | null> {
    try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (__DEV__) {
            console.log(`🔐 Token from storage: ${token ? 'YES' : 'NO'}`);
        }
        return token;
    } catch (error) {
        console.error('❌ Error getting token:', error);
        return null;
    }
}

export async function setToken(token: string): Promise<void> {
    try {
        await AsyncStorage.setItem(TOKEN_KEY, token);
        if (__DEV__) {
            console.log('💾 Token stored successfully');
        }
    } catch (error) {
        console.error('❌ Error storing token:', error);
        throw error;
    }
}

export async function clearToken(): Promise<void> {
    try {
        await AsyncStorage.removeItem(TOKEN_KEY);
        if (__DEV__) {
            console.log('💾 Token cleared');
        }
    } catch (error) {
        console.error('❌ Error clearing token:', error);
        throw error;
    }
}

export async function hasToken(): Promise<boolean> {
    const token = await getToken();
    return !!token;
}

