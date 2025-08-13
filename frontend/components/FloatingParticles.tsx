import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

const FloatingParticles: React.FC = () => {
  const particles: Particle[] = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 3000 + 2000,
    delay: Math.random() * 2000,
  }));

  const particleAnimations = particles.map(() => ({
    translateY: useSharedValue(0),
    opacity: useSharedValue(0.3),
  }));

  useEffect(() => {
    particleAnimations.forEach((anim, index) => {
      const particle = particles[index];

      // Start with delay
      setTimeout(() => {
        anim.translateY.value = withRepeat(
          withTiming(-100, {
            duration: particle.duration,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true
        );

        anim.opacity.value = withRepeat(
          withTiming(0.8, {
            duration: particle.duration / 2,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true
        );
      }, particle.delay);
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map((particle, index) => {
        const anim = particleAnimations[index];

        const animatedStyle = useAnimatedStyle(() => ({
          transform: [{ translateY: anim.translateY.value }],
          opacity: anim.opacity.value,
        }));

        return (
          <Animated.View
            key={particle.id}
            style={[
              styles.particle,
              {
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: particle.size,
                height: particle.size,
              },
              animatedStyle,
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    backgroundColor: "rgba(222, 212, 247, 0.4)",
    borderRadius: 50,
    shadowColor: "#8663DF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
});

export default FloatingParticles;
