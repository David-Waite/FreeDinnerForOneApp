import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Platform,
  Text,
  TouchableOpacity,
} from "react-native";
import {
  CartesianChart,
  Line,
  Bar,
  Scatter,
  useChartPressState,
} from "victory-native";
import { Circle, matchFont } from "@shopify/react-native-skia";
import Animated, {
  useDerivedValue,
  useAnimatedProps,
} from "react-native-reanimated";
import { TextInput } from "react-native-gesture-handler";
import type { ChartDataPoint } from "../../hooks/useExerciseStats";
import Colors from "../../constants/Colors";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type Props = {
  data: ChartDataPoint[];
  type: "line" | "bar" | "grid"; // Added grid here
  color?: string;
  unit?: string;
};

const RANGES = ["1W", "1M", "3M", "6M", "All"] as const;
type Range = (typeof RANGES)[number];

export default function AnalyticsChart({
  data,
  type,
  color = Colors.primary,
  unit = "",
}: Props) {
  const [range, setRange] = useState<Range>("1M");

  const { state: pressState, isActive } = useChartPressState({
    x: 0,
    y: { y: 0 },
  });

  // --- DATA PREPARATION ---
  const { processedData, yDomain, xDomain, gridData } = useMemo(() => {
    const fullData = data.map((d) => ({ x: new Date(d.x).getTime(), y: d.y }));
    const now = new Date().getTime();
    let cutoff = 0;

    switch (range) {
      case "1W":
        cutoff = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "1M":
        cutoff = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "3M":
        cutoff = now - 90 * 24 * 60 * 60 * 1000;
        break;
      case "6M":
        cutoff = now - 180 * 24 * 60 * 60 * 1000;
        break;
      case "All":
        cutoff = 0;
        break;
    }

    const filtered = fullData.filter((d) => d.x >= cutoff);

    // --- Grid Logic (for consistency view) ---
    // Calculate how many days to show based on range
    const daysToShow = range === "1W" ? 7 : range === "1M" ? 30 : 90; // Limit grid size for clarity
    const gridItems = Array.from({ length: daysToShow }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (daysToShow - 1 - i));
      const dateStr = date.toISOString().split("T")[0];
      const hasActivity = data.some((d) => d.x.startsWith(dateStr) && d.y > 0);
      return { active: hasActivity, date: dateStr };
    });

    // --- Chart Domains ---
    const yValues = filtered.map((d) => d.y);
    const minY = yValues.length ? Math.min(...yValues) : 0;
    const maxY = yValues.length ? Math.max(...yValues) : 100;
    const yPadding = (maxY - minY) * 0.15 || 10; // Increased padding to prevent clipping

    let minX =
      range === "All" && fullData.length
        ? Math.min(...fullData.map((d) => d.x))
        : cutoff;
    let maxX = now;

    return {
      processedData: filtered,
      gridData: gridItems,
      yDomain: [minY - yPadding, maxY + yPadding] as [number, number],
      xDomain: [minX, maxX] as [number, number],
    };
  }, [data, range]);

  // --- ANIMATED LABELS ---
  const activeValueStr = useDerivedValue(() => {
    if (!isActive) {
      const lastVal = processedData[processedData.length - 1]?.y ?? 0;
      return `${lastVal.toFixed(0)} ${unit}`;
    }
    return `${pressState.y.y.value.value.toFixed(0)} ${unit}`;
  });

  const activeDateStr = useDerivedValue(() => {
    if (!isActive) return "LATEST RECORD";
    const d = new Date(pressState.x.value.value);
    return d
      .toLocaleDateString("en-GB", { day: "numeric", month: "short" })
      .toUpperCase();
  });

  const valueProps = useAnimatedProps(
    () => ({ text: activeValueStr.value, editable: false }) as any,
  );
  const dateProps = useAnimatedProps(
    () => ({ text: activeDateStr.value, editable: false }) as any,
  );

  const font = matchFont({
    fontFamily: Platform.select({ ios: "Arial", default: "serif" }),
    fontSize: 10,
    fontWeight: "900",
  });

  return (
    <View style={styles.container}>
      <View style={styles.activeLabel}>
        <AnimatedTextInput
          style={styles.activeValue}
          animatedProps={valueProps}
        />
        <AnimatedTextInput
          style={[styles.activeDate, { color: color }]}
          animatedProps={dateProps}
        />
      </View>

      <View style={styles.chartWrapper}>
        {type === "grid" ? (
          <View style={styles.gridContainer}>
            {gridData.map((day, i) => (
              <View
                key={i}
                style={[
                  styles.gridSquare,
                  {
                    backgroundColor: day.active ? color : Colors.border,
                    width: range === "1W" ? "12%" : "4%", // Dynamic sizing for range
                  },
                ]}
              />
            ))}
          </View>
        ) : (
          <CartesianChart
            data={processedData}
            xKey="x"
            yKeys={["y"]}
            chartPressState={pressState}
            domain={{ y: yDomain, x: xDomain }}
            domainPadding={{ left: 20, right: 20, top: 20, bottom: 20 }}
            axisOptions={{
              font,
              labelColor: Colors.textMuted,
              lineColor: Colors.border,
              tickCount: 5,
              formatXLabel: (v) => {
                const d = new Date(v);
                return `${d.getDate()}/${d.getMonth() + 1}`;
              },
            }}
          >
            {({ points, chartBounds }) => (
              <>
                {type === "line" ? (
                  <>
                    <Line
                      points={points.y}
                      color={color}
                      strokeWidth={4}
                      curveType="natural"
                      animate={{ type: "timing", duration: 500 }}
                    />
                    {(range === "1W" || range === "1M") && (
                      <Scatter
                        points={points.y}
                        shape="circle"
                        radius={4}
                        color={color}
                      />
                    )}
                  </>
                ) : (
                  <Bar
                    points={points.y}
                    chartBounds={chartBounds}
                    color={color}
                    roundedCorners={{ topLeft: 8, topRight: 8 }}
                    animate={{ type: "timing", duration: 500 }}
                  />
                )}
                {isActive && (
                  <Circle
                    cx={pressState.x.position}
                    cy={pressState.y.y.position}
                    r={8}
                    color={color}
                  />
                )}
              </>
            )}
          </CartesianChart>
        )}
      </View>

      <View style={styles.rangeContainer}>
        {RANGES.map((r) => {
          const isSelected = range === r;
          return (
            <TouchableOpacity
              key={r}
              onPress={() => setRange(r)}
              style={[
                styles.rangeButton,
                isSelected && { backgroundColor: color },
              ]}
            >
              <Text style={[styles.rangeText, isSelected && { color: "#FFF" }]}>
                {r}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 380,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 6,
  },
  chartWrapper: { flex: 1, marginBottom: 16, justifyContent: "center" },
  activeLabel: { alignItems: "flex-start", marginBottom: 12 },
  activeValue: {
    fontSize: 32,
    fontWeight: "900",
    color: Colors.text,
    width: "100%",
    padding: 0,
  },
  activeDate: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    width: "100%",
    padding: 0,
  },
  rangeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 4,
  },
  rangeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 45,
    alignItems: "center",
  },
  rangeText: { fontSize: 12, fontWeight: "700", color: Colors.textMuted },

  /* Grid Styles */
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
  gridSquare: {
    aspectRatio: 1,
    borderRadius: 4,
  },
});
