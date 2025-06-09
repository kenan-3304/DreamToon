// components/RecorderCircle.tsx
import React, { useEffect } from "react";
import { Pressable, Text, useToken } from "native-base";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Waveform } from "./Waveform";

export function RecorderCircle({
  isRecording,
  onPressIn,
  onPressOut,
  durationText,
}: {
  isRecording: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  durationText: string;
}) {
  const ringAnim = useSharedValue(0);
  const [purple] = useToken("colors", ["ring.500"]);

  // pulse on record
  useEffect(() => {
    ringAnim.value = withTiming(isRecording ? 1 : 0, { duration: 200 });
  }, [isRecording]);

  const innerStyle = useAnimatedStyle(() => ({
    opacity: ringAnim.value * 0.9 + 0.1,
    transform: [{ scale: ringAnim.value * 0.05 + 1 }],
  }));

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
      <LinearGradient
        // gradient ring container
        colors={["#8A46FF33", "#8A46FF"]}
        start={[0, 0]}
        end={[1, 1]}
        style={{
          width: 192,
          height: 192,
          borderRadius: 96,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.View
          style={[
            {
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: "#1A153A",
              justifyContent: "center",
              alignItems: "center",
            },
            innerStyle,
          ]}
        >
          <MaterialCommunityIcons
            name="microphone-cloud-outline"
            size={64}
            color="#FFFFFF"
          />
        </Animated.View>
      </LinearGradient>

      <Text
        mt={4}
        textAlign="center"
        fontSize="md"
        color="text.500"
        fontWeight={isRecording ? "bold" : "normal"}
      >
        {isRecording ? durationText : "Hold to record your dream"}
      </Text>

      {isRecording && (
        <Waveform width={140} height={24} stroke="#8A46FF80" strokeWidth={2} />
      )}
    </Pressable>
  );
}
