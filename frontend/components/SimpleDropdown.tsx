import React from "react";
import { View, Pressable, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SimpleDropdownProps {
  selected: string | number;
  onSelect: (value: string | number) => void;
  items: (string | number)[];
  placeholder: string;
  field: string;
  activeDropdown: string | null;
  setActiveDropdown: (v: string | null) => void;
  style?: { height?: number; [key: string]: any };
}

const SimpleDropdown: React.FC<SimpleDropdownProps> = ({
  selected,
  onSelect,
  items,
  placeholder,
  field,
  activeDropdown,
  setActiveDropdown,
  style,
}) => {
  const resolvedHeight = style?.height ?? 40;

  return (
    <View style={{ minWidth: 120, ...style }}>
      <Pressable
        style={({ pressed }) => [
          {
            borderWidth: 1,
            borderColor: "rgba(224,176,255,0.3)",
            borderRadius: 16,
            backgroundColor: "rgba(224,176,255,0.1)",
            height: resolvedHeight,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
          },
          pressed && {
            backgroundColor: "rgba(224,176,255,0.2)",
            transform: [{ scale: 0.98 }],
          },
        ]}
        onPress={() =>
          setActiveDropdown(activeDropdown === field ? null : field)
        }
      >
        <Text
          style={{
            color: selected ? "#E0B0FF" : "rgba(224,176,255,0.7)",
            fontSize: 14,
            fontWeight: "600",
            flex: 1,
          }}
        >
          {selected || placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={16}
          color="#E0B0FF"
          style={{
            transform: [
              { rotate: activeDropdown === field ? "180deg" : "0deg" },
            ],
          }}
        />
      </Pressable>
      {activeDropdown === field && (
        <View
          style={{
            position: "absolute",
            top: resolvedHeight + 4,
            left: 0,
            right: 0,
            backgroundColor: "rgba(43,34,58,0.95)",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(224,176,255,0.3)",
            zIndex: 1000,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 10,
            overflow: "hidden",
            padding: 4,
          }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 200 }}
          >
            {items.map((item) => (
              <Pressable
                key={item}
                style={({ pressed }) => [
                  {
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 2,
                    justifyContent: "center",
                    minHeight: 32,
                  },
                  pressed && {
                    backgroundColor: "rgba(224,176,255,0.2)",
                  },
                  selected === item && {
                    backgroundColor: "rgba(224,176,255,0.15)",
                    borderWidth: 1,
                    borderColor: "rgba(224,176,255,0.4)",
                  },
                ]}
                onPress={() => {
                  onSelect(item);
                  setActiveDropdown(null);
                }}
              >
                <Text
                  style={{
                    color: selected === item ? "#E0B0FF" : "#FFFFFF",
                    fontSize: 14,
                    fontWeight: selected === item ? "700" : "500",
                    textAlign: "center",
                  }}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default SimpleDropdown;
