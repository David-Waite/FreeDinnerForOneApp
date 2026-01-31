import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase";
import { useRouter, Link } from "expo-router";
import Colors from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import DuoTouch from "../components/ui/DuoTouch";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password)
      return Alert.alert(
        "MISSING INFO",
        "Please enter your email and password to continue.",
      );

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      Alert.alert("LOGIN FAILED", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* LOGO AREA */}
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="flash" size={40} color={Colors.gold} />
          </View>
          <Text style={styles.header}>TheComp</Text>
          <Text style={styles.subHeader}>BECOME A LEGEND</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.placeholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <DuoTouch
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
            hapticStyle="medium"
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>LOG IN</Text>
            )}
          </DuoTouch>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>NEW TO THE COMP? </Text>
          <Link href="/signup" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>CREATE ACCOUNT</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, justifyContent: "center", padding: 24 },

  logoContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 6,
    marginBottom: 20,
  },
  header: {
    fontSize: 42,
    fontWeight: "900",
    color: Colors.text,
    textAlign: "center",
  },
  subHeader: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textMuted,
    textAlign: "center",
    letterSpacing: 2,
    marginTop: 4,
  },

  form: { gap: 16 },
  inputWrapper: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 4,
  },
  input: {
    height: 56,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },

  button: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    borderBottomWidth: 5,
    borderBottomColor: "#46a302",
  },
  buttonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },

  footer: {
    flexDirection: "column",
    alignItems: "center",
    marginTop: 40,
    gap: 10,
  },
  footerText: {
    color: Colors.textMuted,
    fontWeight: "700",
    fontSize: 13,
  },
  link: {
    color: Colors.primary,
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
