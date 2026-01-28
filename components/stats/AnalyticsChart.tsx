import React, { useMemo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import {
  CartesianChart,
  Line,
  Bar,
  useChartPressState,
  useChartTransformState,
} from "victory-native";
import { Circle, matchFont } from "@shopify/react-native-skia";
import Animated, {
  useDerivedValue,
  useAnimatedProps,
} from "react-native-reanimated";
import type { ChartDataPoint } from "../../hooks/useExerciseStats";
import Colors from "../../constants/Colors";
import { TextInput } from "react-native-gesture-handler";

// Registering TextInput as an animated component for high-frequency updates
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
  // 1. Standard transform state (since minPointers isn't supported in your version)
  const { state: transformState } = useChartTransformState();
  const { state: pressState, isActive } = useChartPressState({
    x: 0,
    y: { y: 0 },
  });

  // 2. Format the Active Value for the label
  const activeValueStr = useDerivedValue(() => {
    if (!isActive) {
      return `${data[data.length - 1]?.y ?? 0} ${unit}`;
    }
    return `${pressState.y.y.value.value.toFixed(0)} ${unit}`;
  }, [isActive, data, unit]);

  // 3. Format the Active Date for the label
  const activeDateStr = useDerivedValue(() => {
    if (!isActive) return "Current";
    const d = new Date(pressState.x.value.value);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  }, [isActive]);

  // Animated props to pipe values into the "text" property of TextInput
  // This avoids the render-cycle warning and ensures real-time updates
  const valueProps = useAnimatedProps(
    () =>
      ({
        text: activeValueStr.value,
        editable: false,
      }) as any,
  );

  const dateProps = useAnimatedProps(
    () =>
      ({
        text: activeDateStr.value,
        editable: false,
      }) as any,
  );

  const font = matchFont({
    fontFamily: Platform.select({ ios: "Arial", default: "sans-serif" }),
    fontSize: 12,
  });

  const numericData = useMemo(() => {
    return data.map((d) => ({
      x: new Date(d.x).getTime(),
      y: d.y,
    }));
  }, [data]);

  if (!data || data.length === 0 || !font) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Not enough data to chart yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <CartesianChart
          data={numericData}
          xKey="x"
          yKeys={["y"]}
          transformState={transformState}
          chartPressState={pressState}
          padding={{ top: 10, bottom: 0, left: 0, right: 0 }}
          axisOptions={{
            font,
            labelColor: "#000",
            formatXLabel: (v) => {
              const d = new Date(v);
              return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
            },
            formatYLabel: (v) => `${Math.round(v)}${unit}`,
          }}
        >
          {({ points, chartBounds }) => (
            <>
              {type === "line" ? (
                <Line
                  points={points.y}
                  color={color}
                  strokeWidth={3}
                  curveType="natural"
                />
              ) : (
                <Bar
                  points={points.y}
                  chartBounds={chartBounds}
                  color={color}
                  roundedCorners={{ topLeft: 4, topRight: 4 }}
                />
              )}
              {isActive && (
                <Circle
                  cx={pressState.x.position}
                  cy={pressState.y.y.position}
                  r={6}
                  color={color}
                />
              )}
            </>
          )}
        </CartesianChart>
      </View>

      <View style={styles.activeLabel}>
        {/* AnimatedTextInput is used here because it is the most reliable way to 
            update text on the UI thread without triggering a React re-render */}
        <AnimatedTextInput
          underlineColorAndroid="transparent"
          editable={false}
          style={styles.activeValue}
          animatedProps={valueProps}
        />
        <AnimatedTextInput
          underlineColorAndroid="transparent"
          editable={false}
          style={styles.activeDate}
          animatedProps={dateProps}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 320,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 8,
  },
  chartWrapper: { flex: 1 },
  emptyContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: { color: "#999" },
  activeLabel: { alignItems: "center", marginTop: 12, height: 70 },
  activeValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    width: "100%",
    padding: 0,
  },
  activeDate: {
    fontSize: 14,
    color: "#888",
    marginTop: -5,
    textAlign: "center",
    width: "100%",
    padding: 0,
  },
});
