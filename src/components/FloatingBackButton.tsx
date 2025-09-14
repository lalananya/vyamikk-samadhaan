import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { appState } from '../state/AppState';

interface FloatingBackButtonProps {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    onPress?: () => void;
    showLabel?: boolean;
    autoHide?: boolean;
    hideDelay?: number;
}

export const FloatingBackButton: React.FC<FloatingBackButtonProps> = ({
    position = 'top-left',
    onPress,
    showLabel = true,
    autoHide = false,
    hideDelay = 3000
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [fadeAnim] = useState(new Animated.Value(0));
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // Check authentication state
        const checkAuth = () => {
            const user = appState.getUser();
            const authenticated = !!user;
            setIsAuthenticated(authenticated);

            if (authenticated) {
                setIsVisible(true);
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            } else {
                setIsVisible(false);
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            }
        };

        // Initial check
        checkAuth();

        // Listen for auth state changes
        const unsubscribe = appState.subscribe((state) => {
            checkAuth();
        });

        return unsubscribe;
    }, [fadeAnim]);

    useEffect(() => {
        if (autoHide && isAuthenticated) {
            const timer = setTimeout(() => {
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }).start(() => setIsVisible(false));
            }, hideDelay);

            return () => clearTimeout(timer);
        }
    }, [autoHide, hideDelay, fadeAnim, isAuthenticated]);

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else {
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace('/dashboard');
            }
        }
    };

    if (!isVisible || !isAuthenticated) return null;

    const getPositionStyle = () => {
        switch (position) {
            case 'top-left':
                return { top: 60, left: 16 };
            case 'top-right':
                return { top: 60, right: 16 };
            case 'bottom-left':
                return { bottom: 100, left: 16 };
            case 'bottom-right':
                return { bottom: 100, right: 16 };
            default:
                return { top: 60, left: 16 };
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                getPositionStyle(),
                { opacity: fadeAnim }
            ]}
        >
            <TouchableOpacity
                style={styles.button}
                onPress={handlePress}
                activeOpacity={0.8}
            >
                <Ionicons name="arrow-back" size={24} color="#ffffff" />
                {showLabel && (
                    <Text style={styles.label}>Back</Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        zIndex: 9999,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    label: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 6,
    },
});

export default FloatingBackButton;
