import React, { useMemo } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { CartesianChart, Line, Bar, useChartPressState } from "victory-native";
import { Circle, useFont, matchFont } from "@shopify/react-native-skia";
import type { ChartDataPoint } from "../../hooks/useExerciseStats";
import Colors from "../../constants/Colors";

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
  const font = matchFont({
    fontFamily: "System",
    fontSize: 12,
    fontWeight: "normal",
  });

  // 1. Convert String Dates (YYYY-MM-DD) to Number Timestamps for the Chart Logic
  // This solves the "Type 'number' is not assignable to type 'string'" error.
  const numericData = useMemo(() => {
    return data.map((d) => ({
      x: new Date(d.x).getTime(), // Convert to number
      y: d.y,
      originalDate: d.x, // Keep original string for reference
    }));
  }, [data]);

  // Initialize state with numbers, matching the converted data
  const { state, isActive } = useChartPressState({ x: 0, y: { y: 0 } });

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Not enough data to chart yet.</Text>
      </View>
    );
  }

  // Helper to make dates readable again (e.g., "Jan 24")
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <CartesianChart
          data={numericData} // Use the numeric data
          xKey="x"
          yKeys={["y"]}
          axisOptions={{
            font,
            tickCount: 5,
            labelOffset: { x: 5, y: 5 },
            lineColor: "#e5e5ea",
            labelColor: "#999",
            // Format the number back to a string for the axis labels
            formatXLabel: (value) => formatDate(value),
          }}
          chartPressState={state}
        >
          {({ points, chartBounds }) => (
            <>
              {type === "line" ? (
                <Line
                  points={points.y}
                  color={color}
                  strokeWidth={3}
                  animate={{ type: "timing", duration: 500 }}
                />
              ) : (
                <Bar
                  points={points.y}
                  chartBounds={chartBounds}
                  color={color}
                  roundedCorners={{ topLeft: 4, topRight: 4 }}
                  animate={{ type: "timing", duration: 500 }}
                />
              )}

              {isActive && type === "line" && (
                <Circle
                  cx={state.x.position}
                  cy={state.y.y.position}
                  r={8}
                  color={color}
                />
              )}
            </>
          )}
        </CartesianChart>
      </View>

      {/* Active Value Display */}
      <View style={styles.activeLabel}>
        {isActive ? (
          <>
            <Text style={styles.activeValue}>
              {state.y.y.value.value.toFixed(0)} {unit}
            </Text>
            <Text style={styles.activeDate}>
              {formatDate(state.x.value.value)}
            </Text>
          </>
        ) : (
          <>
            {/* Show the last data point by default */}
            <Text style={styles.activeValue}>
              {data[data.length - 1]?.y} {unit}
            </Text>
            <Text style={styles.activeDate}>Current</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  chartWrapper: { flex: 1, overflow: "hidden" },
  emptyContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
  },
  emptyText: { color: "#999" },
  activeLabel: { alignItems: "center", marginTop: 12 },
  activeValue: { fontSize: 24, fontWeight: "bold", color: "#333" },
  activeDate: { fontSize: 14, color: "#888", marginTop: 2 },
});
