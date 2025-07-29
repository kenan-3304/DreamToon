import React from "react";
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";

interface SocialLoginButtonProps {
  icon: React.ReactNode;
  text: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const SocialLoginButton: React.FC<SocialLoginButtonProps> = ({
  icon,
  text,
  onPress,
  disabled = false,
  style,
  textStyle,
}) => (
  <Pressable
    style={({ pressed }) => [
      styles.button,
      style,
      pressed && !disabled && { opacity: 0.85 },
      disabled && { opacity: 0.6 },
    ]}
    onPress={onPress}
    disabled={disabled}
  >
    <View style={styles.iconContainer}>{icon}</View>
    <Text style={[styles.text, textStyle]}>{text}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginVertical: 10,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    width: "100%",
    height: 52,
  },
  iconContainer: {
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
  },
  text: {
    color: "#222",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default SocialLoginButton;
