import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import firebase from "@react-native-firebase/app";

export default function FirebaseTest() {
  const [status, setStatus] = useState("Checking Firebase...");

  useEffect(() => {
    if (firebase.apps.length > 0) {
      setStatus("✅ Firebase Native Connected!");
    } else {
      setStatus("❌ Firebase Not Found");
    }
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>{status}</Text>
    </View>
  );
}
