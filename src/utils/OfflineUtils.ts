import { Alert } from 'react-native';
import { ApiError } from '../api/http';

export const isOfflineError = (error: any): boolean => {
    return error?.code === 'OFFLINE' ||
        error?.code === 'NETWORK_ERROR' ||
        error?.message?.includes('No internet connection');
};

export const isTimeoutError = (error: any): boolean => {
    return error?.code === 'TIMEOUT' ||
        error?.message?.includes('timed out');
};

export const getOfflineErrorMessage = (error: any): string => {
    if (isOfflineError(error)) {
        return 'No internet connection. Please check your network and try again.';
    }

    if (isTimeoutError(error)) {
        return 'Request timed out. Please check your connection and try again.';
    }

    return error?.message || 'An unexpected error occurred.';
};

export const showOfflineAlert = (error: any, onRetry?: () => void) => {
    const message = getOfflineErrorMessage(error);

    Alert.alert(
        'Connection Error',
        message,
        [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            ...(onRetry ? [{
                text: 'Retry',
                onPress: onRetry,
            }] : []),
        ]
    );
};

export const handleOfflineError = (error: any, onRetry?: () => void) => {
    if (isOfflineError(error) || isTimeoutError(error)) {
        showOfflineAlert(error, onRetry);
        return true;
    }
    return false;
};

