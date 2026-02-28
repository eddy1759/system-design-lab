import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useCanvasStore } from "../../store/canvasStore";
import { useSimulationStore } from "../../store/simulationStore";
import {
  InterviewNarrator,
  type NarrationResult,
} from "../../engine/InterviewNarrator";
import { NarratorSpeaker } from "./NarratorSpeaker";

// ─── Narrator Panel ─────────────────────────────────────────────────────────

export function NarratorPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const metrics = useSimulationStore((s) => s.currentMetrics);
  const trafficLoad = useSimulationStore((s) => s.trafficLoad);
  const trafficPattern = useSimulationStore((s) => s.trafficPattern);
  const spofNodeIds = useSimulationStore((s) => s.spofNodeIds);

  const [narration, setNarration] = useState<NarrationResult | null>(null);
  const [variantSeed, setVariantSeed] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  const speakerRef = useRef(new NarratorSpeaker());

  // Generate narration when panel opens or seed changes
  useEffect(() => {
    if (!isOpen || nodes.length < 2) {
      setNarration(null);
      return;
    }
    setIsGenerating(true);
    // Small delay for perceived smoothness
    const timer = setTimeout(() => {
      const result = InterviewNarrator.generate(
        nodes,
        edges,
        metrics,
        trafficLoad,
        trafficPattern,
        spofNodeIds,
        "this system",
        variantSeed
      );
      setNarration(result);
      setIsGenerating(false);
      setActiveSection(0);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, variantSeed, nodes.length]);

  // Stop speech on close
  useEffect(() => {
    if (!isOpen) {
      speakerRef.current.stop();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, [isOpen]);

  const handleSpeak = useCallback(() => {
    if (!narration) return;
    if (isSpeaking && !isPaused) {
      speakerRef.current.pause();
      setIsPaused(true);
      return;
    }
    if (isPaused) {
      speakerRef.current.resume();
      setIsPaused(false);
      return;
    }
    setIsSpeaking(true);
    speakerRef.current.speak(
      narration.text,
      () => {
        /* onWord — future highlight support */
      },
      () => {
        setIsSpeaking(false);
        setIsPaused(false);
      }
    );
  }, [narration, isSpeaking, isPaused]);

  const handleStop = useCallback(() => {
    speakerRef.current.stop();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const handleCopy = useCallback(() => {
    if (!narration) return;
    navigator.clipboard.writeText(narration.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [narration]);

  const handleRegenerate = useCallback(() => {
    handleStop();
    setVariantSeed((s) => s + 1);
  }, [handleStop]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="narrator-panel"
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "55vh",
          zIndex: 99980,
          background: "#0a1628",
          borderTop: "1px solid rgba(0,245,255,0.2)",
          boxShadow: "0 -24px 80px rgba(0,0,0,0.7)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 20 }}>🎤</span>
          <div>
            <h3
              style={{
                color: "#e2e8f0",
                fontFamily: '"Syne", sans-serif',
                fontSize: 16,
                fontWeight: 700,
                margin: 0,
              }}
            >
              Interview Narrator
            </h3>
            <p
              style={{
                color: "#64748b",
                fontFamily: '"Inter", sans-serif',
                fontSize: 12,
                margin: 0,
              }}
            >
              How you'd explain this architecture in a system design interview
            </p>
          </div>

          {/* Controls */}
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            {NarratorSpeaker.isSupported() && (
              <>
                <button
                  onClick={handleSpeak}
                  style={ctrlBtn("#00f5ff")}
                  title={isSpeaking && !isPaused ? "Pause" : "Listen"}
                >
                  {isSpeaking && !isPaused ? "⏸ Pause" : "▶ Listen"}
                </button>
                {isSpeaking && (
                  <button
                    onClick={handleStop}
                    style={ctrlBtn("#ff3860")}
                    title="Stop"
                  >
                    ⏹
                  </button>
                )}
              </>
            )}
            <button
              onClick={handleRegenerate}
              style={ctrlBtn("#9d4edd")}
              title="Rephrase"
            >
              ↻ Rephrase
            </button>
            <button
              onClick={handleCopy}
              style={ctrlBtn(copied ? "#00ff88" : "#475569")}
              title="Copy"
            >
              {copied ? "✓ Copied" : "⎘ Copy"}
            </button>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "none",
                borderRadius: 6,
                padding: 6,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={16} color="#94a3b8" />
            </button>
          </div>
        </div>

        {/* ── Content: sidebar + text ─────────────────────────────── */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Section navigator */}
          {narration && (
            <div
              style={{
                width: 180,
                flexShrink: 0,
                borderRight: "1px solid rgba(255,255,255,0.06)",
                padding: "12px 0",
                overflowY: "auto",
              }}
            >
              {narration.sections.map((section, i) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(i);
                    document
                      .getElementById(`narrator-section-${section.id}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 16px",
                    border: "none",
                    cursor: "pointer",
                    background:
                      activeSection === i
                        ? "rgba(0,245,255,0.08)"
                        : "transparent",
                    borderLeft: `2px solid ${
                      activeSection === i ? "#00f5ff" : "transparent"
                    }`,
                    color: activeSection === i ? "#00f5ff" : "#64748b",
                    fontFamily: '"Inter", sans-serif',
                    fontSize: 12,
                    transition: "all 0.15s",
                  }}
                >
                  {section.label}
                </button>
              ))}
            </div>
          )}

          {/* Narration text */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 28px",
            }}
          >
            {isGenerating && (
              <div
                style={{
                  color: "#475569",
                  fontFamily: '"Fira Code", monospace',
                  fontSize: 13,
                  textAlign: "center",
                  paddingTop: 40,
                }}
              >
                Generating narration...
              </div>
            )}

            {!isGenerating && nodes.length < 2 && (
              <div
                style={{
                  color: "#475569",
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 14,
                  textAlign: "center",
                  paddingTop: 40,
                }}
              >
                Add at least 2 connected components to generate an interview
                narration.
              </div>
            )}

            {!isGenerating &&
              narration &&
              narration.sections.map((section, i) => (
                <div
                  key={section.id}
                  id={`narrator-section-${section.id}`}
                  style={{ marginBottom: 28 }}
                >
                  {/* Section label */}
                  <div
                    style={{
                      color: "#00f5ff",
                      fontFamily: '"Fira Code", monospace',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      marginBottom: 8,
                      textTransform: "uppercase",
                    }}
                  >
                    {section.label}
                  </div>
                  {/* Section text */}
                  <p
                    style={{
                      color: "#cbd5e1",
                      fontFamily: '"Inter", sans-serif',
                      fontSize: 14,
                      lineHeight: 1.8,
                      margin: 0,
                    }}
                  >
                    {section.text}
                  </p>
                </div>
              ))}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        {narration && (
          <div
            style={{
              padding: "8px 24px",
              borderTop: "1px solid rgba(255,255,255,0.04)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                color: "#334e6b",
                fontFamily: '"Fira Code", monospace',
                fontSize: 11,
              }}
            >
              {narration.wordCount} words · ~{narration.estimatedMinutes} min
              read
            </span>
            <span
              style={{
                color: "#334e6b",
                fontFamily: '"Inter", sans-serif',
                fontSize: 11,
              }}
            >
              Tip: Hit "Rephrase" to get different sentence variants
            </span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ─── Shared button style ────────────────────────────────────────────────────

function ctrlBtn(color: string): React.CSSProperties {
  return {
    padding: "6px 14px",
    borderRadius: 6,
    border: `1px solid ${color}40`,
    background: `${color}12`,
    color,
    cursor: "pointer",
    fontFamily: '"Syne", sans-serif',
    fontSize: 12,
    fontWeight: 600,
    transition: "all 0.15s",
  };
}
