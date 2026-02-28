import React, { useCallback } from "react";
import { Sliders, Play, Pause, Zap, FastForward } from "lucide-react";
import { useSimulationStore } from "../../store/simulationStore";
import type { TrafficPattern } from "../../types/components";

const patterns: { value: TrafficPattern; label: string }[] = [
  { value: "steady", label: "Steady" },
  { value: "spike", label: "Spike" },
  { value: "sine-wave", label: "Sine Wave" },
  { value: "flash-sale", label: "Flash Sale" },
];

const speeds = [1, 5, 10];

const LoadControls: React.FC = () => {
  const trafficLoad = useSimulationStore((s) => s.trafficLoad);
  const setTrafficLoad = useSimulationStore((s) => s.setTrafficLoad);
  const trafficPattern = useSimulationStore((s) => s.trafficPattern);
  const setTrafficPattern = useSimulationStore((s) => s.setTrafficPattern);
  const isRunning = useSimulationStore((s) => s.isRunning);
  const setRunning = useSimulationStore((s) => s.setRunning);
  const simulationSpeed = useSimulationStore((s) => s.simulationSpeed);
  const setSimulationSpeed = useSimulationStore((s) => s.setSimulationSpeed);

  // Logarithmic slider
  const logMin = Math.log10(100);
  const logMax = Math.log10(1000000);
  const logValue = Math.log10(trafficLoad);
  const sliderPercent = ((logValue - logMin) / (logMax - logMin)) * 100;

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const percent = parseFloat(e.target.value);
      const logVal = logMin + (percent / 100) * (logMax - logMin);
      setTrafficLoad(Math.round(Math.pow(10, logVal)));
    },
    [setTrafficLoad]
  );

  const formatLoad = (n: number): string => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(0) + "K";
    return n.toString();
  };

  return (
    <div
      className="
      h-11 flex items-center gap-4 px-4
      bg-bg-surface/95 backdrop-blur-lg
      border-t border-white/5
      flex-shrink-0
    "
    >
      {/* Play/Pause */}
      <button
        onClick={() => setRunning(!isRunning)}
        className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
      >
        {isRunning ? (
          <Pause className="w-4 h-4 text-white/50" />
        ) : (
          <Play className="w-4 h-4 text-accent-green" />
        )}
      </button>

      {/* Traffic Load Slider */}
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <Sliders className="w-4 h-4 text-white/40 flex-shrink-0" />
        <span
          className="text-xs text-white/60 font-mono w-12 flex-shrink-0"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatLoad(trafficLoad)}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={sliderPercent}
          onChange={handleSliderChange}
          className="flex-1 h-1 accent-accent-cyan appearance-none bg-white/10 rounded-full cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-cyan [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(0,245,255,0.4)]"
        />
        <span className="text-xs text-white/40 font-mono">req/s</span>
      </div>

      {/* Pattern Selector */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-white/40 font-mono">Pattern:</span>
        <select
          value={trafficPattern}
          onChange={(e) => setTrafficPattern(e.target.value as TrafficPattern)}
          className="bg-bg-elevated border border-white/10 rounded px-2 py-1 text-xs font-mono text-white/70 outline-none focus:border-accent-cyan/40"
        >
          {patterns.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Speed Control */}
      <div className="flex items-center gap-1.5">
        <FastForward className="w-3.5 h-3.5 text-white/40" />
        {speeds.map((speed) => (
          <button
            key={speed}
            onClick={() => setSimulationSpeed(speed)}
            className={`
              px-2 py-0.5 rounded text-xs font-mono
              ${
                simulationSpeed === speed
                  ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30"
                  : "text-white/40 hover:text-white/60 hover:bg-white/5"
              }
            `}
          >
            {speed}x
          </button>
        ))}
      </div>
    </div>
  );
};

export default React.memo(LoadControls);
