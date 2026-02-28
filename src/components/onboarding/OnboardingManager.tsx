import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "sysdesign-v3-onboarded";

const safeLocalStorage = {
  get: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, val: string) => {
    try {
      localStorage.setItem(key, val);
    } catch {}
  },
};

const TOUR_STEPS = [
  {
    target: "component-library",
    title: "🏗️ Your Building Blocks",
    body: "This is the component library. It has classical infrastructure (servers, databases, queues) and AI components (LLMs, Vector DBs, RAG Pipelines). Drag any card onto the canvas.",
    position: "right" as const,
  },
  {
    target: "ai-component-section",
    title: "⚡ AI & ML Components",
    body: "Modern AI infrastructure — LLM Inference, Vector Databases, RAG Pipelines, Agent Orchestrators, and more. They simulate real AI behaviour with token throughput and GPU metrics.",
    position: "right" as const,
  },
  {
    target: "system-canvas",
    title: "🖥️ The Architecture Canvas",
    body: "Drag components here to build your system. Connect them by hovering over a node to reveal port dots, then drag from one port to another.",
    position: "bottom" as const,
  },
  {
    target: "metrics-panel",
    title: "📊 Live Metrics",
    body: "Every topology change updates these metrics — latency, throughput, availability, error rate, cost. AI systems also show token throughput and GPU memory pressure.",
    position: "left" as const,
  },
  {
    target: "ai-advisor-btn",
    title: "🤖 AI Architecture Advisor",
    body: "Click to open your personal architecture advisor. It analyses your design in real time and flags issues like a senior engineer reviewing your work.",
    position: "bottom" as const,
  },
  {
    target: "validate-btn",
    title: "✅ Architecture Validation",
    body: "Hit Validate to get a scored report — correctness, redundancy, scalability, security, and AI best practices. It tells you exactly what is wrong and how to fix it.",
    position: "bottom" as const,
  },
  {
    target: "scenario-bar",
    title: "🎯 Architecture Challenges",
    body: "Design challenges with real goals — build ChatGPT, handle a flash sale, scale Twitter. Each one has a target SLA and tracks your progress.",
    position: "bottom" as const,
  },
  {
    target: "load-test-btn",
    title: "💥 Load Testing",
    body: "Flood your system with 10× traffic for 5 seconds. Watch which components turn red and fail. Discover your bottlenecks and SPOFs.",
    position: "bottom" as const,
  },
];

export function OnboardingManager() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const visited = safeLocalStorage.get(STORAGE_KEY);
    if (!visited) {
      setTimeout(() => setShowWelcome(true), 800);
    }
  }, []);

  const startTour = useCallback(() => {
    setShowWelcome(false);
    setShowTour(true);
    setStepIndex(0);
  }, []);

  const skipOnboarding = useCallback(() => {
    safeLocalStorage.set(STORAGE_KEY, "true");
    setShowWelcome(false);
    setShowTour(false);
  }, []);

  const nextStep = useCallback(() => {
    if (stepIndex < TOUR_STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      safeLocalStorage.set(STORAGE_KEY, "true");
      setShowTour(false);
    }
  }, [stepIndex]);

  const prevStep = useCallback(() => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }, [stepIndex]);

  // Update spotlight rect when step changes
  useEffect(() => {
    if (!showTour) return;
    const step = TOUR_STEPS[stepIndex];
    let attempts = 0;
    const findTarget = () => {
      const el = document.querySelector(
        `[data-tour="${step.target}"]`
      ) as HTMLElement;
      if (el) {
        const rect = el.getBoundingClientRect();
        setSpotlightRect(rect);
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else if (attempts < 10) {
        attempts++;
        setTimeout(findTarget, 100);
      }
    };
    findTarget();
  }, [stepIndex, showTour]);

  if (!showWelcome && !showTour) return null;

  return createPortal(
    <>
      {/* WELCOME MODAL */}
      {showWelcome && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(5,13,26,0.85)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              width: 480,
              background: "#0a1628",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 32px 64px rgba(0,0,0,0.6)",
            }}
          >
            {/* Header gradient */}
            <div
              style={{
                height: 4,
                background: "linear-gradient(90deg, #00f5ff, #9d4edd, #00ff88)",
              }}
            />

            <div style={{ padding: "32px 36px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 28 }}>🧠</span>
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: '"Fira Code", monospace',
                    color: "#c77dff",
                    background: "rgba(157,78,221,0.1)",
                    padding: "2px 8px",
                    borderRadius: 4,
                  }}
                >
                  AI-NATIVE EDITION
                </span>
              </div>

              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#e2e8f0",
                  fontFamily: '"Syne", sans-serif',
                  margin: "0 0 8px",
                }}
              >
                SysDesign Simulator
              </h1>
              <p
                style={{
                  fontSize: 14,
                  color: "#94a3b8",
                  lineHeight: 1.7,
                  fontFamily: '"Inter", sans-serif',
                  margin: "0 0 24px",
                }}
              >
                Build real system architectures. Connect components. Watch them
                behave. Break them on purpose.
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                {[
                  {
                    icon: "🏗️",
                    text: "Drag & drop infrastructure components onto a live canvas",
                  },
                  {
                    icon: "⚡",
                    text: "Design AI systems — LLMs, RAG Pipelines, Agent Orchestrators",
                  },
                  {
                    icon: "📊",
                    text: "See real-time metrics: latency, throughput, GPU pressure",
                  },
                  {
                    icon: "✅",
                    text: "Validate your architecture with a scored correctness report",
                  },
                  {
                    icon: "🤖",
                    text: "AI Advisor analyses your design like a senior engineer",
                  },
                ].map((f) => (
                  <div
                    key={f.icon}
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <span style={{ fontSize: 18 }}>{f.icon}</span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "#cbd5e1",
                        fontFamily: '"Inter", sans-serif',
                      }}
                    >
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={startTour}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: 8,
                    background: "rgba(0,245,255,0.15)",
                    border: "1px solid rgba(0,245,255,0.3)",
                    color: "#00f5ff",
                    fontFamily: '"Syne", sans-serif',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Take the Tour (2 min) →
                </button>
                <button
                  onClick={skipOnboarding}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#94a3b8",
                    fontFamily: '"Syne", sans-serif',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Skip — Jump straight in
                </button>
              </div>

              <p
                style={{
                  marginTop: 16,
                  fontSize: 12,
                  color: "#475569",
                  fontFamily: '"Fira Code", monospace',
                  textAlign: "center",
                }}
              >
                Tip: Hover over anything in the app to see what it does.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SPOTLIGHT TOUR */}
      {showTour && spotlightRect && (
        <>
          {/* Dark overlay with cutout */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99990,
              background: "rgba(5, 13, 26, 0.82)",
              clipPath: `polygon(
                0% 0%, 100% 0%, 100% 100%, 0% 100%,
                0% ${spotlightRect.top - 8}px,
                ${spotlightRect.left - 8}px ${spotlightRect.top - 8}px,
                ${spotlightRect.left - 8}px ${spotlightRect.bottom + 8}px,
                ${spotlightRect.right + 8}px ${spotlightRect.bottom + 8}px,
                ${spotlightRect.right + 8}px ${spotlightRect.top - 8}px,
                0% ${spotlightRect.top - 8}px
              )`,
              pointerEvents: "none",
            }}
          />
          {/* Spotlight border glow */}
          <div
            style={{
              position: "fixed",
              zIndex: 99991,
              top: spotlightRect.top - 8,
              left: spotlightRect.left - 8,
              width: spotlightRect.width + 16,
              height: spotlightRect.height + 16,
              border: "2px solid #00f5ff",
              borderRadius: 10,
              boxShadow:
                "0 0 0 4px rgba(0,245,255,0.15), 0 0 24px rgba(0,245,255,0.4)",
              pointerEvents: "none",
              animation: "tourPulse 2s ease-in-out infinite",
            }}
          />
          {/* Step callout card */}
          <TourCallout
            step={TOUR_STEPS[stepIndex]}
            stepIndex={stepIndex}
            totalSteps={TOUR_STEPS.length}
            spotlightRect={spotlightRect}
            onNext={nextStep}
            onPrev={prevStep}
            onSkip={skipOnboarding}
          />
        </>
      )}

      <style>{`
        @keyframes tourPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(0,245,255,0.15), 0 0 24px rgba(0,245,255,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(0,245,255,0.05), 0 0 40px rgba(0,245,255,0.6); }
        }
      `}</style>
    </>,
    document.body
  );
}

interface TourCalloutProps {
  step: (typeof TOUR_STEPS)[number];
  stepIndex: number;
  totalSteps: number;
  spotlightRect: DOMRect;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

function TourCallout({
  step,
  stepIndex,
  totalSteps,
  spotlightRect,
  onNext,
  onPrev,
  onSkip,
}: TourCalloutProps) {
  const CARD_WIDTH = 320;
  const CARD_HEIGHT = 200;
  const MARGIN = 24;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top: number, left: number;
  if (step.position === "right") {
    top = spotlightRect.top;
    left = spotlightRect.right + MARGIN;
  } else if (step.position === "left") {
    top = spotlightRect.top;
    left = spotlightRect.left - CARD_WIDTH - MARGIN;
  } else if (step.position === "bottom") {
    top = spotlightRect.bottom + MARGIN;
    left = spotlightRect.left + spotlightRect.width / 2 - CARD_WIDTH / 2;
  } else {
    top = spotlightRect.top - CARD_HEIGHT - MARGIN;
    left = spotlightRect.left + spotlightRect.width / 2 - CARD_WIDTH / 2;
  }

  // Clamp to viewport
  top = Math.max(16, Math.min(top, vh - CARD_HEIGHT - 16));
  left = Math.max(16, Math.min(left, vw - CARD_WIDTH - 16));

  return (
    <div
      style={{
        position: "fixed",
        top,
        left,
        width: CARD_WIDTH,
        zIndex: 99995,
        background: "#0a1628",
        border: "1px solid rgba(0,245,255,0.2)",
        borderRadius: 12,
        padding: "20px 24px",
        boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 20px rgba(0,245,255,0.15)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontFamily: '"Fira Code", monospace',
          color: "#475569",
          marginBottom: 8,
        }}
      >
        {stepIndex + 1} / {totalSteps}
      </div>
      <h3
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#e2e8f0",
          fontFamily: '"Syne", sans-serif',
          margin: "0 0 8px",
        }}
      >
        {step.title}
      </h3>
      <p
        style={{
          fontSize: 13,
          color: "#94a3b8",
          lineHeight: 1.7,
          fontFamily: '"Inter", sans-serif',
          margin: 0,
        }}
      >
        {step.body}
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 16,
        }}
      >
        {stepIndex > 0 && (
          <button
            onClick={onPrev}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#94a3b8",
              fontFamily: '"Syne", sans-serif',
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
        )}
        <button
          onClick={onSkip}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            background: "transparent",
            border: "none",
            color: "#475569",
            fontFamily: '"Fira Code", monospace',
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Skip tour
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={onNext}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            background: "rgba(0,245,255,0.15)",
            border: "1px solid rgba(0,245,255,0.3)",
            color: "#00f5ff",
            fontFamily: '"Syne", sans-serif',
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {stepIndex === totalSteps - 1 ? "Start Building ✓" : "Next →"}
        </button>
      </div>
    </div>
  );
}
