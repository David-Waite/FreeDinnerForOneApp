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
import { useWorkoutContext } from "../context/WorkoutContext";
import ActiveWorkoutControls from "../components/workout/ActiveWorkoutControls";
import { useWorkoutTimer } from "../hooks/useWorkoutTimer";

type Mode = "live" | "manual";

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
  if (!secondsPerKm || !isFinite(secondsPerKm)) return "--:--/km";
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

export default function RecordCardioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activityType: paramActivityType } = useLocalSearchParams<{ activityType: CardioActivityType }>();

  const {
    isCardioActive,
    activeCardio,
    startCardioSession,
    toggleCardioPause,
    updateCardioDistance,
    endCardioSession,
    abandonCardioSession,
  } = useWorkoutContext();

  const activityType = (activeCardio?.activityType ?? paramActivityType ?? "run") as CardioActivityType;
  const config = ACTIVITY_CONFIG[activityType];

  // LIVE is the first tab
  const [mode, setMode] = useState<Mode>("live");

  // --- Manual state ---
  const [manualHours, setManualHours] = useState("0");
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualSeconds, setManualSeconds] = useState("");
  const [manualDistance, setManualDistance] = useState("");

  // --- Live state ---
  const [liveDistance, setLiveDistance] = useState(0);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);

  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const lastLocationRef = useRef<Location.LocationObject | null>(null);
  const accumulatedDistanceRef = useRef(0);

  // Live elapsed timer (for display in stat cards above the controls)
  const liveElapsed = useWorkoutTimer(
    isCardioActive ? (activeCardio?.startTime ?? null) : null,
    activeCardio?.isPaused ?? false,
  );

  // --- Permission on mount ---
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === "granted";
      setHasLocationPermission(granted);
      if (granted) setLocationEnabled(true);
    })();
    return () => stopLocationTracking();
  }, []);

  // --- Restore distance on resume ---
  useEffect(() => {
    if (activeCardio && activeCardio.distance > 0) {
      accumulatedDistanceRef.current = activeCardio.distance;
      setLiveDistance(activeCardio.distance);
    }
  }, [activeCardio?.distance]);

  // --- GPS management ---
  const startLocationTracking = useCallback(async () => {
    if (!hasLocationPermission || locationSubRef.current) return;
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
          accumulatedDistanceRef.current += dist;
          const total = accumulatedDistanceRef.current;
          setLiveDistance(total);
          updateCardioDistance(total);
        }
        lastLocationRef.current = loc;
      },
    );
  }, [hasLocationPermission, updateCardioDistance]);

  const stopLocationTracking = useCallback(() => {
    locationSubRef.current?.remove();
    locationSubRef.current = null;
    lastLocationRef.current = null;
  }, []);

  useEffect(() => {
    if (isCardioActive && activeCardio && !activeCardio.isPaused && activeCardio.gpsEnabled) {
      startLocationTracking();
    }
    if (activeCardio?.isPaused) stopLocationTracking();
  }, [isCardioActive, activeCardio?.isPaused, hasLocationPermission]);

  // --- Actions ---
  const handleStartLive = async () => {
    await startCardioSession(activityType, locationEnabled);
    if (locationEnabled) await startLocationTracking();
  };

  const handleMinimize = () => {
    stopLocationTracking();
    router.replace("/(tabs)");
  };

  const handleEndSession = () => {
    const elapsed = activeCardio
      ? Math.floor((Date.now() - activeCardio.startTime) / 1000)
      : 0;
    const distance = parseFloat(liveDistance.toFixed(2));
    const pace = elapsed > 0 && distance > 0 ? elapsed / distance : 0;

    Alert.alert("END SESSION", "Save this session?", [
      { text: "CANCEL", style: "cancel" },
      {
        text: "SAVE",
        onPress: async () => {
          const session: CardioSession = {
            id: Date.now().toString(),
            sessionType: "cardio",
            activityType,
            date: new Date().toISOString(),
            duration: elapsed,
            distance,
            pace: parseFloat(pace.toFixed(1)),
            mode: "live",
          };
          await WorkoutRepository.saveCardioSession(session);
          await endCardioSession();
          stopLocationTracking();
          router.replace("/(tabs)/workouts");
        },
      },
    ]);
  };

  const handleAbandonSession = () => {
    Alert.alert("ABANDON SESSION", "Discard this cardio session?", [
      { text: "CANCEL", style: "cancel" },
      {
        text: "DISCARD",
        style: "destructive",
        onPress: async () => {
          await abandonCardioSession();
          stopLocationTracking();
          router.back();
        },
      },
    ]);
  };

  // --- Derived values ---
  const livePace =
    liveElapsed > 0 && liveDistance >= 0.05 ? liveElapsed / liveDistance : 0;

  const manualDurationSecs =
    parseInt(manualHours || "0") * 3600 +
    parseInt(manualMinutes || "0") * 60 +
    parseInt(manualSeconds || "0");
  const manualPace =
    manualDurationSecs > 0 && parseFloat(manualDistance) > 0
      ? manualDurationSecs / parseFloat(manualDistance)
      : 0;

  const handleSaveManual = async () => {
    const distance = parseFloat(manualDistance) || 0;
    if (manualDurationSecs <= 0) { Alert.alert("MISSING INFO", "Please enter a duration."); return; }
    if (distance <= 0) { Alert.alert("MISSING INFO", "Please enter a distance."); return; }
    const session: CardioSession = {
      id: Date.now().toString(),
      sessionType: "cardio",
      activityType,
      date: new Date().toISOString(),
      duration: manualDurationSecs,
      distance: parseFloat(distance.toFixed(2)),
      pace: parseFloat(manualPace.toFixed(1)),
      mode: "manual",
    };
    await WorkoutRepository.saveCardioSession(session);
    router.replace("/(tabs)/workouts");
  };

  const canSaveManual = manualDurationSecs > 0 && parseFloat(manualDistance) > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        {isCardioActive && mode === "live" ? (
          <View style={{ width: 44 }} />
        ) : (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={26} color={Colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.headerIcon}>{config.icon}</Text>
          <Text style={styles.headerTitle}>{config.label}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Mode toggle — locked to LIVE when session is active */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "live" && styles.modeBtnActive]}
          onPress={() => { if (!isCardioActive) setMode("live"); }}
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
        <TouchableOpacity
          style={[
            styles.modeBtn,
            mode === "manual" && styles.modeBtnActive,
            isCardioActive && styles.modeBtnDisabled,
          ]}
          onPress={() => { if (!isCardioActive) setMode("manual"); }}
        >
          <Text style={[
            styles.modeBtnText,
            mode === "manual" && styles.modeBtnTextActive,
            isCardioActive && styles.modeBtnTextDisabled,
          ]}>
            MANUAL
          </Text>
        </TouchableOpacity>
      </View>

      {mode === "live" ? (
        <>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Distance stat card */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DISTANCE</Text>
              <View style={styles.bigDisplayRow}>
                <Text style={[styles.bigDisplayValue, { color: isCardioActive ? config.color : Colors.text }]}>
                  {liveDistance.toFixed(2)}
                </Text>
                <Text style={styles.bigDisplayUnit}>KM</Text>
              </View>
            </View>

            {/* Pace + Duration stat card */}
            <View style={styles.statCard}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {isCardioActive ? formatPace(livePace) : "--:--"}
                </Text>
                <Text style={styles.statLabel}>PACE</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {isCardioActive ? formatDuration(liveElapsed) : "--:--"}
                </Text>
                <Text style={styles.statLabel}>DURATION</Text>
              </View>
            </View>

            {/* GPS toggle — only shown pre-start */}
            {!isCardioActive && (
              <TouchableOpacity
                style={[styles.gpsToggle, locationEnabled && styles.gpsToggleActive]}
                onPress={() => { if (hasLocationPermission) setLocationEnabled((v) => !v); }}
                disabled={!hasLocationPermission}
              >
                <Ionicons
                  name={locationEnabled ? "location" : "location-outline"}
                  size={18}
                  color={locationEnabled ? Colors.primary : Colors.textMuted}
                />
                <Text style={[styles.gpsText, locationEnabled && { color: Colors.primary }]}>
                  {hasLocationPermission
                    ? locationEnabled ? "GPS TRACKING ON" : "GPS TRACKING OFF"
                    : "GPS UNAVAILABLE"}
                </Text>
                {locationEnabled && <View style={styles.gpsDot} />}
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* START button — only shown pre-start */}
          {!isCardioActive && (
            <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: Colors.success }]}
                onPress={handleStartLive}
              >
                <Ionicons name="play" size={20} color={Colors.white} />
                <Text style={styles.saveBtnText}>START SESSION</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ActiveWorkoutControls — slides up when session is active */}
          {isCardioActive && (
            <ActiveWorkoutControls
              elapsedSeconds={liveElapsed}
              startTime={activeCardio?.startTime ?? null}
              isPaused={activeCardio?.isPaused ?? false}
              onPauseToggle={toggleCardioPause}
              onFinish={handleEndSession}
              onCancel={handleAbandonSession}
              onMinimize={handleMinimize}
            />
          )}
        </>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Duration inputs */}
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
                <Text style={styles.statLabel}>PACE</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {manualDurationSecs > 0 ? formatDuration(manualDurationSecs) : "--:--"}
                </Text>
                <Text style={styles.statLabel}>DURATION</Text>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
            <TouchableOpacity
              style={[styles.saveBtn, !canSaveManual && styles.saveBtnDisabled]}
              onPress={handleSaveManual}
              disabled={!canSaveManual}
            >
              <MaterialCommunityIcons name="check-bold" size={20} color={Colors.white} />
              <Text style={styles.saveBtnText}>SAVE SESSION</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  modeBtnDisabled: { opacity: 0.4 },
  modeBtnText: { fontSize: 13, fontWeight: "900", color: Colors.textMuted, letterSpacing: 1 },
  modeBtnTextActive: { color: Colors.white },
  modeBtnTextDisabled: { color: Colors.textMuted },

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

  // Live display
  bigDisplayRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  bigDisplayValue: { fontSize: 56, fontWeight: "900", letterSpacing: -1 },
  bigDisplayUnit: { fontSize: 20, fontWeight: "900", color: Colors.textMuted },

  // Stat card (shared live + manual)
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

  // GPS toggle
  gpsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  gpsToggleActive: { borderColor: Colors.primary },
  gpsText: { flex: 1, fontSize: 13, fontWeight: "800", color: Colors.textMuted },
  gpsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },

  // Manual inputs
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

  footer: { padding: 16, borderTopWidth: 2, borderTopColor: Colors.border },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 18,
    borderRadius: 20,
    backgroundColor: Colors.success,
    borderBottomWidth: 5,
    borderBottomColor: "rgba(0,0,0,0.2)",
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 16, fontWeight: "900", color: Colors.white, letterSpacing: 1 },
});
