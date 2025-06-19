import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Switch,
  Linking,
  ScrollView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useUser } from "../../UserContext";
import {
  Settings as Gear,
  User,
  Edit3,
  Phone,
  Shield,
  HelpCircle,
  Star,
  Mail,
  LogOut,
  Home,
  Book,
  ChevronRight,
  X,
} from "lucide-react-native";

/* ─────────────────────────────────────────────
   REUSABLE SHINY BUTTON (solid / outline)
─────────────────────────────────────────────*/
const ShinyButton: React.FC<{
  children: React.ReactNode;
  onPress?: () => void;
  outline?: boolean;
  style?: any;
}> = ({ children, onPress, outline, style }) => (
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

/* ─────────────────────────────────────────────
   MAIN
─────────────────────────────────────────────*/
export default function SettingsScreen() {
  const navigation = useNavigation();
  const { profile, updateProfile } = useUser();

  const [userName, setUserName] = useState(profile?.name ?? "");
  const [userPhone, setUserPhone] = useState(profile?.phone ?? "");

  /* modal states */
  const [editModal, setEditModal] = useState(false);
  const [privacyModal, setPrivacyModal] = useState(false);
  const [helpModal, setHelpModal] = useState(false);
  const [rateModal, setRateModal] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);

  const [editedName, setEditedName] = useState(userName);

  useEffect(() => {
    setUserName(profile?.name ?? "");
    setUserPhone(profile?.phone ?? "");
    setEditedName(profile?.name ?? "");
  }, [profile]);

  /* navigation shortcuts */
  const goHome = () => navigation.navigate("Dashboard" as never);
  const goLibrary = () => navigation.navigate("Timeline" as never);

  /* helpers */
  const saveProfile = async () => {
    await updateProfile({ name: editedName, phone: userPhone });
    setUserName(editedName);
    setEditModal(false);
  };
  const openStore = () => {
    Linking.openURL("https://apps.apple.com/app");
    setRateModal(false);
  };
  const sendMail = () => Linking.openURL("mailto:support@dreamtoon.com");
  const confirmLog = () => {
    navigation.reset({ index: 0, routes: [{ name: "Welcome" as never }] });
  };

  return (
    <LinearGradient
      colors={["#0D0A3C", "rgba(13,10,60,0.8)", "#000"]}
      style={styles.container}
    >
      {/* X BUTTON */}
      <Pressable style={styles.xBtn} onPress={() => navigation.goBack()}>
        <X size={20} color="#FFF" />
      </Pressable>

      {/* PROFILE */}
      <View style={styles.profileRow}>
        <LinearGradient colors={["#00EAFF", "#FF4EE0"]} style={styles.avatar}>
          <User size={38} color="#FFF" />
        </LinearGradient>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.name}>{userName}</Text>
          <Pressable onPress={() => setEditModal(true)} style={styles.editBtn}>
            <Edit3 size={12} color="#a7a7a7" />
            <Text style={styles.editTxt}> Edit Profile</Text>
          </Pressable>
        </View>
      </View>

      {/* PHONE */}
      <Text style={styles.sectionHdr}>ACCOUNT</Text>
      <View style={styles.card}>
        <Phone size={18} color="#00EAFF" />
        <Text style={styles.cardTxt}> {userPhone}</Text>
      </View>

      {/* SETTINGS LIST */}
      <Text style={[styles.sectionHdr, { marginTop: 28 }]}>SETTINGS</Text>
      <View style={styles.listBox}>
        <ListItem
          icon={<Shield size={20} color="#00EAFF" />}
          label="Privacy"
          onPress={() => setPrivacyModal(true)}
        />
        <ListItem
          icon={<HelpCircle size={20} color="#00EAFF" />}
          label="Help & FAQ"
          onPress={() => setHelpModal(true)}
        />
        <ListItem
          icon={<Star size={20} color="#00EAFF" />}
          label="Rate Dream Toon"
          onPress={() => setRateModal(true)}
        />
        <ListItem
          icon={<Mail size={20} color="#00EAFF" />}
          label="Email Support"
          onPress={sendMail}
          divider={false}
        />
      </View>

      {/* LOG-OUT */}
      <ShinyButton
        outline
        style={{ width: "100%", marginTop: 32, marginBottom: 40 }}
        onPress={() => setLogoutModal(true)}
      >
        <View style={styles.rowCenter}>
          <LogOut size={20} color="#FF4EE0" />
          <Text style={styles.logoutTxt}> Sign Out</Text>
        </View>
      </ShinyButton>

      {/* ─────── Modals */}
      <EditProfileModal
        visible={editModal}
        onClose={() => setEditModal(false)}
        name={editedName}
        setName={setEditedName}
        phone={userPhone}
        setPhone={setUserPhone}
        onSave={saveProfile}
      />
      <PrivacyModal
        visible={privacyModal}
        onClose={() => setPrivacyModal(false)}
      />
      <HelpModal visible={helpModal} onClose={() => setHelpModal(false)} />
      <RateModal
        visible={rateModal}
        onClose={() => setRateModal(false)}
        onRate={openStore}
      />
      <LogoutModal
        visible={logoutModal}
        onClose={() => setLogoutModal(false)}
        onConfirm={confirmLog}
      />
    </LinearGradient>
  );
}

/* ─────────────────────────────────────────────
   LIST ITEM helper
─────────────────────────────────────────────*/
const ListItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  divider?: boolean;
}> = ({ icon, label, onPress, divider = true }) => (
  <Pressable
    onPress={onPress}
    style={[styles.itemRow, divider && styles.divider]}
  >
    <View style={styles.rowCenter}>
      {icon}
      <Text style={styles.itemTxt}> {label}</Text>
    </View>
    <ChevronRight size={16} color="#a7a7a7" />
  </Pressable>
);

/* ─────────────────────────────────────────────
   MODAL COMPONENTS (simple)
─────────────────────────────────────────────*/
const ModalWrap: React.FC<{
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}> = ({ visible, onClose, children, title }) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={styles.modalOverlay}>
      <LinearGradient
        colors={["rgba(13,10,60,0.95)", "rgba(0,0,0,0.95)"]}
        style={styles.modalCard}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Pressable onPress={onClose}>
            <X size={22} color="#a7a7a7" />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </LinearGradient>
    </View>
  </Modal>
);

const EditProfileModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  name: string;
  setName: (s: string) => void;
  phone: string;
  setPhone: (p: string) => void;
  onSave: () => void;
}> = ({ visible, onClose, name, setName, phone, setPhone, onSave }) => (
  <ModalWrap visible={visible} onClose={onClose} title="Edit Profile">
    <Text style={styles.fieldLbl}>Name</Text>
    <TextInput
      value={name}
      onChangeText={setName}
      placeholder="Enter name"
      placeholderTextColor="#a7a7a7"
      style={styles.input}
    />
    <Text style={styles.fieldLbl}>Phone</Text>
    <TextInput
      value={phone}
      onChangeText={setPhone}
      placeholder="Enter phone"
      placeholderTextColor="#a7a7a7"
      style={styles.input}
      keyboardType="phone-pad"
    />
    <View style={styles.btnRow}>
      <ShinyButton outline style={{ flex: 1 }} onPress={onClose}>
        <Text style={styles.btnLbl}>Cancel</Text>
      </ShinyButton>
      <ShinyButton style={{ flex: 1 }} onPress={onSave}>
        <Text style={styles.btnLbl}>Save</Text>
      </ShinyButton>
    </View>
  </ModalWrap>
);

const PrivacyModal: React.FC<{ visible: boolean; onClose: () => void }> = ({
  visible,
  onClose,
}) => (
  <ModalWrap visible={visible} onClose={onClose} title="Privacy Settings">
    {[
      "Share Dream Comics",
      "Voice Recording Storage",
      "Analytics & Insights",
    ].map((t, i) => (
      <View key={i} style={styles.toggleRow}>
        <Text style={styles.itemTxt}>{t}</Text>
        <Switch
          value={i !== 2}
          trackColor={{ false: "#555", true: "#00EAFF" }}
          thumbColor="#FFF"
        />
      </View>
    ))}
    <Text style={styles.para}>
      Your dreams are stored securely and never shared without permission.
    </Text>
  </ModalWrap>
);

const HelpModal: React.FC<{ visible: boolean; onClose: () => void }> = ({
  visible,
  onClose,
}) => (
  <ModalWrap visible={visible} onClose={onClose} title="Help & FAQ">
    {helpContent.map((q) => (
      <View key={q.q} style={styles.qaBlock}>
        <Text style={styles.qaQ}>{q.q}</Text>
        <Text style={styles.qaA}>{q.a}</Text>
      </View>
    ))}
  </ModalWrap>
);

const RateModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onRate: () => void;
}> = ({ visible, onClose, onRate }) => (
  <ModalWrap visible={visible} onClose={onClose} title="Rate Dream Toon">
    <View style={styles.starRow}>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={28}
          color="#FFD700"
          fill="#FFD700"
          style={{ marginHorizontal: 4 }}
        />
      ))}
    </View>
    <Text style={styles.para}>
      Love turning your dreams into comics? Let others know by rating us!
    </Text>
    <ShinyButton onPress={onRate}>
      <Text style={styles.btnLbl}>Rate Now</Text>
    </ShinyButton>
  </ModalWrap>
);

const LogoutModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ visible, onClose, onConfirm }) => (
  <ModalWrap visible={visible} onClose={onClose} title="Sign Out?">
    <Text style={styles.para}>
      Are you sure you want to sign out? You\'ll need to sign back in to access
      your dreams.
    </Text>
    <View style={styles.btnRow}>
      <ShinyButton outline style={{ flex: 1 }} onPress={onClose}>
        <Text style={styles.btnLbl}>Cancel</Text>
      </ShinyButton>
      <ShinyButton style={{ flex: 1 }} onPress={onConfirm}>
        <Text style={styles.btnLbl}>Sign Out</Text>
      </ShinyButton>
    </View>
  </ModalWrap>
);

/* simple QA */
const helpContent = [
  {
    q: "How do I record a dream?",
    a: "Tap the glowing cloud button on the home screen, then either speak your dream or type it out.",
  },
  {
    q: "Can I edit my comics?",
    a: "Comics are generated automatically. You can regenerate by providing more details.",
  },
  {
    q: "How long does processing take?",
    a: "Most comics are ready in 30-60 seconds. Complex dreams may take longer.",
  },
  {
    q: "Where are my comics stored?",
    a: "All your comics are saved in the Timeline section.",
  },
];

/* ─────────────────────────────────────────────
   STYLES
─────────────────────────────────────────────*/
const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 100, paddingHorizontal: 24 },
  xBtn: {
    position: "absolute",
    top: 60,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00EAFF",
    shadowOpacity: 0.6,
    shadowRadius: 18,
  },
  name: { color: "#FFF", fontSize: 24, fontWeight: "700" },
  editBtn: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  editTxt: { color: "#a7a7a7", fontSize: 13 },
  sectionHdr: {
    color: "#a7a7a7",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.32)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardTxt: { color: "#FFF", fontSize: 15, fontWeight: "500", marginLeft: 8 },
  listBox: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  itemTxt: { color: "#FFF", fontSize: 15, fontWeight: "500", marginLeft: 8 },
  outlineWrap: {
    borderWidth: 1,
    borderColor: "rgba(255,78,224,0.4)",
    borderRadius: 18,
  },
  btnInner: {
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineInner: { backgroundColor: "rgba(255,78,224,0.15)" },
  logoutTxt: {
    color: "#FF4EE0",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  /* modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { color: "#FFF", fontSize: 20, fontWeight: "700" },
  fieldLbl: { color: "#a7a7a7", fontSize: 13, marginBottom: 6 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    color: "#FFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 24,
  },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 6 },
  btnLbl: { color: "#FFF", fontWeight: "600", fontSize: 15 },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  para: {
    color: "#a7a7a7",
    fontSize: 13,
    marginTop: 16,
    marginBottom: 4,
    lineHeight: 18,
  },
  qaBlock: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  qaQ: { color: "#FFF", fontSize: 15, fontWeight: "600", marginBottom: 4 },
  qaA: { color: "#a7a7a7", fontSize: 13, lineHeight: 18 },
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 16,
  },
  rowCenter: { flexDirection: "row", alignItems: "center" },
});
