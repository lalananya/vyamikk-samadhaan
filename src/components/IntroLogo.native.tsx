import React, { useEffect } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  interpolate,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Path,
  Circle,
  Ellipse,
  G,
  Filter,
  FeGaussianBlur,
  FeMerge,
  FeMergeNode,
} from "react-native-svg";
import { brand } from "../theme/brand";

export type IntroLogoProps = {
  autoplay?: boolean;
  durationMs?: number;
  reducedMotion?: boolean;
  onDone?: () => void;
  size?: number | string;
};

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

export default function IntroLogo({
  autoplay = true,
  durationMs = 3000,
  reducedMotion,
  onDone,
  size = 280,
}: IntroLogoProps) {
  const [isReducedMotion, setIsReducedMotion] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    if (reducedMotion !== undefined) {
      setIsReducedMotion(reducedMotion);
      return;
    }

    if (Platform.OS === "web") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setIsReducedMotion(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      AccessibilityInfo.isReduceMotionEnabled?.().then(setIsReducedMotion);
    }
  }, [reducedMotion]);

  // Animation values
  const rotation1 = useSharedValue(0);
  const rotation2 = useSharedValue(0);
  const rotation3 = useSharedValue(0);
  const convergence1 = useSharedValue(0);
  const convergence2 = useSharedValue(0);
  const convergence3 = useSharedValue(0);
  const completion1 = useSharedValue(0);
  const completion2 = useSharedValue(0);
  const completion3 = useSharedValue(0);
  const networkPulse = useSharedValue(0);
  const successGlow = useSharedValue(0);
  const containerOpacity = useSharedValue(0);

  // Start animations
  useEffect(() => {
    if (!autoplay) return;

    if (isReducedMotion) {
      // Simple fade in for reduced motion
      containerOpacity.value = withTiming(1, { duration: 500 });
      setTimeout(() => {
        setIsComplete(true);
        onDone?.();
      }, durationMs);
      return;
    }

    // Fade in container
    containerOpacity.value = withTiming(1, { duration: 300 });

    // Orbital rotations
    rotation1.value = withRepeat(
      withTiming(360, { duration: 30000, easing: Easing.linear }),
      -1,
    );
    rotation2.value = withRepeat(
      withTiming(-360, { duration: 22000, easing: Easing.linear }),
      -1,
    );
    rotation3.value = withRepeat(
      withTiming(360, { duration: 35000, easing: Easing.linear }),
      -1,
    );

    // Convergence animations
    convergence1.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
      -1,
    );
    convergence2.value = withDelay(
      1500,
      withRepeat(
        withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
        -1,
      ),
    );
    convergence3.value = withDelay(
      3000,
      withRepeat(
        withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
        -1,
      ),
    );

    // Completion rings
    completion1.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.out(Easing.ease) }),
      -1,
    );
    completion2.value = withDelay(
      1000,
      withRepeat(
        withTiming(1, { duration: 4000, easing: Easing.out(Easing.ease) }),
        -1,
      ),
    );
    completion3.value = withDelay(
      2000,
      withRepeat(
        withTiming(1, { duration: 4000, easing: Easing.out(Easing.ease) }),
        -1,
      ),
    );

    // Network pulse
    networkPulse.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
    );

    // Success glow
    successGlow.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
    );

    // Complete animation after duration
    setTimeout(() => {
      setIsComplete(true);
      onDone?.();
    }, durationMs);
  }, [autoplay, durationMs, isReducedMotion, onDone]);

  // Animated styles
  const orbital1Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation1.value}deg` }],
  }));

  const orbital2Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation2.value}deg` }],
  }));

  const orbital3Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation3.value}deg` }],
  }));

  const convergence1Style = useAnimatedStyle(() => {
    const scale = interpolate(convergence1.value, [0, 0.5, 1], [1.2, 0.8, 1.2]);
    const opacity = interpolate(convergence1.value, [0, 0.5, 1], [0.4, 1, 0.4]);
    const rotate = interpolate(convergence1.value, [0, 1], [0, 360]);
    return {
      transform: [{ scale }, { rotate: `${rotate}deg` }],
      opacity,
    };
  });

  const convergence2Style = useAnimatedStyle(() => {
    const scale = interpolate(convergence2.value, [0, 0.5, 1], [1.2, 0.8, 1.2]);
    const opacity = interpolate(convergence2.value, [0, 0.5, 1], [0.4, 1, 0.4]);
    const rotate = interpolate(convergence2.value, [0, 1], [0, 360]);
    return {
      transform: [{ scale }, { rotate: `${rotate}deg` }],
      opacity,
    };
  });

  const convergence3Style = useAnimatedStyle(() => {
    const scale = interpolate(convergence3.value, [0, 0.5, 1], [1.2, 0.8, 1.2]);
    const opacity = interpolate(convergence3.value, [0, 0.5, 1], [0.4, 1, 0.4]);
    const rotate = interpolate(convergence3.value, [0, 1], [0, 360]);
    return {
      transform: [{ scale }, { rotate: `${rotate}deg` }],
      opacity,
    };
  });

  const completion1Style = useAnimatedStyle(() => {
    const scale = interpolate(completion1.value, [0, 0.7, 1], [0.5, 1.1, 1.5]);
    const opacity = interpolate(completion1.value, [0, 0.7, 1], [1, 0.8, 0]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const completion2Style = useAnimatedStyle(() => {
    const scale = interpolate(completion2.value, [0, 0.7, 1], [0.5, 1.1, 1.5]);
    const opacity = interpolate(completion2.value, [0, 0.7, 1], [1, 0.8, 0]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const completion3Style = useAnimatedStyle(() => {
    const scale = interpolate(completion3.value, [0, 0.7, 1], [0.5, 1.1, 1.5]);
    const opacity = interpolate(completion3.value, [0, 0.7, 1], [1, 0.8, 0]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const networkPulseStyle = useAnimatedStyle(() => {
    const scale = interpolate(networkPulse.value, [0, 0.5, 1], [1, 1.3, 1]);
    const opacity = interpolate(networkPulse.value, [0, 0.5, 1], [0.5, 1, 0.5]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const successGlowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(successGlow.value, [0, 0.5, 1], [0.6, 1, 0.6]);
    const brightness = interpolate(successGlow.value, [0, 0.5, 1], [1, 1.8, 1]);
    return {
      opacity,
      // Note: brightness filter not available in RN, using opacity as approximation
    };
  });

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  // Network nodes with staggered pulse
  const createNetworkNodeStyle = (delay: number) => {
    return useAnimatedStyle(() => {
      const adjustedValue = (networkPulse.value + delay) % 1;
      const scale = interpolate(adjustedValue, [0, 0.5, 1], [1, 1.3, 1]);
      const opacity = interpolate(adjustedValue, [0, 0.5, 1], [0.5, 1, 0.5]);
      return {
        transform: [{ scale }],
        opacity,
      };
    });
  };

  const node1Style = createNetworkNodeStyle(0);
  const node2Style = createNetworkNodeStyle(0.8);
  const node3Style = createNetworkNodeStyle(1.6);

  return (
    <AnimatedSvg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      style={containerStyle}
    >
      <Defs>
        <LinearGradient id="premiumMetal" x1="0%" y1="0%" x2="100%" y2="100%">
          {brand.platinumStops.map((color, index) => (
            <Stop key={index} offset={`${index * 20}%`} stopColor={color} />
          ))}
        </LinearGradient>

        <RadialGradient id="platinumNode" cx="30%" cy="30%" r="70%">
          <Stop offset="0%" stopColor="#fff" />
          <Stop offset="40%" stopColor="#f8f9fa" />
          <Stop offset="70%" stopColor="#e3e3e3" />
          <Stop offset="100%" stopColor="#c0c0c0" />
        </RadialGradient>

        <RadialGradient id="completionGradient" cx="50%" cy="30%" r="80%">
          {brand.completionStops.map((color, index) => (
            <Stop key={index} offset={`${index * 33.33}%`} stopColor={color} />
          ))}
        </RadialGradient>

        <LinearGradient id="networkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          {brand.networkStops.map((color, index) => (
            <Stop
              key={index}
              offset={`${index * 33.33}%`}
              stopColor={color}
              stopOpacity={index === 0 ? 0.3 : index === 3 ? 0.6 : 1}
            />
          ))}
        </LinearGradient>

        <LinearGradient
          id="convergenceGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <Stop offset="0%" stopColor="#d0d0d0" stopOpacity={0.4} />
          <Stop offset="50%" stopColor="#ffffff" stopOpacity={1} />
          <Stop offset="100%" stopColor="#e0f2e0" stopOpacity={0.8} />
        </LinearGradient>

        <Filter id="premiumGlow">
          <FeGaussianBlur stdDeviation="3" result="b" />
          <FeMerge>
            <FeMergeNode in="b" />
            <FeMergeNode in="SourceGraphic" />
          </FeMerge>
        </Filter>

        <Filter id="completionGlow">
          <FeGaussianBlur stdDeviation="4" result="b" />
          <FeMerge>
            <FeMergeNode in="b" />
            <FeMergeNode in="SourceGraphic" />
          </FeMerge>
        </Filter>
      </Defs>

      {/* Completion rings */}
      <G style={completion1Style}>
        <Circle
          cx="200"
          cy="200"
          r="60"
          fill="none"
          stroke="url(#completionGradient)"
          strokeWidth="2"
          opacity={0.7}
        />
      </G>
      <G style={completion2Style}>
        <Circle
          cx="200"
          cy="200"
          r="80"
          fill="none"
          stroke="url(#completionGradient)"
          strokeWidth="1.5"
          opacity={0.5}
        />
      </G>
      <G style={completion3Style}>
        <Circle
          cx="200"
          cy="200"
          r="100"
          fill="none"
          stroke="url(#completionGradient)"
          strokeWidth="1"
          opacity={0.3}
        />
      </G>

      {/* Convergence groups */}
      <G style={convergence1Style}>
        <Path
          d="M 50 100 Q 150 150 200 200"
          fill="none"
          stroke="url(#convergenceGradient)"
          strokeWidth="2"
          opacity={0.6}
        />
        <Path
          d="M 350 100 Q 250 150 200 200"
          fill="none"
          stroke="url(#convergenceGradient)"
          strokeWidth="2"
          opacity={0.6}
        />
        <Path
          d="M 50 300 Q 150 250 200 200"
          fill="none"
          stroke="url(#convergenceGradient)"
          strokeWidth="2"
          opacity={0.6}
        />
        <Path
          d="M 350 300 Q 250 250 200 200"
          fill="none"
          stroke="url(#convergenceGradient)"
          strokeWidth="2"
          opacity={0.6}
        />
      </G>

      <G style={convergence2Style}>
        <Path
          d="M 100 50 Q 150 125 200 200"
          fill="none"
          stroke="url(#convergenceGradient)"
          strokeWidth="1.5"
          opacity={0.5}
        />
        <Path
          d="M 300 50 Q 250 125 200 200"
          fill="none"
          stroke="url(#convergenceGradient)"
          strokeWidth="1.5"
          opacity={0.5}
        />
        <Path
          d="M 100 350 Q 150 275 200 200"
          fill="none"
          stroke="url(#convergenceGradient)"
          strokeWidth="1.5"
          opacity={0.5}
        />
        <Path
          d="M 300 350 Q 250 275 200 200"
          fill="none"
          stroke="url(#convergenceGradient)"
          strokeWidth="1.5"
          opacity={0.5}
        />
      </G>

      <G style={convergence3Style}>
        <Path
          d="M 150 80 Q 175 140 200 200"
          fill="none"
          stroke="url(#convergenceGradient)"
          strokeWidth="1"
          opacity={0.4}
        />
        <Path
          d="M 250 80 Q 225 140 200 200"
          fill="none"
          stroke="url(#convergenceGradient)"
          strokeWidth="1"
          opacity={0.4}
        />
        <Path
          d="M 150 320 Q 175 260 200 200"
          fill="none"
          stroke="url(#convergenceGradient)"
          strokeWidth="1"
          opacity={0.4}
        />
        <Path
          d="M 250 320 Q 225 260 200 200"
          fill="none"
          stroke="url(#convergenceGradient)"
          strokeWidth="1"
          opacity={0.4}
        />
      </G>

      {/* Orbital rings */}
      <G style={orbital1Style}>
        <Ellipse
          cx="200"
          cy="200"
          rx="170"
          ry="85"
          fill="none"
          stroke="url(#networkGradient)"
          strokeWidth="1"
          opacity={0.6}
        />
        <Circle
          cx="370"
          cy="200"
          r="3.5"
          fill="url(#platinumNode)"
          style={node1Style}
        />
        <Circle
          cx="315"
          cy="145"
          r="2.5"
          fill="url(#platinumNode)"
          style={node2Style}
        />
        <Circle
          cx="275"
          cy="125"
          r="2"
          fill="url(#platinumNode)"
          style={node3Style}
        />
        <Circle
          cx="125"
          cy="125"
          r="2"
          fill="url(#platinumNode)"
          style={node1Style}
        />
        <Circle
          cx="85"
          cy="145"
          r="2.5"
          fill="url(#platinumNode)"
          style={node2Style}
        />
        <Circle
          cx="30"
          cy="200"
          r="3.5"
          fill="url(#platinumNode)"
          style={node3Style}
        />
        <Circle
          cx="85"
          cy="255"
          r="2.5"
          fill="url(#platinumNode)"
          style={node1Style}
        />
        <Circle
          cx="125"
          cy="275"
          r="2"
          fill="url(#platinumNode)"
          style={node2Style}
        />
        <Circle
          cx="275"
          cy="275"
          r="2"
          fill="url(#platinumNode)"
          style={node3Style}
        />
        <Circle
          cx="315"
          cy="255"
          r="2.5"
          fill="url(#platinumNode)"
          style={node1Style}
        />
      </G>

      <G style={orbital2Style}>
        <Ellipse
          cx="200"
          cy="200"
          rx="130"
          ry="65"
          fill="none"
          stroke="url(#networkGradient)"
          strokeWidth="1"
          opacity={0.7}
        />
        <Circle
          cx="330"
          cy="200"
          r="3"
          fill="url(#platinumNode)"
          style={node2Style}
        />
        <Circle
          cx="285"
          cy="160"
          r="2"
          fill="url(#platinumNode)"
          style={node3Style}
        />
        <Circle
          cx="245"
          cy="145"
          r="1.5"
          fill="url(#platinumNode)"
          style={node1Style}
        />
        <Circle
          cx="155"
          cy="145"
          r="1.5"
          fill="url(#platinumNode)"
          style={node2Style}
        />
        <Circle
          cx="115"
          cy="160"
          r="2"
          fill="url(#platinumNode)"
          style={node3Style}
        />
        <Circle
          cx="70"
          cy="200"
          r="3"
          fill="url(#platinumNode)"
          style={node1Style}
        />
        <Circle
          cx="115"
          cy="240"
          r="2"
          fill="url(#platinumNode)"
          style={node2Style}
        />
        <Circle
          cx="155"
          cy="255"
          r="1.5"
          fill="url(#platinumNode)"
          style={node3Style}
        />
        <Circle
          cx="245"
          cy="255"
          r="1.5"
          fill="url(#platinumNode)"
          style={node1Style}
        />
        <Circle
          cx="285"
          cy="240"
          r="2"
          fill="url(#platinumNode)"
          style={node2Style}
        />
      </G>

      <G style={orbital3Style}>
        <Ellipse
          cx="200"
          cy="200"
          rx="90"
          ry="45"
          fill="none"
          stroke="url(#networkGradient)"
          strokeWidth="1"
          opacity={0.8}
        />
        <Circle
          cx="290"
          cy="200"
          r="2.5"
          fill="url(#platinumNode)"
          style={node3Style}
        />
        <Circle
          cx="265"
          cy="180"
          r="1.5"
          fill="url(#platinumNode)"
          style={node1Style}
        />
        <Circle
          cx="225"
          cy="165"
          r="1"
          fill="url(#platinumNode)"
          style={node2Style}
        />
        <Circle
          cx="175"
          cy="165"
          r="1"
          fill="url(#platinumNode)"
          style={node3Style}
        />
        <Circle
          cx="135"
          cy="180"
          r="1.5"
          fill="url(#platinumNode)"
          style={node1Style}
        />
        <Circle
          cx="110"
          cy="200"
          r="2.5"
          fill="url(#platinumNode)"
          style={node2Style}
        />
        <Circle
          cx="135"
          cy="220"
          r="1.5"
          fill="url(#platinumNode)"
          style={node3Style}
        />
        <Circle
          cx="175"
          cy="235"
          r="1"
          fill="url(#platinumNode)"
          style={node1Style}
        />
        <Circle
          cx="225"
          cy="235"
          r="1"
          fill="url(#platinumNode)"
          style={node2Style}
        />
        <Circle
          cx="265"
          cy="220"
          r="1.5"
          fill="url(#platinumNode)"
          style={node3Style}
        />
      </G>

      {/* Main logo - "A" shape */}
      <G filter="url(#premiumGlow)">
        <Path
          d="M 165 320 L 200 125 L 208 125 L 178 320 Z"
          fill="url(#premiumMetal)"
          stroke="#fff"
          strokeWidth="0.5"
          opacity={0.96}
        />
        <Path
          d="M 192 125 L 200 125 L 235 320 L 222 320 Z"
          fill="url(#premiumMetal)"
          stroke="#fff"
          strokeWidth="0.5"
          opacity={0.96}
        />
        <Path
          d="M 178 215 L 222 215 L 219 230 L 181 230 Z"
          fill="url(#premiumMetal)"
          stroke="#fff"
          strokeWidth="0.5"
          opacity={0.96}
        />
      </G>

      {/* Success indicators */}
      <G style={successGlowStyle}>
        <Circle
          cx="200"
          cy="222"
          r="5"
          fill="url(#completionGradient)"
          opacity={0.9}
          filter="url(#completionGlow)"
        />
        <Circle
          cx="185"
          cy="222"
          r="2.5"
          fill="url(#completionGradient)"
          opacity={0.7}
        />
        <Circle
          cx="215"
          cy="222"
          r="2.5"
          fill="url(#completionGradient)"
          opacity={0.7}
        />
        <Path
          d="M 178 215 L 222 215 L 219 230 L 181 230 Z"
          fill="url(#completionGradient)"
          opacity={0.4}
          filter="url(#completionGlow)"
        />
      </G>
    </AnimatedSvg>
  );
}
