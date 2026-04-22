import React, { useEffect } from "react";
import { Voltra } from "voltra";
import { useLiveActivity, endAllLiveActivities } from "voltra/client";
import { CardioActivityType } from "../../constants/types";

type Props = {
  activityType: CardioActivityType;
  startTime: number; // epoch ms
  distance: number; // km
  pace: number; // seconds per km (0 = no pace yet)
  isPaused: boolean;
  elapsedSeconds: number; // frozen elapsed value from the in-app timer
};

const ACTIVITY_LABEL: Record<CardioActivityType, string> = {
  run: "RUN",
  walk: "WALK",
  cycle: "CYCLE",
};

// SF Symbols — available on iOS 15+
const ACTIVITY_SYMBOL: Record<CardioActivityType, string> = {
  run: "figure.run",
  walk: "figure.walk",
  cycle: "figure.outdoor.cycle",
};

const GREEN = "#58cc02";
const DARK = "#131f24";
const MUTED = "#8899a6";
const WHITE = "#ffffff";

function formatPaceLiveActivity(secondsPerKm: number): string {
  if (!secondsPerKm || !isFinite(secondsPerKm) || secondsPerKm <= 0)
    return "--:--";
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function WorkoutLiveActivity({
  activityType,
  startTime,
  distance,
  pace,
  isPaused,
  elapsedSeconds,
}: Props) {
  const label = ACTIVITY_LABEL[activityType];
  const symbol = ACTIVITY_SYMBOL[activityType];
  const distanceText = distance.toFixed(2);
  const paceText = formatPaceLiveActivity(pace);

  // Lock Screen — shown on the lock screen and in the notification tray
  const lockScreen = (
    <Voltra.VStack
      style={{
        backgroundColor: DARK,
        padding: 16,
        gap: 4,
        maxWidth: ".infinity",
      }}
    >
      {/* Activity type header */}
      <Voltra.HStack style={{ gap: 8, alignItems: "center" }}>
        <Voltra.Symbol name={symbol} size={16} tintColor={GREEN} />
        <Voltra.Text style={{ color: MUTED, fontSize: 12, fontWeight: "700" }}>
          {label}
          {isPaused ? " · PAUSED" : ""}
        </Voltra.Text>
      </Voltra.HStack>

      {/* Big distance number */}
      <Voltra.HStack style={{ alignItems: "baseline", gap: 4 }}>
        <Voltra.Text style={{ color: WHITE, fontSize: 40, fontWeight: "900" }}>
          {distanceText}
        </Voltra.Text>
        <Voltra.Text style={{ color: MUTED, fontSize: 16, fontWeight: "700" }}>
          KM
        </Voltra.Text>
      </Voltra.HStack>

      {/* Pace + elapsed row */}
      <Voltra.HStack style={{ gap: 16 }}>
        <Voltra.VStack>
          <Voltra.Text
            style={{ color: GREEN, fontSize: 18, fontWeight: "800" }}
          >
            {paceText}
          </Voltra.Text>
          <Voltra.Text
            style={{ color: MUTED, fontSize: 10, fontWeight: "700" }}
          >
            /KM
          </Voltra.Text>
        </Voltra.VStack>

        <Voltra.VStack>
          {isPaused ? (
            <Voltra.Text
              style={{
                color: MUTED,
                fontSize: 18,
                fontWeight: "800",
                width: "100%",
                textAlign: "right",
              }}
            >
              {formatElapsed(elapsedSeconds)}
            </Voltra.Text>
          ) : (
            <Voltra.Timer
              startAtMs={startTime}
              direction="up"
              style={{
                color: WHITE,
                fontSize: 18,
                fontWeight: "800",
                width: "100%",
                textAlign: "right",
              }}
            />
          )}
          <Voltra.Text
            style={{
              color: MUTED,
              fontSize: 10,
              fontWeight: "700",
              width: "100%",
              textAlign: "right",
            }}
          >
            ELAPSED
          </Voltra.Text>
        </Voltra.VStack>
      </Voltra.HStack>
    </Voltra.VStack>
  );

  // Dynamic Island expanded — shown when the user long-presses or swipes down
  const islandExpanded = {
    center: (
      <Voltra.VStack style={{ alignItems: "center", gap: 2, padding: 8 }}>
        <Voltra.HStack style={{ gap: 6, alignItems: "center" }}>
          <Voltra.Symbol name={symbol} size={14} tintColor={GREEN} />
          <Voltra.Text
            style={{ color: MUTED, fontSize: 11, fontWeight: "700" }}
          >
            {label}
          </Voltra.Text>
        </Voltra.HStack>
        <Voltra.HStack style={{ alignItems: "baseline", gap: 3 }}>
          <Voltra.Text
            style={{ color: WHITE, fontSize: 28, fontWeight: "900" }}
          >
            {distanceText}
          </Voltra.Text>
          <Voltra.Text
            style={{ color: MUTED, fontSize: 13, fontWeight: "700" }}
          >
            KM
          </Voltra.Text>
        </Voltra.HStack>
      </Voltra.VStack>
    ),
    leading: (
      <Voltra.VStack style={{ padding: 8, gap: 2, alignItems: "center" }}>
        <Voltra.Text style={{ color: GREEN, fontSize: 15, fontWeight: "800" }}>
          {paceText}
        </Voltra.Text>
        <Voltra.Text style={{ color: MUTED, fontSize: 9, fontWeight: "700" }}>
          /KM
        </Voltra.Text>
      </Voltra.VStack>
    ),
    trailing: (
      <Voltra.VStack style={{ padding: 8, gap: 2, alignItems: "center" }}>
        {isPaused ? (
          <Voltra.Text
            style={{ color: MUTED, fontSize: 15, fontWeight: "800" }}
          >
            {formatElapsed(elapsedSeconds)}
          </Voltra.Text>
        ) : (
          <Voltra.Timer
            startAtMs={startTime}
            direction="up"
            style={{ color: WHITE, fontSize: 15, fontWeight: "800" }}
          />
        )}
        <Voltra.Text style={{ color: MUTED, fontSize: 9, fontWeight: "700" }}>
          TIME
        </Voltra.Text>
      </Voltra.VStack>
    ),
  };

  // Dynamic Island compact — shown as a pill in the Dynamic Island
  const islandCompact = {
    leading: (
      <Voltra.HStack style={{ gap: 4, paddingLeft: 6, alignItems: "center" }}>
        <Voltra.Symbol name={symbol} size={12} tintColor={GREEN} />
        <Voltra.Text style={{ color: WHITE, fontSize: 13, fontWeight: "800" }}>
          {distanceText}
        </Voltra.Text>
      </Voltra.HStack>
    ),
    trailing: (
      <Voltra.HStack style={{ paddingRight: 6 }}>
        {isPaused ? (
          <Voltra.Text
            style={{ color: MUTED, fontSize: 13, fontWeight: "700" }}
          >
            {formatElapsed(elapsedSeconds)}
          </Voltra.Text>
        ) : (
          <Voltra.Timer
            startAtMs={startTime}
            direction="up"
            style={{ color: WHITE, fontSize: 13, fontWeight: "700" }}
          />
        )}
      </Voltra.HStack>
    ),
  };

  // Dynamic Island minimal — tiny dot form
  const islandMinimal = (
    <Voltra.Symbol name={symbol} size={14} tintColor={GREEN} />
  );

  const { start, end } = useLiveActivity(
    {
      lockScreen,
      island: {
        expanded: islandExpanded,
        compact: islandCompact,
        minimal: islandMinimal,
      },
    },
    {
      activityName: "workout-session",
      autoStart: true,
      autoUpdate: true,
      deepLinkUrl: "/record-cardio",
    },
  );

  // End the Live Activity when the session ends or is abandoned (component unmounts).
  useEffect(() => {
    return () => {
      endAllLiveActivities();
    };
  }, []);

  // This component renders nothing visible — it just manages the Live Activity lifecycle.
  return null;
}
