import React, { lazy, Suspense, useEffect } from "react";
import { useSimulation } from "./hooks/useSimulation";
import { useUIStore } from "./store/uiStore";
import { useCanvasStore } from "./store/canvasStore";
import { ShareEncoder } from "./utils/ShareEncoder";

// Layout
import SystemHealthBar from "./components/topbar/SystemHealthBar";
import ComponentLibrary from "./components/sidebar/ComponentLibrary";
import SystemCanvas from "./components/canvas/SystemCanvas";
import MetricsPanel from "./components/metrics/MetricsPanel";
import ComponentDetailDrawer from "./components/detail/ComponentDetailDrawer";
import ScenarioBar from "./components/scenarios/ScenarioBar";
import ConceptOverlay from "./components/learning/ConceptOverlay";
import LoadControls from "./components/controls/LoadControls";
import TemplateMenu from "./components/templates/TemplateMenu";
import AIAdvisorPanel from "./components/ai-advisor/AIAdvisorPanel";
import { OnboardingManager } from "./components/onboarding/OnboardingManager";
import { ValidationReportModal } from "./components/validation/ValidationReportModal";
import { ToastContainer } from "./components/shared/Toast";

// Lazy-load Three.js canvas to avoid large bundle impact when unused
const ThreeCanvas = lazy(() => import("./components/canvas/ThreeCanvas"));

const App: React.FC = () => {
  // Start the simulation loop
  useSimulation();

  const is3DMode = useUIStore((s) => s.is3DMode);

  // Load shared architecture from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const archParam = params.get("arch");
    if (archParam) {
      const decoded = ShareEncoder.decode(archParam);
      if (decoded) {
        useCanvasStore.getState().loadNodes(decoded.nodes, decoded.edges);
        // Clean URL without reloading page
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-bg-primary overflow-hidden">
      {/* Dot grid overlay */}
      <div className="dot-grid-overlay" />

      {/* Top bar */}
      <SystemHealthBar />

      {/* Scenario bar */}
      <ScenarioBar />

      {/* Template bar */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-white/5 bg-bg-surface/50">
        <TemplateMenu />
        <div className="h-4 w-px bg-white/10" />
        <span className="text-xs text-white/30 font-body">
          Drag components from sidebar or select a template to start
        </span>
      </div>

      {/* Main area: sidebar + canvas + metrics */}
      <div className="flex flex-1 min-h-0 relative">
        <ComponentLibrary />

        {/* Canvas — 2D or 3D */}
        {is3DMode ? (
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center text-white/30 font-mono text-sm">
                Loading 3D Mode…
              </div>
            }
          >
            <ThreeCanvas />
          </Suspense>
        ) : (
          <SystemCanvas />
        )}

        {/* Metrics Panel */}
        <MetricsPanel />

        {/* Detail Drawer (absolute bottom) */}
        <ComponentDetailDrawer />

        {/* AI Advisor Panel */}
        <AIAdvisorPanel />
      </div>

      {/* Bottom controls */}
      <LoadControls />

      {/* Overlays */}
      <ConceptOverlay />
      <OnboardingManager />
      <ValidationReportModal />
      <ToastContainer />
    </div>
  );
};

export default App;
