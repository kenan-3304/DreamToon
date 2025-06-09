// components/Waveform.tsx
import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Path, G } from "react-native-svg";
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedProps,
} from "react-native-reanimated";

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function Waveform({
  width = 140,
  height = 24,
  stroke = "#8A46FF80",
  strokeWidth = 2,
}: {
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
}) {
  const offset = useSharedValue(0);

  // loop translateX from 0 → -70 → 0
  useEffect(() => {
    offset.value = withRepeat(
      withTiming(-width / 2, { duration: 2000 }),
      -1,
      true
    );
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    transform: [
      {
        translateX: offset.value,
      },
    ],
  }));

  // A simple sine-like wave path tiled twice
  const wavePath = `
    M0 ${height / 2}
    q ${width / 8} ${-height / 2} ${width / 4} 0
    t ${width / 4} 0
    t ${width / 4} 0
    t ${width / 4} 0
  `;

  return (
    <View style={{ width, height, overflow: "hidden" }}>
      <Svg width={width * 2} height={height}>
        <G>
          <AnimatedPath
            d={wavePath}
            stroke={stroke}
            strokeWidth={strokeWidth}
            fill="none"
            animatedProps={animatedProps}
          />
        </G>
      </Svg>
    </View>
  );
}
