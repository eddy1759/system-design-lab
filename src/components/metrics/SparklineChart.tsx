import React from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface SparklineChartProps {
  data: number[];
  color?: string;
  height?: number;
}

export const SparklineChart: React.FC<SparklineChartProps> = React.memo(
  ({ data, color = "#00f5ff", height = 30 }) => {
    const chartData = data.map((value, index) => ({ index, value }));

    return (
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              animationDuration={300}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
);

SparklineChart.displayName = "SparklineChart";
