import { useCallback } from 'react';
import { router } from 'expo-router';

interface UseOfflineRetryOptions {
    onRetry?: () => Promise<void> | void;
    fallbackAction?: () => void;
}

export const useOfflineRetry = (options: UseOfflineRetryOptions = {}) => {
    const { onRetry, fallbackAction } = options;

    const handleRetry = useCallback(async () => {
        try {
            if (onRetry) {
                await onRetry();
            } else {
                // Default retry: reload current route
                const currentPath = router.pathname;
                router.replace(currentPath);
            }
        } catch (error) {
            console.warn('Retry failed:', error);

            // Fallback action if retry fails
            if (fallbackAction) {
                fallbackAction();
            }
        }
    }, [onRetry, fallbackAction]);

    return {
        handleRetry,
    };
};

export default useOfflineRetry;

