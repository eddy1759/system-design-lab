import React, { useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Trash2, Plus, AlertTriangle } from "lucide-react";
import { useCanvasStore } from "../../store/canvasStore";
import { useUIStore } from "../../store/uiStore";
import { COMPONENT_MAP } from "../../constants/componentDefinitions";
import { AnimatedCounter } from "../shared/AnimatedCounter";
import type {
  LoadBalancerAlgorithm,
  ServerRuntime,
} from "../../types/components";

const ComponentDetailDrawer: React.FC = () => {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const nodes = useCanvasStore((s) => s.nodes);
  const updateNodeConfig = useCanvasStore((s) => s.updateNodeConfig);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const duplicateNode = useCanvasStore((s) => s.duplicateNode);
  const addReplica = useCanvasStore((s) => s.addReplica);
  const detailDrawerOpen = useUIStore((s) => s.detailDrawerOpen);
  const setDetailDrawer = useUIStore((s) => s.setDetailDrawer);

  const node = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  const def = useMemo(
    () => (node ? COMPONENT_MAP.get(node.data.componentType) : undefined),
    [node]
  );

  const [activeTab, setActiveTab] = React.useState<
    "config" | "metrics" | "education" | "danger"
  >("config");

  const handleClose = useCallback(() => {
    setDetailDrawer(false);
  }, [setDetailDrawer]);

  if (!detailDrawerOpen || !node || !def) return null;

  const data = node.data;
  const tabs = ["config", "metrics", "education", "danger"] as const;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="
          absolute bottom-0 left-0 right-0 z-30
          h-[280px] 
          bg-bg-surface/98 backdrop-blur-xl
          border-t border-white/10
          flex flex-col
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: def.color + "20",
                border: `1px solid ${def.color}40`,
              }}
            >
              <span className="text-sm" style={{ color: def.color }}>
                ●
              </span>
            </div>
            <div>
              <h3 className="text-sm font-heading font-bold text-white">
                {data.config.label}
              </h3>
              <p className="text-xs text-white/50 font-mono">
                {def.name} · {def.category}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => duplicateNode(node.id)}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              title="Duplicate"
            >
              <Copy className="w-3.5 h-3.5 text-white/40" />
            </button>
            <button
              onClick={() => {
                removeNode(node.id);
                handleClose();
              }}
              className="p-1.5 rounded hover:bg-accent-red/20 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5 text-accent-red/60" />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-4 py-1.5 text-xs font-heading font-bold uppercase tracking-wider
                border-b-2 transition-colors
                ${
                  activeTab === tab
                    ? "border-accent-cyan text-accent-cyan"
                    : "border-transparent text-white/40 hover:text-white/60"
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {activeTab === "config" && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-white/50 font-mono block mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={data.config.label}
                  onChange={(e) =>
                    updateNodeConfig(node.id, { label: e.target.value })
                  }
                  className="w-full px-2 py-1.5 bg-bg-elevated border border-white/10 rounded text-xs text-white font-mono outline-none focus:border-accent-cyan/40"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 font-mono block mb-1">
                  Replicas
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={data.config.replicas}
                  onChange={(e) =>
                    updateNodeConfig(node.id, {
                      replicas: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-2 py-1.5 bg-bg-elevated border border-white/10 rounded text-xs text-white font-mono outline-none focus:border-accent-cyan/40"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 font-mono block mb-1">
                  Region
                </label>
                <select
                  value={data.config.region}
                  onChange={(e) =>
                    updateNodeConfig(node.id, { region: e.target.value })
                  }
                  className="w-full px-2 py-1.5 bg-bg-elevated border border-white/10 rounded text-xs text-white font-mono outline-none focus:border-accent-cyan/40"
                >
                  <option value="us-east-1">us-east-1</option>
                  <option value="us-west-2">us-west-2</option>
                  <option value="eu-west-1">eu-west-1</option>
                  <option value="ap-southeast-1">ap-southeast-1</option>
                </select>
              </div>
              {data.config.algorithm !== undefined && (
                <div>
                  <label className="text-xs text-white/50 font-mono block mb-1">
                    Algorithm
                  </label>
                  <select
                    value={data.config.algorithm}
                    onChange={(e) =>
                      updateNodeConfig(node.id, {
                        algorithm: e.target.value as LoadBalancerAlgorithm,
                      })
                    }
                    className="w-full px-2 py-1.5 bg-bg-elevated border border-white/10 rounded text-xs text-white font-mono outline-none focus:border-accent-cyan/40"
                  >
                    <option value="round-robin">Round Robin</option>
                    <option value="least-connections">Least Connections</option>
                    <option value="ip-hash">IP Hash</option>
                  </select>
                </div>
              )}
              {data.config.runtime !== undefined && (
                <div>
                  <label className="text-xs text-white/50 font-mono block mb-1">
                    Runtime
                  </label>
                  <select
                    value={data.config.runtime}
                    onChange={(e) =>
                      updateNodeConfig(node.id, {
                        runtime: e.target.value as ServerRuntime,
                      })
                    }
                    className="w-full px-2 py-1.5 bg-bg-elevated border border-white/10 rounded text-xs text-white font-mono outline-none focus:border-accent-cyan/40"
                  >
                    <option value="node">Node.js</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-white/50 font-mono block mb-1">
                  Max Throughput
                </label>
                <div className="text-xs font-mono text-white/70 px-2 py-1.5">
                  {(
                    def.maxThroughput * (data.config.replicas || 1)
                  ).toLocaleString()}{" "}
                  req/s
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 font-mono block mb-1">
                  Base Latency
                </label>
                <div className="text-xs font-mono text-white/70 px-2 py-1.5">
                  {def.baseLatency}ms
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 font-mono block mb-1">
                  Availability SLA
                </label>
                <div className="text-xs font-mono text-white/70 px-2 py-1.5">
                  {(def.availabilitySLA * 100).toFixed(2)}%
                </div>
              </div>
            </div>
          )}

          {activeTab === "metrics" && (
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-bg-elevated/50 rounded-lg p-2.5 border border-white/5">
                <div className="text-xs text-white/40 font-mono mb-1">
                  CPU %
                </div>
                <AnimatedCounter
                  value={data.currentLoad * 80}
                  format={(n) => Math.round(n) + "%"}
                  className="text-base font-bold text-accent-cyan font-mono"
                />
              </div>
              <div className="bg-bg-elevated/50 rounded-lg p-2.5 border border-white/5">
                <div className="text-xs text-white/40 font-mono mb-1">
                  Memory %
                </div>
                <AnimatedCounter
                  value={data.currentLoad * 60 + 20}
                  format={(n) => Math.round(n) + "%"}
                  className="text-base font-bold text-accent-amber font-mono"
                />
              </div>
              <div className="bg-bg-elevated/50 rounded-lg p-2.5 border border-white/5">
                <div className="text-xs text-white/40 font-mono mb-1">
                  Req Rate
                </div>
                <AnimatedCounter
                  value={data.currentRPS}
                  format={(n) => Math.round(n) + "/s"}
                  className="text-base font-bold text-accent-green font-mono"
                />
              </div>
              <div className="bg-bg-elevated/50 rounded-lg p-2.5 border border-white/5">
                <div className="text-xs text-white/40 font-mono mb-1">
                  Error Rate
                </div>
                <AnimatedCounter
                  value={data.errorRate * 100}
                  format={(n) => n.toFixed(1) + "%"}
                  className="text-base font-bold text-accent-red font-mono"
                />
              </div>
            </div>
          )}

          {activeTab === "education" && (
            <div className="space-y-4">
              {/* What is it — large readable intro */}
              <section>
                <h4 className="text-sm font-heading font-bold text-accent-cyan mb-2">
                  What is it?
                </h4>
                <p className="text-sm text-slate-300 font-body leading-relaxed">
                  {def.education.whatIsIt}
                </p>
              </section>

              {/* When to use — scannable list */}
              <section>
                <h4 className="text-sm font-heading font-bold text-white/80 mb-2">
                  When to use
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {def.education.whenToUse.map((item: string, i: number) => (
                    <li
                      key={i}
                      className="text-sm text-slate-400 font-body leading-relaxed"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Tradeoffs — two columns: Pros / Cons */}
              <section>
                <h4 className="text-sm font-heading font-bold text-white/80 mb-2">
                  Tradeoffs
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-accent-green/5 border border-accent-green/15 rounded-lg p-3">
                    <span className="text-xs font-mono font-bold text-accent-green uppercase tracking-wider">
                      Pros
                    </span>
                    <ul className="mt-2 space-y-1">
                      {def.education.tradeoffs.pros.map(
                        (p: string, i: number) => (
                          <li
                            key={i}
                            className="text-xs text-slate-400 font-body leading-relaxed"
                          >
                            ✓ {p}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                  <div className="bg-accent-red/5 border border-accent-red/15 rounded-lg p-3">
                    <span className="text-xs font-mono font-bold text-accent-red uppercase tracking-wider">
                      Cons
                    </span>
                    <ul className="mt-2 space-y-1">
                      {def.education.tradeoffs.cons.map(
                        (c: string, i: number) => (
                          <li
                            key={i}
                            className="text-xs text-slate-400 font-body leading-relaxed"
                          >
                            ✗ {c}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </section>

              {/* Real-world examples — pill badges */}
              <section>
                <h4 className="text-sm font-heading font-bold text-white/80 mb-2">
                  Used by
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {def.education.realWorldExamples.map((ex: string) => (
                    <span
                      key={ex}
                      className="bg-accent-cyan/8 border border-accent-cyan/20 rounded-full px-3 py-1 text-xs font-mono text-accent-cyan"
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === "danger" && (
            <div className="space-y-3">
              {data.isSPOF && (
                <div className="bg-accent-red/10 border border-accent-red/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-accent-red" />
                    <span className="text-sm font-heading font-bold text-accent-red">
                      Single Point of Failure
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 font-body mb-2 leading-relaxed">
                    This component has no redundancy. If it fails, your system
                    goes down.
                  </p>
                  {def.isHorizontallyScalable && (
                    <button
                      onClick={() => addReplica(node.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-green/20 border border-accent-green/30 rounded text-xs font-heading font-bold text-accent-green hover:bg-accent-green/30 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add Redundancy (+1 replica)
                    </button>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    removeNode(node.id);
                    handleClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-red/10 border border-accent-red/20 rounded text-xs font-heading text-accent-red hover:bg-accent-red/20 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete Component
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default React.memo(ComponentDetailDrawer);
