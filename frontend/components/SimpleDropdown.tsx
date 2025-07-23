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
  style?: object;
}

const PURPLE = "rgba(177, 63, 179, 0.8)"; // matches selected month
const UNSELECTED_BG = "rgba(0,0,0,0.3)";
const UNSELECTED_BORDER = "rgba(255,255,255,0.1)";

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
  const resolvedHeight = style?.height ?? 30;

  return (
    <View style={{ minWidth: 100, ...style }}>
      <Pressable
        style={({ pressed }) => [
          {
            borderWidth: 1,
            borderColor: UNSELECTED_BORDER,
            borderRadius: 20,
            backgroundColor: UNSELECTED_BG,
            height: resolvedHeight,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 19,
          },
          pressed && { backgroundColor: "rgba(217, 11, 155, 0.2)" },
        ]}
        onPress={() =>
          setActiveDropdown(activeDropdown === field ? null : field)
        }
      >
        <Text
          style={{
            color: selected ? "#FFFFFF" : "rgba(255,255,255,0.6)",
            fontSize: 12,
            fontWeight: "500",
            flex: 1,
          }}
        >
          {selected || placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color={PURPLE}
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
            top: resolvedHeight,
            left: 0,
            right: 0,
            backgroundColor: UNSELECTED_BG,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: UNSELECTED_BORDER,
            zIndex: 1000,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            overflow: "hidden",
            padding: 0,
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
                    paddingVertical: 7,
                    paddingHorizontal: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(255,255,255,0.1)",
                    minHeight: 28,
                    justifyContent: "center",
                  },
                  pressed && { backgroundColor: PURPLE },
                ]}
                onPress={() => {
                  onSelect(item);
                  setActiveDropdown(null);
                }}
              >
                <Text
                  style={{
                    color: selected === item ? PURPLE : "#FFFFFF",
                    fontSize: 12,
                    fontWeight: selected === item ? "600" : "500",
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
