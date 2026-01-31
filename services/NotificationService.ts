import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../config/firebase";

// 1. Configure how notifications appear when the app is OPEN
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // <--- Added
    shouldShowList: true, // <--- Added
    priority: Notifications.AndroidNotificationPriority.HIGH, // <--- Good for timers
  }),
});

export const NotificationService = {
  /**
   * Registers the device for Push Notifications and returns the token.
   * Also saves the token to the User's Firestore profile.
   */
  async registerForPushNotificationsAsync(userId: string | undefined) {
    if (!Device.isDevice) {
      console.log("Must use physical device for Push Notifications");
      return;
    }

    // A. Request Permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Failed to get push token for push notification!");
      return;
    }

    // B. Get the Expo Push Token
    // You need your projectId from app.json
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId || Constants.expoConfig?.slug;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId, // Ensure this is set correctly
    });
    const token = tokenData.data;

    console.log("Expo Push Token:", token);

    // C. Save Token to Firestore (For Remote Notifications)
    if (userId) {
      await this.saveTokenToUser(userId, token);
    }

    // D. Android Channel Setup (Required for Android)
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    return token;
  },

  async saveTokenToUser(userId: string, token: string) {
    try {
      const userRef = doc(db, "users", userId);
      // We use arrayUnion so a user can have multiple devices (iPad + iPhone)
      await updateDoc(userRef, {
        pushTokens: arrayUnion(token),
      });
    } catch (e) {
      console.error("Error saving push token:", e);
    }
  },

  // --- LOCAL NOTIFICATIONS (Timers/Reminders) ---

  async scheduleRestTimer(seconds: number) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Rest Finished! ⚡️",
        body: "Time to get back to work.",
        sound: true,
      },
      trigger: {
        seconds: seconds, // Fires X seconds from now
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        repeats: false,
      },
    });
  },

  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};
