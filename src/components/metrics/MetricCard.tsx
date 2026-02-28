import React from "react";
import { AnimatedCounter } from "../shared/AnimatedCounter";
import { SparklineChart } from "./SparklineChart";

interface MetricCardProps {
  icon: string;
  label: string;
  value: number;
  format: (n: number) => string;
  color?: string;
  sparklineData?: number[];
  unit?: string;
  subtitle?: string;
}

export const MetricCard: React.FC<MetricCardProps> = React.memo(
  ({
    icon,
    label,
    value,
    format,
    color = "#00f5ff",
    sparklineData,
    subtitle,
  }) => {
    return (
      <div className="px-3 py-2.5 rounded-lg bg-bg-elevated/50 border border-white/5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{icon}</span>
            <span className="text-xs font-heading font-bold text-white/60 uppercase tracking-wider">
              {label}
            </span>
          </div>
          {subtitle && (
            <span className="text-xs font-mono text-white/40">{subtitle}</span>
          )}
        </div>
        <span style={{ color, fontVariantNumeric: "tabular-nums" }}>
          <AnimatedCounter
            value={value}
            format={format}
            className="text-xl font-bold font-mono"
          />
        </span>
        {sparklineData && sparklineData.length > 1 && (
          <div className="mt-1.5">
            <SparklineChart data={sparklineData} color={color} height={24} />
          </div>
        )}
      </div>
    );
  }
);

MetricCard.displayName = "MetricCard";
