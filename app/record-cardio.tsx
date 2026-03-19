import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import Colors from "../constants/Colors";
import { CardioActivityType, CardioSession } from "../constants/types";
import { WorkoutRepository } from "../services/WorkoutRepository";

type Mode = "manual" | "live";

const ACTIVITY_CONFIG: Record<
  CardioActivityType,
  { label: string; icon: string; color: string }
> = {
  run: { label: "RUN", icon: "🏃", color: Colors.error },
  walk: { label: "WALK", icon: "🚶", color: Colors.info },
  cycle: { label: "CYCLE", icon: "🚴", color: Colors.warning },
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatPace(secondsPerKm: number): string {
  if (!secondsPerKm || !isFinite(secondsPerKm)) return "--:--";
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function RecordCardioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activityType } = useLocalSearchParams<{ activityType: CardioActivityType }>();
  const config = ACTIVITY_CONFIG[activityType ?? "run"];

  const [mode, setMode] = useState<Mode>("manual");

  // --- Manual mode state ---
  const [manualHours, setManualHours] = useState("0");
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualSeconds, setManualSeconds] = useState("");
  const [manualDistance, setManualDistance] = useState("");

  // --- Live mode state ---
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [liveDistance, setLiveDistance] = useState(0);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const lastLocationRef = useRef<Location.LocationObject | null>(null);

  // --- Request location permission on mount ---
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(status === "granted");
    })();
    return () => stopLive();
  }, []);

  // --- Live timer ---
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const startLocationTracking = useCallback(async () => {
    if (!hasLocationPermission) return;
    locationSubRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 5 },
      (loc) => {
        if (lastLocationRef.current) {
          const dist = getDistanceKm(
            lastLocationRef.current.coords.latitude,
            lastLocationRef.current.coords.longitude,
            loc.coords.latitude,
            loc.coords.longitude,
          );
          setLiveDistance((d) => d + dist);
        }
        lastLocationRef.current = loc;
      },
    );
  }, [hasLocationPermission]);

  const stopLive = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (locationSubRef.current) locationSubRef.current.remove();
    lastLocationRef.current = null;
  };

  const handleLiveToggle = async () => {
    if (!isRunning) {
      setIsRunning(true);
      if (locationEnabled) await startLocationTracking();
    } else {
      setIsRunning(false);
      stopLive();
    }
  };

  const handleResetLive = () => {
    setIsRunning(false);
    stopLive();
    setElapsed(0);
    setLiveDistance(0);
  };

  // --- Derived values ---
  const manualDurationSecs =
    parseInt(manualHours || "0") * 3600 +
    parseInt(manualMinutes || "0") * 60 +
    parseInt(manualSeconds || "0");

  const manualPace =
    manualDurationSecs > 0 && parseFloat(manualDistance) > 0
      ? manualDurationSecs / parseFloat(manualDistance)
      : 0;

  const livePace =
    elapsed > 0 && liveDistance > 0 ? elapsed / liveDistance : 0;

  // --- Save ---
  const handleSave = async () => {
    const duration = mode === "manual" ? manualDurationSecs : elapsed;
    const distance =
      mode === "manual" ? parseFloat(manualDistance) || 0 : liveDistance;
    const pace = mode === "manual" ? manualPace : livePace;

    if (duration <= 0) {
      Alert.alert("MISSING INFO", "Please enter a duration.");
      return;
    }
    if (distance <= 0) {
      Alert.alert("MISSING INFO", "Please enter a distance.");
      return;
    }

    const session: CardioSession = {
      id: Date.now().toString(),
      sessionType: "cardio",
      activityType: activityType ?? "run",
      date: new Date().toISOString(),
      duration,
      distance: parseFloat(distance.toFixed(2)),
      pace: parseFloat(pace.toFixed(1)),
      mode,
    };

    await WorkoutRepository.saveCardioSession(session);
    router.replace("/(tabs)/workouts");
  };

  const canSave =
    mode === "manual"
      ? manualDurationSecs > 0 && parseFloat(manualDistance) > 0
      : elapsed > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerIcon}>{config.icon}</Text>
          <Text style={styles.headerTitle}>{config.label}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "manual" && styles.modeBtnActive]}
          onPress={() => { if (isRunning) return; setMode("manual"); }}
        >
          <Text style={[styles.modeBtnText, mode === "manual" && styles.modeBtnTextActive]}>
            MANUAL
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "live" && styles.modeBtnActive]}
          onPress={() => { if (isRunning) return; setMode("live"); }}
        >
          <Ionicons
            name="radio-button-on"
            size={12}
            color={mode === "live" ? Colors.white : Colors.textMuted}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.modeBtnText, mode === "live" && styles.modeBtnTextActive]}>
            LIVE
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {mode === "manual" ? (
          <>
            {/* Duration input */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DURATION</Text>
              <View style={styles.durationRow}>
                <View style={styles.durationField}>
                  <TextInput
                    style={styles.durationInput}
                    value={manualHours}
                    onChangeText={setManualHours}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="0"
                    placeholderTextColor={Colors.placeholder}
                  />
                  <Text style={styles.durationUnit}>h</Text>
                </View>
                <Text style={styles.durationSep}>:</Text>
                <View style={styles.durationField}>
                  <TextInput
                    style={styles.durationInput}
                    value={manualMinutes}
                    onChangeText={setManualMinutes}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="00"
                    placeholderTextColor={Colors.placeholder}
                  />
                  <Text style={styles.durationUnit}>m</Text>
                </View>
                <Text style={styles.durationSep}>:</Text>
                <View style={styles.durationField}>
                  <TextInput
                    style={styles.durationInput}
                    value={manualSeconds}
                    onChangeText={setManualSeconds}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="00"
                    placeholderTextColor={Colors.placeholder}
                  />
                  <Text style={styles.durationUnit}>s</Text>
                </View>
              </View>
            </View>

            {/* Distance input */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DISTANCE</Text>
              <View style={styles.distanceRow}>
                <TextInput
                  style={styles.distanceInput}
                  value={manualDistance}
                  onChangeText={setManualDistance}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={Colors.placeholder}
                />
                <Text style={styles.distanceUnit}>KM</Text>
              </View>
            </View>

            {/* Calculated pace */}
            <View style={styles.statCard}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatPace(manualPace)}</Text>
                <Text style={styles.statLabel}>PACE / KM</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {manualDurationSecs > 0 ? formatDuration(manualDurationSecs) : "--:--"}
                </Text>
                <Text style={styles.statLabel}>DURATION</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Live timer display */}
            <View style={styles.liveTimerCard}>
              <Text style={[styles.liveTimer, { color: config.color }]}>
                {formatDuration(elapsed)}
              </Text>
              <Text style={styles.liveTimerLabel}>
                {isRunning ? "IN PROGRESS" : elapsed > 0 ? "PAUSED" : "READY"}
              </Text>
            </View>

            {/* Live stats */}
            <View style={styles.statCard}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {liveDistance > 0 ? liveDistance.toFixed(2) : "0.00"}
                </Text>
                <Text style={styles.statLabel}>KM</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatPace(livePace)}</Text>
                <Text style={styles.statLabel}>PACE / KM</Text>
              </View>
            </View>

            {/* GPS toggle */}
            <TouchableOpacity
              style={[styles.gpsToggle, locationEnabled && styles.gpsToggleActive]}
              onPress={() => {
                if (isRunning) return;
                setLocationEnabled((v) => !v);
              }}
              disabled={!hasLocationPermission}
            >
              <Ionicons
                name={locationEnabled ? "location" : "location-outline"}
                size={18}
                color={locationEnabled ? Colors.primary : Colors.textMuted}
              />
              <Text style={[styles.gpsText, locationEnabled && { color: Colors.primary }]}>
                {hasLocationPermission ? "GPS TRACKING" : "GPS UNAVAILABLE"}
              </Text>
              {locationEnabled && (
                <View style={styles.gpsDot} />
              )}
            </TouchableOpacity>

            {/* Start / Stop */}
            <TouchableOpacity
              style={[styles.liveBtn, { backgroundColor: isRunning ? Colors.error : config.color }]}
              onPress={handleLiveToggle}
            >
              <Ionicons
                name={isRunning ? "stop" : "play"}
                size={24}
                color={Colors.white}
              />
              <Text style={styles.liveBtnText}>
                {isRunning ? "STOP" : elapsed > 0 ? "RESUME" : "START"}
              </Text>
            </TouchableOpacity>

            {elapsed > 0 && !isRunning && (
              <TouchableOpacity style={styles.resetBtn} onPress={handleResetLive}>
                <Text style={styles.resetBtnText}>RESET</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* Save button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: config.color }, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <MaterialCommunityIcons name="check-bold" size={20} color={Colors.white} />
          <Text style={styles.saveBtnText}>SAVE SESSION</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Haversine formula — distance between two GPS coords in km
function getDistanceKm(
  lat1: number, lon1: number, lat2: number, lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 44, height: 44, justifyContent: "center" },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerIcon: { fontSize: 22 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: Colors.text, letterSpacing: 1 },
  modeToggle: {
    flexDirection: "row",
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeBtnText: { fontSize: 13, fontWeight: "900", color: Colors.textMuted, letterSpacing: 1 },
  modeBtnTextActive: { color: Colors.white },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 5,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  durationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  durationField: { flex: 1, flexDirection: "row", alignItems: "baseline" },
  durationInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: "900",
    color: Colors.text,
    textAlign: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 8,
  },
  durationUnit: { fontSize: 14, fontWeight: "800", color: Colors.textMuted, marginLeft: 4 },
  durationSep: { fontSize: 28, fontWeight: "900", color: Colors.border, paddingBottom: 4 },
  distanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  distanceInput: {
    flex: 1,
    fontSize: 42,
    fontWeight: "900",
    color: Colors.text,
    textAlign: "center",
    padding: 8,
  },
  distanceUnit: { fontSize: 18, fontWeight: "900", color: Colors.textMuted },
  statCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 5,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 28, fontWeight: "900", color: Colors.text },
  statLabel: { fontSize: 10, fontWeight: "900", color: Colors.textMuted, letterSpacing: 1, marginTop: 4 },
  statDivider: { width: 2, backgroundColor: Colors.border, marginHorizontal: 8 },
  liveTimerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 6,
  },
  liveTimer: { fontSize: 64, fontWeight: "900", letterSpacing: 2 },
  liveTimerLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 2,
    marginTop: 8,
  },
  gpsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  gpsToggleActive: { borderColor: Colors.primary },
  gpsText: { flex: 1, fontSize: 13, fontWeight: "800", color: Colors.textMuted },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  liveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 18,
    borderRadius: 20,
    borderBottomWidth: 5,
    borderBottomColor: "rgba(0,0,0,0.2)",
  },
  liveBtnText: { fontSize: 18, fontWeight: "900", color: Colors.white, letterSpacing: 1 },
  resetBtn: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
  },
  resetBtnText: { fontSize: 13, fontWeight: "900", color: Colors.textMuted, letterSpacing: 1 },
  footer: {
    padding: 16,
    borderTopWidth: 2,
    borderTopColor: Colors.border,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 18,
    borderRadius: 20,
    borderBottomWidth: 5,
    borderBottomColor: "rgba(0,0,0,0.2)",
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 16, fontWeight: "900", color: Colors.white, letterSpacing: 1 },
});
