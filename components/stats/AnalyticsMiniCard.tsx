import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";
import { CartesianChart, Line, Bar } from "victory-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { ChartDataPoint } from "../../hooks/useExerciseStats";

type Props = {
  title: string;
  data: ChartDataPoint[];
  type: "line" | "bar";
  color: string;
  unit: string;
  onPress: () => void;
};

export default function AnalyticsMiniCard({
  title,
  data,
  type,
  color,
  unit,
  onPress,
}: Props) {
  const numericData = useMemo(() => {
    // Show last 10 points for the sparkline feel
    return data.slice(-10).map((d) => ({
      x: new Date(d.x).getTime(),
      y: d.y,
    }));
  }, [data]);

  const latestValue = data.length > 0 ? data[data.length - 1].y : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <Text style={styles.title}>{title.toUpperCase()}</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
      </View>

      <View style={styles.chartContainer}>
        {data.length > 1 ? (
          <CartesianChart data={numericData} xKey="x" yKeys={["y"]} padding={2}>
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
              </>
            )}
          </CartesianChart>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {data.length === 0 ? "NO DATA" : "NEED MORE DATA"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.value}>{latestValue.toFixed(0)}</Text>
        <Text style={styles.unit}>{unit.toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%", // Half screen minus gap
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    borderBottomWidth: 5,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  chartContainer: { height: 50, width: "100%", marginBottom: 8 },
  footer: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  value: { fontSize: 20, fontWeight: "900", color: Colors.text },
  unit: { fontSize: 10, fontWeight: "800", color: Colors.textMuted },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  emptyText: { fontSize: 8, fontWeight: "900", color: Colors.placeholder },
});
