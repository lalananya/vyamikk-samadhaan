import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface AnimatedLogoProps {
    size?: number;
    showAnimation?: boolean;
}

const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
    size = 120,
    showAnimation = true
}) => {
    const glowAnimation = useRef(new Animated.Value(0)).current;
    const orbitAnimation = useRef(new Animated.Value(0)).current;
    const particleAnimation = useRef(new Animated.Value(0)).current;
    const rayAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!showAnimation) return;

        // Glow animation for the crossbar
        const glowLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnimation, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(glowAnimation, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        );

        // Orbit animation for the ellipses
        const orbitLoop = Animated.loop(
            Animated.timing(orbitAnimation, {
                toValue: 1,
                duration: 8000,
                useNativeDriver: true,
            })
        );

        // Particle animation
        const particleLoop = Animated.loop(
            Animated.timing(particleAnimation, {
                toValue: 1,
                duration: 6000,
                useNativeDriver: true,
            })
        );

        // Ray animation
        const rayLoop = Animated.loop(
            Animated.timing(rayAnimation, {
                toValue: 1,
                duration: 4000,
                useNativeDriver: true,
            })
        );

        glowLoop.start();
        orbitLoop.start();
        particleLoop.start();
        rayLoop.start();

        return () => {
            glowLoop.stop();
            orbitLoop.stop();
            particleLoop.stop();
            rayLoop.stop();
        };
    }, [showAnimation]);

    const glowOpacity = glowAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 1],
    });

    const orbitRotation = orbitAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const particleTranslateY = particleAnimation.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, -20, 0],
    });

    const rayScale = rayAnimation.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.8, 1.2, 0.8],
    });

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {/* Background circle */}
            <View style={[styles.backgroundCircle, { width: size, height: size }]} />

            {/* Animated orbits */}
            <Animated.View
                style={[
                    styles.orbitContainer,
                    {
                        width: size,
                        height: size,
                        transform: [{ rotate: orbitRotation }]
                    }
                ]}
            >
                <View style={[styles.orbit, styles.orbit1]} />
                <View style={[styles.orbit, styles.orbit2]} />
                <View style={[styles.orbit, styles.orbit3]} />
            </Animated.View>

            {/* Animated rays */}
            <Animated.View
                style={[
                    styles.rayContainer,
                    {
                        width: size,
                        height: size,
                        transform: [{ scale: rayScale }]
                    }
                ]}
            >
                {Array.from({ length: 12 }).map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.ray,
                            {
                                transform: [{ rotate: `${i * 30}deg` }],
                            },
                        ]}
                    />
                ))}
            </Animated.View>

            {/* Main A letter */}
            <View style={[styles.letterA, { width: size * 0.6, height: size * 0.6 }]}>
                {/* Left diagonal */}
                <View style={[styles.diagonal, styles.leftDiagonal]} />
                {/* Right diagonal */}
                <View style={[styles.diagonal, styles.rightDiagonal]} />
                {/* Crossbar with glow effect */}
                <Animated.View
                    style={[
                        styles.crossbar,
                        {
                            opacity: glowOpacity,
                            shadowColor: '#00ff88',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.8,
                            shadowRadius: 10,
                        }
                    ]}
                />
            </View>

            {/* Animated particles */}
            <Animated.View
                style={[
                    styles.particleContainer,
                    {
                        width: size,
                        height: size,
                        transform: [{ translateY: particleTranslateY }]
                    }
                ]}
            >
                {Array.from({ length: 8 }).map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.particle,
                            {
                                left: Math.random() * size,
                                top: Math.random() * size,
                                opacity: Math.random() * 0.8 + 0.2,
                            },
                        ]}
                    />
                ))}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    backgroundCircle: {
        position: 'absolute',
        borderRadius: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    orbitContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    orbit: {
        position: 'absolute',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 1000,
    },
    orbit1: {
        width: '80%',
        height: '80%',
    },
    orbit2: {
        width: '60%',
        height: '60%',
        transform: [{ rotate: '45deg' }],
    },
    orbit3: {
        width: '40%',
        height: '40%',
        transform: [{ rotate: '-30deg' }],
    },
    rayContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ray: {
        position: 'absolute',
        width: 2,
        height: '30%',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        top: '10%',
    },
    letterA: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    diagonal: {
        position: 'absolute',
        width: 4,
        height: '70%',
        backgroundColor: '#c0c0c0',
        borderRadius: 2,
    },
    leftDiagonal: {
        transform: [{ rotate: '-15deg' }],
        left: '35%',
    },
    rightDiagonal: {
        transform: [{ rotate: '15deg' }],
        right: '35%',
    },
    crossbar: {
        position: 'absolute',
        width: '60%',
        height: 4,
        backgroundColor: '#00ff88',
        borderRadius: 2,
        top: '45%',
        left: '20%',
    },
    particleContainer: {
        position: 'absolute',
    },
    particle: {
        position: 'absolute',
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
});

export default AnimatedLogo;

