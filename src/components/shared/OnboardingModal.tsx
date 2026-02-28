import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ArrowRight, Play } from "lucide-react";
import { useCanvasStore } from "../../store/canvasStore";

const OnboardingModal: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showEmptyHint, setShowEmptyHint] = useState(false);
  const nodes = useCanvasStore((s) => s.nodes);

  useEffect(() => {
    const hasVisited = localStorage.getItem("sysdesign-hasVisited");
    if (!hasVisited) {
      setShowWelcome(true);
    }
  }, []);

  useEffect(() => {
    setShowEmptyHint(nodes.length === 0);
  }, [nodes.length]);

  const handleDismissWelcome = () => {
    localStorage.setItem("sysdesign-hasVisited", "true");
    setShowWelcome(false);
  };

  return (
    <>
      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-[480px] bg-bg-surface border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
              {/* Header gradient */}
              <div className="h-1.5 bg-gradient-to-r from-accent-cyan via-violet-500 to-accent-green" />

              <div className="px-8 py-6">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                  <span className="text-[10px] font-mono text-violet-400/80 bg-violet-500/10 px-1.5 py-0.5 rounded">
                    AI EDITION
                  </span>
                </div>

                <h1 className="text-2xl font-heading font-bold text-white mb-2">
                  Welcome to SysDesign Simulator
                </h1>
                <p className="text-sm text-white/50 leading-relaxed mb-6">
                  Design AI systems and distributed architectures. Drag,
                  connect, and watch them behave in real time with live metrics.
                </p>

                {/* Feature highlights */}
                <div className="space-y-2 mb-6">
                  {[
                    [
                      "🧱",
                      "Drag & drop",
                      "classical and AI infrastructure components",
                    ],
                    [
                      "🔗",
                      "Connect them",
                      "to build your architecture — edges animate",
                    ],
                    [
                      "📊",
                      "Live metrics",
                      "throughput, latency, cost, GPU pressure",
                    ],
                    [
                      "🤖",
                      "AI Advisor",
                      "analyzes your design and suggests improvements",
                    ],
                  ].map(([icon, title, desc]) => (
                    <div key={title} className="flex items-center gap-3">
                      <span className="text-base">{icon}</span>
                      <div>
                        <span className="text-xs font-heading font-bold text-white/80">
                          {title}
                        </span>
                        <span className="text-xs text-white/40"> — {desc}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleDismissWelcome}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-cyan/20 border border-accent-cyan/30 rounded-lg text-sm font-heading font-bold text-accent-cyan hover:bg-accent-cyan/30 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Jump In
                  </button>
                </div>
              </div>

              <button
                onClick={handleDismissWelcome}
                className="absolute top-3 right-3 p-1 rounded hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-white/30" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty Canvas Hint */}
      <AnimatePresence>
        {showEmptyHint && !showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
          >
            <div className="text-center pointer-events-auto">
              {/* Animated drag icon */}
              <div className="mb-3">
                <motion.div
                  animate={{ x: [0, 30, 30, 0], y: [0, 0, 20, 20] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="inline-block"
                >
                  <ArrowRight className="w-6 h-6 text-white/20" />
                </motion.div>
              </div>
              <p className="text-sm text-white/30 font-heading mb-3">
                Drag a component from the left panel to start building
              </p>
              <p className="text-[10px] text-white/20 font-mono">
                — or pick a starting point from Templates above —
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default React.memo(OnboardingModal);
