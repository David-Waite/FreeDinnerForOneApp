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
  type: "line" | "bar";
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
  const { processedData, yDomain, xDomain } = useMemo(() => {
    const fullData = data.map((d) => ({ x: new Date(d.x).getTime(), y: d.y }));

    // Handle empty data case
    if (fullData.length === 0) {
      const now = new Date().getTime();
      return {
        processedData: [],
        yDomain: [0, 100] as [number, number],
        // Default X domain to "now" minus 1 month so the chart isn't blank/broken
        xDomain: [now - 30 * 24 * 60 * 60 * 1000, now] as [number, number],
      };
    }

    const now = new Date().getTime();
    let cutoff = 0;

    // We calculate the cutoff to filter data...
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
        // For 'All', we don't filter by time, but we need a start point
        cutoff = 0;
        break;
    }

    // 1. Filter Data based on cutoff
    const filtered = fullData.filter((d) => d.x >= cutoff);
    const finalData = filtered.length > 0 ? filtered : [];

    // 2. Calculate Y Domain (Dynamic based on VISIBLE data)
    const yValues = finalData.map((d) => d.y);
    const minY = yValues.length ? Math.min(...yValues) : 0;
    const maxY = yValues.length ? Math.max(...yValues) : 100;
    const yPadding = (maxY - minY) * 0.1 || 10;

    // 3. Calculate X Domain (Fixed based on RANGE)
    // This is the key fix: We force the domain to be [cutoff, now]
    // unless it is "All", in which case we use the data's real start/end.
    let minX, maxX;

    if (range === "All") {
      const xValues = fullData.map((d) => d.x);
      minX = Math.min(...xValues);
      maxX = Math.max(...xValues);
    } else {
      minX = cutoff;
      maxX = now;
    }

    // Add a tiny bit of padding to "All" view so points aren't on the edge
    if (range === "All") {
      const span = maxX - minX;
      minX -= span * 0.02;
      maxX += span * 0.02;
    }

    return {
      processedData: finalData,
      yDomain: [minY - yPadding, maxY + yPadding] as [number, number],
      xDomain: [minX, maxX] as [number, number],
    };
  }, [data, range]);

  // --- LABELS ---
  const activeValueStr = useDerivedValue(() => {
    if (!isActive) {
      const lastVal = processedData[processedData.length - 1]?.y ?? 0;
      return `${lastVal} ${unit}`;
    }
    return `${pressState.y.y.value.value.toFixed(0)} ${unit}`;
  });

  const activeDateStr = useDerivedValue(() => {
    if (!isActive) return "CURRENT RECORD";
    const d = new Date(pressState.x.value.value);
    const months = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
    return `${d.getDate()} ${months[d.getMonth()]}`;
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

  // Only show points for short durations to avoid clutter
  const showPoints = range === "1W" || range === "1M";

  return (
    <View style={styles.container}>
      <View style={styles.activeLabel}>
        <AnimatedTextInput
          style={styles.activeValue}
          animatedProps={valueProps}
        />
        <AnimatedTextInput
          style={styles.activeDate}
          animatedProps={dateProps}
        />
      </View>

      <View style={styles.chartWrapper}>
        <CartesianChart
          data={processedData}
          xKey="x"
          yKeys={["y"]}
          chartPressState={pressState}
          // Explicitly pass both domains
          domain={{ y: yDomain, x: xDomain }}
          domainPadding={{ left: 20, right: 20, top: 0, bottom: 0 }}
          axisOptions={{
            font,
            labelColor: Colors.textMuted,
            lineColor: Colors.border,
            // 7 ticks for 1 week (daily), otherwise 5 is cleaner
            tickCount: range === "1W" ? 7 : 5,
            formatXLabel: (v) => {
              const d = new Date(v);
              const day = d.getDate();
              const month = d.getMonth() + 1;
              // For longer ranges, seeing the year might be helpful in some cases,
              // but DD/MM is usually sufficient for < 1 year.
              return `${day}/${month}`;
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
                  {showPoints && (
                    <Scatter
                      points={points.y}
                      shape="circle"
                      radius={4}
                      style="fill"
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
                  style="fill"
                />
              )}
            </>
          )}
        </CartesianChart>
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
    minHeight: 350,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 6,
  },
  chartWrapper: {
    flex: 1,
    marginBottom: 16,
  },
  activeLabel: { alignItems: "flex-start", marginBottom: 12 },
  activeValue: {
    fontSize: 28,
    fontWeight: "900",
    color: Colors.text,
    width: "100%",
    padding: 0,
  },
  activeDate: {
    fontSize: 11,
    fontWeight: "900",
    color: Colors.primary,
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 40,
    alignItems: "center",
  },
  rangeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
  },
});
