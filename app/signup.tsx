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
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { useRouter, Link } from "expo-router";
import Colors from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function SignupScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async () => {
    if (!username || !email || !password)
      return Alert.alert(
        "MISSING INFO",
        "Please fill in all fields to start your journey.",
      );

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      await updateProfile(user, { displayName: username });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username: username,
        displayName: username,
        photoURL: "",
        status: "active",
        privacySettings: {
          encryptWorkouts: true,
          encryptBodyWeight: true,
          shareExercisesToGlobal: false,
        },
      });

      router.replace("/signup-profile-pic");
    } catch (error: any) {
      Alert.alert("SIGNUP FAILED", error.message);
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
        {/* DUO ICON */}
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="trophy" size={40} color={Colors.gold} />
          </View>
          <Text style={styles.header}>Join TheComp</Text>
          <Text style={styles.subHeader}>CREATE YOUR ATHLETE PROFILE</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={Colors.placeholder}
              value={username}
              onChangeText={setUsername}
            />
          </View>

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

          <TouchableOpacity
            style={styles.button}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>SIGN UP</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>ALREADY HAVE AN ACCOUNT? </Text>
          <Link href="/login" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>LOG IN</Text>
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
    marginBottom: 40,
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
    fontSize: 36,
    fontWeight: "900",
    color: Colors.text,
    textAlign: "center",
  },
  subHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textMuted,
    textAlign: "center",
    letterSpacing: 1.5,
    marginTop: 4,
  },

  form: { gap: 14 },
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
    marginTop: 10,
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
    marginTop: 32,
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
