import React from "react";
import { motion } from "framer-motion";
import { X, AlertTriangle, Crosshair } from "lucide-react";
import { useSimulationStore } from "../../store/simulationStore";
import { useMetricHistory } from "../../hooks/useMetricHistory";
import { useUIStore } from "../../store/uiStore";
import { useCanvasStore } from "../../store/canvasStore";
import { MetricCard } from "./MetricCard";
import { AnimatedCounter } from "../shared/AnimatedCounter";
import {
  formatAvailability,
  formatLatency,
  formatThroughput,
  formatCost,
} from "../../utils/formatters";

const alertBorderColors: Record<string, string> = {
  error: "#ff3860",
  warning: "#ffb800",
  success: "#00ff88",
  info: "#00f5ff",
};

const MetricsPanel: React.FC = () => {
  const metricsOpen = useUIStore((s) => s.metricsOpen);
  const toggleMetrics = useUIStore((s) => s.toggleMetrics);
  const currentMetrics = useSimulationStore((s) => s.currentMetrics);
  const alerts = useSimulationStore((s) => s.alerts);
  const dismissAlert = useSimulationStore((s) => s.dismissAlert);
  const spofNodeIds = useSimulationStore((s) => s.spofNodeIds);
  const history = useMetricHistory(30);

  const throughputHistory = history.map((m) => m.throughput);
  const latencyHistory = history.map((m) => m.latencyP50);
  const errorHistory = history.map((m) => m.errorRate * 100);

  if (!metricsOpen) {
    return null;
  }

  return (
    <motion.aside
      data-tour="metrics-panel"
      initial={{ x: 280 }}
      animate={{ x: 0 }}
      className="
        w-[270px] flex-shrink-0
        bg-bg-surface/95 backdrop-blur-lg
        border-l border-white/5
        flex flex-col
        overflow-hidden
      "
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h2 className="text-sm font-heading font-bold text-white/90">
          System Metrics
        </h2>
        <button
          onClick={toggleMetrics}
          className="p-1 rounded hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-white/40" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar">
        {/* Section 1: System Health */}
        <div>
          <h3 className="text-xs font-heading font-bold text-white/50 uppercase tracking-widest mb-2">
            System Health
          </h3>
          <div className="bg-bg-elevated/50 rounded-lg border border-white/5 px-3 py-3 mb-2">
            <div className="text-xs text-white/50 font-heading uppercase mb-1">
              Availability
            </div>
            <AnimatedCounter
              value={currentMetrics.availability * 100}
              format={(n) => n.toFixed(3) + "%"}
              className="text-2xl font-bold font-mono"
            />
            <div className="flex gap-3 mt-2">
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-accent-red" />
                <span className="text-xs font-mono text-accent-red">
                  {spofNodeIds.length} SPOF{spofNodeIds.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="px-2 py-0.5 rounded text-xs font-mono text-white/70 bg-white/5">
                {currentMetrics.capState}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Performance */}
        <div>
          <h3 className="text-xs font-heading font-bold text-white/50 uppercase tracking-widest mb-2">
            Performance
          </h3>
          <div className="space-y-2">
            <MetricCard
              icon="⚡"
              label="Latency P50"
              value={currentMetrics.latencyP50}
              format={(n) => formatLatency(n)}
              color={currentMetrics.latencyP50 > 200 ? "#ff3860" : "#00f5ff"}
              sparklineData={latencyHistory}
            />
            <div className="flex gap-2">
              <div className="flex-1 px-2 py-2 rounded bg-bg-elevated/30 border border-white/5">
                <div className="text-xs text-white/40 font-mono mb-0.5">
                  P95
                </div>
                <AnimatedCounter
                  value={currentMetrics.latencyP95}
                  format={(n) => formatLatency(n)}
                  className="text-sm font-bold text-white/80 font-mono"
                />
              </div>
              <div className="flex-1 px-2 py-2 rounded bg-bg-elevated/30 border border-white/5">
                <div className="text-xs text-white/40 font-mono mb-0.5">
                  P99
                </div>
                <AnimatedCounter
                  value={currentMetrics.latencyP99}
                  format={(n) => formatLatency(n)}
                  className="text-sm font-bold text-white/80 font-mono"
                />
              </div>
            </div>
            <MetricCard
              icon="📈"
              label="Throughput"
              value={currentMetrics.throughput}
              format={(n) => formatThroughput(Math.round(n))}
              color="#00ff88"
              sparklineData={throughputHistory}
            />
            <MetricCard
              icon="❌"
              label="Error Rate"
              value={currentMetrics.errorRate * 100}
              format={(n) => n.toFixed(2) + "%"}
              color={currentMetrics.errorRate > 0.05 ? "#ff3860" : "#00ff88"}
              sparklineData={errorHistory}
            />
            <div className="px-3 py-2 rounded bg-bg-elevated/30 border border-white/5 flex items-center justify-between">
              <span className="text-xs text-white/50 font-body">
                🌐 Network Hops
              </span>
              <span
                className="text-sm font-mono text-white/80"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {currentMetrics.networkHops}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Storage & Caching */}
        <div>
          <h3 className="text-xs font-heading font-bold text-white/50 uppercase tracking-widest mb-2">
            Storage & Caching
          </h3>
          <div className="space-y-2">
            <div className="px-3 py-2 rounded bg-bg-elevated/30 border border-white/5 flex items-center justify-between">
              <span className="text-xs text-white/50 font-body">
                💾 Consistency
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-mono text-accent-purple bg-accent-purple/10 border border-accent-purple/20">
                {currentMetrics.consistencyModel}
              </span>
            </div>
            {currentMetrics.cacheHitRate !== null && (
              <div className="px-3 py-2 rounded bg-bg-elevated/30 border border-white/5 flex items-center justify-between">
                <span className="text-xs text-white/50 font-body">
                  ⚡ Cache Hit Rate
                </span>
                <span
                  className="text-sm font-mono text-accent-green"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {(currentMetrics.cacheHitRate * 100).toFixed(0)}%
                </span>
              </div>
            )}
            {currentMetrics.dbReadWriteRatio !== null && (
              <div className="px-3 py-2 rounded bg-bg-elevated/30 border border-white/5">
                <span className="text-xs text-white/50 font-body">
                  📊 Read/Write Ratio
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-accent-cyan/60 rounded-l-full"
                      style={{
                        width: `${currentMetrics.dbReadWriteRatio * 100}%`,
                      }}
                    />
                    <div
                      className="h-full bg-accent-amber/60 rounded-r-full"
                      style={{
                        width: `${
                          (1 - currentMetrics.dbReadWriteRatio) * 100
                        }%`,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-mono text-white/50"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {Math.round(currentMetrics.dbReadWriteRatio * 100)}/
                    {Math.round((1 - currentMetrics.dbReadWriteRatio) * 100)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Scaling & Cost */}
        <div>
          <h3 className="text-xs font-heading font-bold text-white/50 uppercase tracking-widest mb-2">
            Scaling & Cost
          </h3>
          <div className="space-y-2">
            <div className="px-3 py-2 rounded bg-bg-elevated/30 border border-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/50 font-body">
                  📦 Scalability Score
                </span>
                <span
                  className="text-sm font-mono text-white/80"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {currentMetrics.scalabilityScore}/100
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${currentMetrics.scalabilityScore}%`,
                    backgroundColor:
                      currentMetrics.scalabilityScore > 70
                        ? "#00ff88"
                        : currentMetrics.scalabilityScore > 40
                        ? "#ffb800"
                        : "#ff3860",
                  }}
                />
              </div>
            </div>
            <MetricCard
              icon="💰"
              label="Monthly Cost"
              value={currentMetrics.monthlyCost}
              format={(n) => formatCost(Math.round(n))}
              color="#ffb800"
            />
            {currentMetrics.queueDepth !== null && (
              <div className="px-3 py-2 rounded bg-bg-elevated/30 border border-white/5 flex items-center justify-between">
                <span className="text-xs text-white/50 font-body">
                  📬 Queue Depth
                </span>
                <span
                  className="text-sm font-mono text-white/80"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {currentMetrics.queueDepth}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Active Alerts */}
        <div>
          <h3 className="text-xs font-heading font-bold text-white/50 uppercase tracking-widest mb-2">
            Alerts ({alerts.filter((a) => !a.dismissed).length})
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {alerts
              .filter((a) => !a.dismissed)
              .slice(-8)
              .reverse()
              .map((alert) => {
                const borderColor = alertBorderColors[alert.type] || "#00f5ff";
                return (
                  <div
                    key={alert.id}
                    className={`
                      px-2.5 py-2 rounded-lg text-xs font-body
                      flex items-start gap-1.5
                      ${
                        alert.type === "error"
                          ? "bg-accent-red/10 border border-accent-red/20"
                          : alert.type === "warning"
                          ? "bg-accent-amber/10 border border-accent-amber/20"
                          : alert.type === "success"
                          ? "bg-accent-green/10 border border-accent-green/20"
                          : "bg-accent-cyan/10 border border-accent-cyan/20"
                      }
                    `}
                    style={{ borderLeftWidth: 3, borderLeftColor: borderColor }}
                  >
                    <span
                      className="flex-1 leading-relaxed"
                      style={{ color: borderColor }}
                    >
                      {alert.message}
                    </span>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity mt-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            {alerts.filter((a) => !a.dismissed).length === 0 && (
              <p className="text-xs text-white/30 font-body text-center py-2">
                No active alerts
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  );
};

export default React.memo(MetricsPanel);
