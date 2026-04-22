import React, { useEffect } from "react";
import { Voltra } from "voltra";
import { useLiveActivity, endAllLiveActivities } from "voltra/client";

type RestTimerInfo = {
  endTime: number;
  isFinished: boolean;
};

type Props = {
  sessionName: string;
  startTime: number; // epoch ms
  isPaused: boolean;
  elapsedSeconds: number; // frozen elapsed value from the in-app timer
  totalSets: number;
  completedSets: number;
  currentExerciseName: string;
  restTimer: RestTimerInfo | null;
};

// --- Colours mirror GlobalWorkoutBanner ---
const GREEN = "#58cc02";
const ORANGE = "#ff9600";
const RED = "#ff4b4b";
const DARK = "#131f24";
const SURFACE = "#1f2f38";
const MUTED = "#8899a6";
const WHITE = "#ffffff";

function stateColor(restTimer: RestTimerInfo | null): string {
  if (!restTimer) return GREEN;
  return restTimer.isFinished ? RED : ORANGE;
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function WorkoutSessionLiveActivity({
  sessionName,
  startTime,
  isPaused,
  elapsedSeconds,
  totalSets,
  completedSets,
  currentExerciseName,
  restTimer,
}: Props) {
  const accent = stateColor(restTimer);
  const progressText = `${completedSets} / ${totalSets}`;

  // ── Lock Screen ────────────────────────────────────────────────────────────
  const lockScreen = (
    <Voltra.VStack
      style={{
        backgroundColor: DARK,
        borderRadius: 16,
        padding: 16,
        gap: 10,
      }}
    >
      {/* Header row: icon + session name | elapsed */}
      <Voltra.HStack
        style={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <Voltra.HStack style={{ gap: 6, alignItems: "center" }}>
          <Voltra.Symbol
            name="figure.strengthtraining.traditional"
            size={14}
            tintColor={accent}
          />
          <Voltra.Text
            style={{ color: MUTED, fontSize: 11, fontWeight: "700" }}
          >
            {sessionName.toUpperCase()}
          {isPaused ? " · PAUSED" : ""}
          </Voltra.Text>
        </Voltra.HStack>
        {isPaused ? (
          <Voltra.Text
            style={{ color: MUTED, fontSize: 11, fontWeight: "700" }}
          >
            {formatElapsed(elapsedSeconds)}
          </Voltra.Text>
        ) : (
          <Voltra.Timer
            startAtMs={startTime}
            direction="up"
            style={{ color: MUTED, fontSize: 11, fontWeight: "700" }}
          />
        )}
      </Voltra.HStack>

      {/* State label */}
      <Voltra.Text
        style={{ color: accent, fontSize: 10, fontWeight: "900" }}
      >
        {!restTimer
          ? "LIFTING"
          : restTimer.isFinished
            ? "REST COMPLETE"
            : "RESTING"}
      </Voltra.Text>

      {/* Main content — differs by state */}
      {restTimer ? (
        <Voltra.VStack style={{ gap: 4, alignItems: "center" }}>
          {restTimer.isFinished ? (
            <Voltra.Text
              style={{ color: WHITE, fontSize: 30, fontWeight: "900" }}
            >
              READY
            </Voltra.Text>
          ) : (
            <Voltra.Timer
              endAtMs={restTimer.endTime}
              direction="down"
              style={{ color: WHITE, fontSize: 36, fontWeight: "900", textAlign: "center" }}
            />
          )}
          <Voltra.Text
            style={{ color: MUTED, fontSize: 12, fontWeight: "700" }}
          >
            NEXT: {currentExerciseName}
          </Voltra.Text>
        </Voltra.VStack>
      ) : (
        <Voltra.VStack style={{ gap: 2 }}>
          <Voltra.Text
            style={{
              color: WHITE,
              fontSize: 20,
              fontWeight: "900",
            }}
            numberOfLines={1}
          >
            {currentExerciseName}
          </Voltra.Text>
          <Voltra.Text
            style={{ color: MUTED, fontSize: 12, fontWeight: "700" }}
          >
            {sessionName}
          </Voltra.Text>
        </Voltra.VStack>
      )}

      {/* Progress bar row */}
      <Voltra.HStack
        style={{
          backgroundColor: SURFACE,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 6,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Voltra.Text
          style={{ color: accent, fontSize: 15, fontWeight: "900" }}
        >
          {progressText}
        </Voltra.Text>
        <Voltra.Text
          style={{ color: MUTED, fontSize: 11, fontWeight: "700" }}
        >
          SETS DONE
        </Voltra.Text>
      </Voltra.HStack>
    </Voltra.VStack>
  );

  // ── Dynamic Island expanded ────────────────────────────────────────────────
  const islandExpanded = {
    leading: (
      <Voltra.VStack style={{ padding: 8, gap: 2, alignItems: "center" }}>
        {restTimer && !restTimer.isFinished ? (
          <>
            <Voltra.Timer
              endAtMs={restTimer.endTime}
              direction="down"
              style={{ color: accent, fontSize: 15, fontWeight: "900" }}
            />
            <Voltra.Text
              style={{ color: MUTED, fontSize: 9, fontWeight: "700" }}
            >
              REST
            </Voltra.Text>
          </>
        ) : restTimer?.isFinished ? (
          <>
            <Voltra.Text
              style={{ color: RED, fontSize: 13, fontWeight: "900" }}
            >
              READY
            </Voltra.Text>
            <Voltra.Text
              style={{ color: MUTED, fontSize: 9, fontWeight: "700" }}
            >
              REST
            </Voltra.Text>
          </>
        ) : (
          <>
            <Voltra.Text
              style={{
                color: WHITE,
                fontSize: 11,
                fontWeight: "800",
              }}
              numberOfLines={2}
            >
              {currentExerciseName}
            </Voltra.Text>
            <Voltra.Text
              style={{ color: MUTED, fontSize: 9, fontWeight: "700" }}
            >
              NOW
            </Voltra.Text>
          </>
        )}
      </Voltra.VStack>
    ),
    center: (
      <Voltra.VStack style={{ alignItems: "center", gap: 2, padding: 8 }}>
        <Voltra.Text
          style={{ color: accent, fontSize: 22, fontWeight: "900" }}
        >
          {progressText}
        </Voltra.Text>
        <Voltra.Text
          style={{ color: MUTED, fontSize: 10, fontWeight: "700" }}
          numberOfLines={1}
        >
          {sessionName.toUpperCase()}
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
        <Voltra.Text
          style={{ color: MUTED, fontSize: 9, fontWeight: "700" }}
        >
          TIME
        </Voltra.Text>
      </Voltra.VStack>
    ),
  };

  // ── Dynamic Island compact ─────────────────────────────────────────────────
  const islandCompact = {
    leading: (
      <Voltra.HStack style={{ gap: 4, paddingLeft: 6, alignItems: "center" }}>
        <Voltra.Symbol
          name="figure.strengthtraining.traditional"
          size={12}
          tintColor={accent}
        />
        <Voltra.Text
          style={{ color: WHITE, fontSize: 13, fontWeight: "800" }}
        >
          {progressText}
        </Voltra.Text>
      </Voltra.HStack>
    ),
    trailing: (
      <Voltra.HStack style={{ paddingRight: 6 }}>
        {restTimer && !restTimer.isFinished ? (
          <Voltra.Timer
            endAtMs={restTimer.endTime}
            direction="down"
            style={{ color: accent, fontSize: 13, fontWeight: "700" }}
          />
        ) : isPaused ? (
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

  // ── Dynamic Island minimal ─────────────────────────────────────────────────
  const islandMinimal = (
    <Voltra.Symbol
      name="figure.strengthtraining.traditional"
      size={14}
      tintColor={accent}
    />
  );

  useLiveActivity(
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
      deepLinkUrl: "/record-workout",
    },
  );

  // End the Live Activity when the session ends or the screen unmounts
  useEffect(() => {
    return () => {
      endAllLiveActivities();
    };
  }, []);

  return null;
}
