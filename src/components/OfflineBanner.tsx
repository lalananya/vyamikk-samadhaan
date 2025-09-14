import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { router } from 'expo-router';

interface OfflineBannerProps {
    onRetry?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ onRetry }) => {
    const [isOffline, setIsOffline] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const [bannerHeight] = useState(new Animated.Value(0));

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const offline = !state.isConnected;
            setIsOffline(offline);

            // Animate banner in/out
            Animated.timing(bannerHeight, {
                toValue: offline ? 1 : 0,
                duration: 300,
                useNativeDriver: false,
            }).start();
        });

        return unsubscribe;
    }, [bannerHeight]);

    const handleRetry = async () => {
        if (isRetrying) return;

        setIsRetrying(true);

        try {
            // Check network status
            const netInfo = await NetInfo.fetch();
            if (netInfo.isConnected) {
                // Call custom retry handler if provided
                if (onRetry) {
                    await onRetry();
                } else {
                    // Default retry: reload the current route
                    router.replace(router.pathname);
                }
            }
        } catch (error) {
            console.warn('Retry failed:', error);
        } finally {
            setIsRetrying(false);
        }
    };

    if (!isOffline) return null;

    return (
        <Animated.View
            style={[
                styles.banner,
                {
                    height: bannerHeight.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 50],
                    }),
                }
            ]}
        >
            <View style={styles.content}>
                <View style={styles.textContainer}>
                    <Text style={styles.icon}>📡</Text>
                    <Text style={styles.text}>No internet connection</Text>
                </View>

                <TouchableOpacity
                    style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
                    onPress={handleRetry}
                    disabled={isRetrying}
                >
                    <Text style={styles.retryText}>
                        {isRetrying ? 'Retrying...' : 'Retry'}
                    </Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    banner: {
        backgroundColor: '#ff6b6b',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        overflow: 'hidden',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        height: 50,
    },
    textContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    icon: {
        fontSize: 16,
        marginRight: 8,
    },
    text: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    retryButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        marginLeft: 12,
    },
    retryButtonDisabled: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    retryText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
});

export default OfflineBanner;

