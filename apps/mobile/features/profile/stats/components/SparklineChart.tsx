// features/profile/stats/components/SparklineChart.tsx
// Pure RN mini line chart from number[]. No external lib.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/lib/theme";

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
}

/**
 * Renders a simple sparkline (tiny line chart) from an array of numbers.
 * Uses a path-like approach with positioned views for compatibility.
 */
export function SparklineChart({
  data,
  width = 48,
  height = 24,
}: SparklineChartProps) {
  const { theme } = useTheme();

  if (data.length === 0) {
    return <View style={[styles.container, { width, height }]} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : 0;

  const points = data.map((value, i) => {
    const x = padding + i * stepX;
    const normalized = (value - min) / range;
    const y = padding + chartHeight - normalized * chartHeight;
    return { x, y };
  });

  // Build line segments as positioned Views (simple approach)
  const segments: { left: number; top: number; width: number; angle: number }[] =
    [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    segments.push({
      left: p1.x,
      top: p1.y,
      width: length,
      angle,
    });
  }

  return (
    <View style={[styles.container, { width, height }]}>
      {segments.map((seg, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            {
              left: seg.left,
              top: seg.top,
              width: seg.width,
              transform: [{ rotate: `${seg.angle}deg` }],
              backgroundColor: theme.colors.primary,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
  },
  segment: {
    position: "absolute",
    height: 2,
    transformOrigin: "left center",
  },
});
