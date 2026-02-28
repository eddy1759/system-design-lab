import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  AlertTriangle,
  AlertCircle,
  Lightbulb,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import {
  useAIAdvisorStore,
  type AdvisorMessage,
} from "../../store/aiAdvisorStore";
import { useCanvasStore } from "../../store/canvasStore";
import { useSimulationStore } from "../../store/simulationStore";
import { ArchitectureAdvisor } from "../../engine/ArchitectureAdvisor";

const typeIcons = {
  critical: AlertCircle,
  warning: AlertTriangle,
  optimization: Lightbulb,
  learning: BookOpen,
};

const typeColors = {
  critical: "text-accent-red border-accent-red/30 bg-accent-red/5",
  warning: "text-accent-amber border-accent-amber/30 bg-accent-amber/5",
  optimization: "text-accent-cyan border-accent-cyan/30 bg-accent-cyan/5",
  learning: "text-violet-400 border-violet-400/30 bg-violet-400/5",
};

const AIAdvisorPanel: React.FC = () => {
  const isOpen = useAIAdvisorStore((s) => s.isOpen);
  const activeRecommendations = useAIAdvisorStore(
    (s) => s.activeRecommendations
  );
  const chatHistory = useAIAdvisorStore((s) => s.chatHistory);
  const isAnalyzing = useAIAdvisorStore((s) => s.isAnalyzing);
  const dismissRecommendation = useAIAdvisorStore(
    (s) => s.dismissRecommendation
  );
  const sendMessage = useAIAdvisorStore((s) => s.sendMessage);
  const close = useAIAdvisorStore((s) => s.close);
  const setRecommendations = useAIAdvisorStore((s) => s.setRecommendations);

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const metrics = useSimulationStore((s) => s.currentMetrics);
  const spofNodeIds = useSimulationStore((s) => s.spofNodeIds);

  const [inputValue, setInputValue] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Re-analyze when nodes change
  useEffect(() => {
    if (!isOpen) return;
    const recs = ArchitectureAdvisor.analyze(
      nodes,
      edges,
      metrics,
      spofNodeIds
    );
    setRecommendations(recs);
  }, [nodes, edges, metrics, spofNodeIds, isOpen, setRecommendations]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue, nodes, metrics);
    setInputValue("");
  };

  const undismissedRecs = activeRecommendations.filter((r) => !r.dismissed);

  const suggestedQuestions = [
    "Why is my latency so high?",
    "How do I reduce AI costs?",
    "Is my system production ready?",
    "How do I prevent hallucinations?",
    "What is a vector database?",
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute right-0 top-0 bottom-0 z-40 w-[320px] bg-bg-surface/98 backdrop-blur-xl border-l border-white/10 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
            <span className="text-xl">🤖</span>
            <div className="flex-1">
              <h3 className="text-sm font-heading font-bold text-white">
                Arch AI
              </h3>
              <span className="text-[9px] font-mono text-white/40">
                Architecture Advisor
              </span>
            </div>
            <button
              onClick={close}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>

          {/* Recommendations */}
          <div className="px-3 py-2 border-b border-white/5 max-h-[200px] overflow-y-auto custom-scrollbar">
            <h4 className="text-[10px] font-heading font-bold text-white/50 uppercase tracking-wider mb-2">
              Active Recommendations ({undismissedRecs.length})
            </h4>
            {undismissedRecs.length === 0 ? (
              <div className="text-[11px] text-white/30 py-2 text-center">
                ✅ Your architecture looks solid!
              </div>
            ) : (
              <div className="space-y-1.5">
                {undismissedRecs.map((rec) => (
                  <RecommendationCard
                    key={rec.id}
                    rec={rec}
                    onDismiss={() => dismissRecommendation(rec.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 custom-scrollbar">
            {chatHistory.length === 0 && (
              <div className="space-y-1.5 pt-2">
                <p className="text-[10px] text-white/30 font-mono text-center mb-2">
                  Ask about your architecture
                </p>
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q, nodes, metrics)}
                    className="w-full text-left px-2.5 py-1.5 text-[10px] text-white/50 bg-bg-elevated/50 border border-white/5 rounded hover:border-white/15 hover:text-white/70 transition-colors flex items-center gap-1.5"
                  >
                    <ChevronRight className="w-3 h-3 text-accent-cyan/50" />
                    {q}
                  </button>
                ))}
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`text-[11px] leading-relaxed px-2.5 py-2 rounded-lg whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-accent-cyan/10 text-accent-cyan/90 border border-accent-cyan/20 ml-4"
                    : "bg-bg-elevated/60 text-white/80 border border-white/5 mr-4"
                }`}
              >
                {msg.content}
              </div>
            ))}
            {isAnalyzing && (
              <div className="text-[10px] text-white/30 animate-pulse px-2.5 py-2">
                Analyzing...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-white/10">
            <div className="flex items-center gap-2 bg-bg-elevated rounded-lg border border-white/10 px-2.5 py-1.5">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask about your architecture..."
                className="flex-1 bg-transparent text-xs text-white placeholder-white/30 outline-none font-mono"
              />
              <button
                onClick={handleSend}
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                <Send className="w-3.5 h-3.5 text-accent-cyan/60" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Recommendation Card ────────────────────────────────────────────────────

const RecommendationCard: React.FC<{
  rec: AdvisorMessage;
  onDismiss: () => void;
}> = ({ rec, onDismiss }) => {
  const Icon = typeIcons[rec.type];
  const colorClasses = typeColors[rec.type];

  return (
    <div
      className={`px-2.5 py-2 rounded-lg border ${colorClasses} transition-all`}
    >
      <div className="flex items-start gap-2">
        <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-heading font-bold leading-tight truncate">
            {rec.title}
          </p>
          <p className="text-[9px] text-white/50 mt-0.5 leading-relaxed line-clamp-2">
            {rec.body}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-white/20 hover:text-white/60 text-[10px] p-0.5"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default React.memo(AIAdvisorPanel);
