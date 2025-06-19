import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import {
  Settings as SettingsIcon,
  User,
  Edit3,
  Phone,
  Shield,
  HelpCircle,
  Star,
  Mail,
  LogOut,
  X,
} from "lucide-react-native";

/* reusable shiny btn (solid / outline) */
export const NeonButton: React.FC<{
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  outline?: boolean;
}> = ({ children, onPress, style, outline }) => (
  <Pressable onPress={onPress} style={[style, outline && styles.outlineWrap]}>
    {outline ? (
      <View style={[styles.btnInner, styles.outlineInner]}>{children}</View>
    ) : (
      <LinearGradient colors={["#00EAFF", "#FF4EE0"]} style={styles.btnInner}>
        {children}
      </LinearGradient>
    )}
  </Pressable>
);

export default function SettingsScreen() {
  const nav = useNavigation();

  /* handlers */
  const goBack = () => nav.goBack();

  return (
    <LinearGradient
      colors={["#0D0A3C", "rgba(13,10,60,0.8)", "#000"]}
      style={styles.container}
    >
      {/* top */}
      <View style={styles.topRow}>
        <Pressable style={styles.settingsBtn} onPress={goBack}>
          <X size={20} color="#FFF" />
        </Pressable>
      </View>

      {/* profile */}
      <View style={styles.profileRow}>
        <LinearGradient colors={["#00EAFF", "#FF4EE0"]} style={styles.avatar}>
          <User size={38} color="#FFF" />
        </LinearGradient>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.name}>Kenan</Text>
          <Pressable style={styles.editBtn}>
            <Edit3 size={12} color="#a7a7a7" />
            <Text style={styles.editTxt}> Edit Profile</Text>
          </Pressable>
        </View>
      </View>

      {/* phone row */}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTxt}>ACCOUNT</Text>
      </View>
      <View style={styles.listBox}>
        <View style={styles.listItem}>
          <Phone size={18} color="#00EAFF" />
          <Text style={styles.itemLabel}> +1 703‑123‑456</Text>
        </View>
      </View>

      {/* settings list */}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTxt}>SETTINGS</Text>
      </View>
      <View style={styles.listBox}>
        <Pressable style={styles.listItemBetween}>
          <View style={styles.rowCenter}>
            <Shield size={20} color="#00EAFF" />
            <Text style={styles.itemLabel}> Privacy</Text>
          </View>
          <Chevron />
        </Pressable>
        <Pressable style={styles.listItemBetween}>
          <View style={styles.rowCenter}>
            <HelpCircle size={20} color="#00EAFF" />
            <Text style={styles.itemLabel}> Help & FAQ</Text>
          </View>
          <Chevron />
        </Pressable>
        <Pressable style={styles.listItemBetween}>
          <View style={styles.rowCenter}>
            <Star size={20} color="#00EAFF" />
            <Text style={styles.itemLabel}> Rate Dream Toon</Text>
          </View>
          <Chevron />
        </Pressable>
        <Pressable style={styles.listItemBetween}>
          <View style={styles.rowCenter}>
            <Mail size={20} color="#00EAFF" />
            <Text style={styles.itemLabel}> Email Support</Text>
          </View>
          <Chevron />
        </Pressable>
      </View>

      {/* sign‑out */}
      <NeonButton
        outline
        style={{ marginTop: 28, width: "100%" }}
        onPress={() => nav.navigate("Welcome" as never)}
      >
        <View style={styles.rowCenter}>
          <LogOut size={20} color="#FF4EE0" />
          <Text
            style={{
              color: "#FF4EE0",
              fontWeight: "600",
              fontSize: 16,
              marginLeft: 8,
            }}
          >
            Sign Out
          </Text>
        </View>
      </NeonButton>
    </LinearGradient>
  );
}

const Chevron = () => <Text style={{ color: "#a7a7a7" }}>›</Text>;

/* -------------------------------- STYLES ------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 24 },
  topRow: { marginTop: 20, marginBottom: 20 },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  profileRow: { flexDirection: "row", alignItems: "center", marginBottom: 32 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00EAFF",
    shadowOpacity: 0.5,
    shadowRadius: 18,
  },
  name: { color: "#FFF", fontSize: 24, fontWeight: "700" },
  editBtn: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  editTxt: { color: "#a7a7a7", fontSize: 13, marginLeft: 4 },
  sectionHeading: { marginBottom: 10 },
  sectionTxt: {
    color: "#a7a7a7",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.1,
  },
  listBox: {
    backgroundColor: "rgba(0,0,0,0.32)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  listItem: { flexDirection: "row", alignItems: "center", padding: 16 },
  listItemBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  itemLabel: { color: "#FFF", fontSize: 15, fontWeight: "500", marginLeft: 8 },
  rowCenter: { flexDirection: "row", alignItems: "center" },
  btnInner: {
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineWrap: {
    borderWidth: 1,
    borderColor: "rgba(255,78,224,0.4)",
    borderRadius: 18,
  },
  outlineInner: { backgroundColor: "rgba(255,78,224,0.15)" },
});
