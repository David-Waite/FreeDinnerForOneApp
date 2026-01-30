import React, { useMemo, useState, useCallback } from "react";
import { View, StyleSheet, Platform, LayoutChangeEvent } from "react-native";
import {
  CartesianChart,
  Line,
  Bar,
  useChartPressState,
  useChartTransformState,
  getTransformComponents,
} from "victory-native";
import { Circle, matchFont } from "@shopify/react-native-skia";
import Animated, {
  useDerivedValue,
  useAnimatedProps,
  runOnJS,
  useAnimatedReaction,
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

export default function AnalyticsChart({
  data,
  type,
  color = Colors.primary,
  unit = "",
}: Props) {
  const { state: transformState } = useChartTransformState();
  const { state: pressState, isActive } = useChartPressState({
    x: 0,
    y: { y: 0 },
  });

  // 1. Store the chart width to calculate the visible window accurately
  const [chartWidth, setChartWidth] = useState(0);

  // 2. Track Y-domain
  const [currentYDomain, setCurrentYDomain] = useState<[number, number]>([
    0, 100,
  ]);

  const numericData = useMemo(() => {
    return data.map((d) => ({ x: new Date(d.x).getTime(), y: d.y }));
  }, [data]);

  // Helper to update domain smoothly (prevents jitter if values are very close)
  const updateYDomain = useCallback((min: number, max: number) => {
    setCurrentYDomain((prev) => {
      // Only update if difference is significant to avoid render loops
      if (Math.abs(prev[0] - min) < 0.1 && Math.abs(prev[1] - max) < 0.1)
        return prev;
      return [min, max];
    });
  }, []);

  // --- DYNAMIC Y-AXIS LOGIC ---
  useAnimatedReaction(
    () => ({
      matrix: transformState.matrix.value,
      width: chartWidth,
    }),
    ({ matrix, width }) => {
      if (width === 0 || !numericData.length) return;

      const { scaleX, translateX } = getTransformComponents(matrix);
      const minX = numericData[0].x;
      const maxX = numericData[numericData.length - 1].x;
      const xRange = maxX - minX;

      // MATH: Convert Screen Coordinates to Data Coordinates
      // The formula maps the current Viewport back to the X Domain
      // Left Edge (Data X) = minX - (translateX * xRange) / (width * scaleX)
      const visibleMinX = minX - (translateX * xRange) / (width * scaleX);
      const visibleMaxX = visibleMinX + xRange / scaleX;

      // Filter points that are visible (plus a small buffer to keep the line curve smooth at edges)
      // We add a roughly 5% buffer to the X check
      const buffer = (visibleMaxX - visibleMinX) * 0.05;

      const visiblePoints = numericData.filter(
        (p) => p.x >= visibleMinX - buffer && p.x <= visibleMaxX + buffer,
      );

      // If we have visible points, calculate their Min/Max Y
      if (visiblePoints.length > 0) {
        const values = visiblePoints.map((p) => p.y);
        const minY = Math.min(...values);
        const maxY = Math.max(...values);

        // ADD PADDING: Add 10% padding to top/bottom so points aren't cut off
        const yRange = maxY - minY || 1;
        const padding = yRange * 0.1;

        runOnJS(updateYDomain)(minY - padding, maxY + padding);
      }
    },
    [numericData, chartWidth],
  );

  // --- LABELS & FONT ---
  const activeValueStr = useDerivedValue(() => {
    if (!isActive) return `${data[data.length - 1]?.y ?? 0} ${unit}`;
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

  const onLayout = (event: LayoutChangeEvent) => {
    setChartWidth(event.nativeEvent.layout.width);
  };

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

      {/* Attach onLayout here to get the real width */}
      <View style={styles.chartWrapper} onLayout={onLayout}>
        {/* Only render chart once we have width, to prevent initial 0-width calculation errors */}
        {chartWidth > 0 && (
          <CartesianChart
            data={numericData}
            xKey="x"
            yKeys={["y"]}
            transformState={transformState}
            chartPressState={pressState}
            // Pass the dynamic domain here
            domain={{ y: currentYDomain }}
            // Important: Keep padding low here since we added manual padding in the logic above
            domainPadding={{ left: 10, right: 10, top: 0, bottom: 0 }}
            axisOptions={{
              font,
              labelColor: Colors.textMuted,
              lineColor: Colors.border,
              formatXLabel: (v) => {
                const d = new Date(v);
                return `${d.getDate()}/${d.getMonth() + 1}`;
              },
            }}
          >
            {({ points, chartBounds }) => (
              <>
                {type === "line" ? (
                  <Line
                    points={points.y}
                    color={color}
                    strokeWidth={4}
                    curveType="natural"
                    animate={{ type: "timing", duration: 300 }} // Optional: Smooth out the line jump
                  />
                ) : (
                  <Bar
                    points={points.y}
                    chartBounds={chartBounds}
                    color={color}
                    roundedCorners={{ topLeft: 8, topRight: 8 }}
                    animate={{ type: "timing", duration: 300 }}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 6,
  },
  chartWrapper: { flex: 1 },
  activeLabel: { alignItems: "flex-start", marginBottom: 8 },
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
});
