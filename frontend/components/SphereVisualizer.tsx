import React from "react";
import { StyleSheet, Dimensions, View } from "react-native";
import { Canvas, Circle } from "@shopify/react-native-skia";
import Animated, {
  useSharedValue,
  useFrameCallback,
  SharedValue,
  interpolateColor,
  interpolate,
  useDerivedValue,
} from "react-native-reanimated";
import { memo } from "react";

// --- Constants ---
const { width, height } = Dimensions.get("window");
const numDots = 250;
const radius = 100;
const rotationSpeed = 0.4;

// --- Colors ---
const COLOR_BASE = "#8663DF";
const COLOR_HOT = "#D0BFFF";
const COLOR_PEAK = "#FFFFFF";

// --- Types ---
interface Point3D {
  x: number;
  y: number;
  z: number;
}
interface DotData {
  start: Point3D;
  end: Point3D;
}

interface DottedSphereProps {
  level?: SharedValue<number>;
  centerX: number;
  centerY: number;
  morphProgress: SharedValue<number>;
}

// separate Dot component that calculates its own properties.
interface DotProps {
  dotData: DotData;
  rotationY: SharedValue<number>;
  level: SharedValue<number>;
  centerX: number;
  centerY: number;
  morphProgress: SharedValue<number>;
}

// --- Pre-calculate static start and end points ---
const dots: DotData[] = [];
//irrational angle based on golden ratio
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
for (let i = 0; i < numDots; i++) {
  //finds the vertical position of each dot
  const y3D = 1 - (i / (numDots - 1)) * 2;
  //uses pythagorem theorem to find the horizontal slice at this particular height
  const radiusAtY = Math.sqrt(1 - y3D * y3D);
  const theta3D = goldenAngle * i;
  //standard trig that places dot at edge of the slice
  const x3D = Math.cos(theta3D) * radiusAtY;
  const z3D = Math.sin(theta3D) * radiusAtY;
  dots.push({
    start: { x: 0, y: 0, z: 0 },
    end: { x: x3D * radius, y: y3D * radius, z: z3D * radius },
  });
}

const Dot = memo(
  ({
    dotData,
    rotationY,
    level,
    centerX,
    centerY,
    morphProgress,
  }: DotProps) => {
    // Each dot calculates its own properties on the UI thread.
    const animatedCircleProps = useDerivedValue(() => {
      const progress = morphProgress.value;
      const currentX = interpolate(
        progress,
        [0, 1],
        [dotData.start.x, dotData.end.x]
      );
      const currentY = interpolate(
        progress,
        [0, 1],
        [dotData.start.y, dotData.end.y]
      );
      const currentZ = interpolate(
        progress,
        [0, 1],
        [dotData.start.z, dotData.end.z]
      );

      const rotationAngle = rotationY.value * progress;
      const cosAngle = Math.cos(rotationAngle);
      const sinAngle = Math.sin(rotationAngle);

      const rotatedX = currentX * cosAngle + currentZ * sinAngle;
      const rotatedY = currentY;
      const rotatedZ = -currentX * sinAngle + currentZ * cosAngle;

      const processedLevel = interpolate(level.value, [0, 0.2, 1], [0, 0, 1]);
      const scaleFactor = 1 + processedLevel * 0.55 * progress;
      const finalX = rotatedX * scaleFactor;
      const finalY = rotatedY * scaleFactor;
      const finalZ = rotatedZ * scaleFactor;

      const visualRadius = radius * progress * scaleFactor;
      const scale = (finalZ + visualRadius) / (2 * visualRadius || 1);
      const dotSize = (0.5 + scale * 3) * progress;
      const opacity =
        interpolate(progress, [0, 0.5, 1], [0, 0, 1]) *
        interpolate(scale, [0, 1], [0.3, 1]);

      const animatedColor = interpolateColor(
        processedLevel * progress,
        [0, 0.5, 1],
        [COLOR_BASE, COLOR_HOT, COLOR_PEAK]
      );

      return {
        cx: finalX + centerX,
        cy: finalY + centerY,
        r: dotSize,
        color: animatedColor,
        opacity: opacity,
      };
    });

    // Skia's <Circle> can take a derived value for each of its props.
    return (
      <Circle
        cx={useDerivedValue(() => animatedCircleProps.value.cx)}
        cy={useDerivedValue(() => animatedCircleProps.value.cy)}
        r={useDerivedValue(() => animatedCircleProps.value.r)}
        color={useDerivedValue(() => animatedCircleProps.value.color)}
        opacity={useDerivedValue(() => animatedCircleProps.value.opacity)}
      />
    );
  }
);

const DottedSphere = ({
  level,
  centerX,
  centerY,
  morphProgress,
}: DottedSphereProps) => {
  const rotationY = useSharedValue(0);
  const defaultLevel = useSharedValue(0);
  const currentLevel = level || defaultLevel;

  useFrameCallback((frameInfo) => {
    if (!frameInfo.timeSincePreviousFrame) return;
    const deltaTime = frameInfo.timeSincePreviousFrame / 1000;
    rotationY.value += rotationSpeed * deltaTime;
  });

  return (
    <Canvas style={styles.canvas}>
      {/* We now map to our new, intelligent <Dot> component */}
      {dots.map((dot, index) => (
        <Dot
          key={index}
          dotData={dot}
          rotationY={rotationY}
          level={currentLevel}
          centerX={centerX}
          centerY={centerY}
          morphProgress={morphProgress}
        />
      ))}
    </Canvas>
  );
};

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "none",
  },
});

export default memo(DottedSphere);
