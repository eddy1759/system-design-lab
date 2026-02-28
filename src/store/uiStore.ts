import { create } from "zustand";

interface UIStore {
  sidebarOpen: boolean;
  metricsOpen: boolean;
  detailDrawerOpen: boolean;
  learnOverlayOpen: boolean;
  activeConceptCard: string | null;
  is3DMode: boolean;
  activeScenarioId: string | null;
  templateMenuOpen: boolean;
  hintsOpen: boolean;
  exportPanelOpen: boolean;
  narratorOpen: boolean;

  toggleSidebar: () => void;
  toggleMetrics: () => void;
  setDetailDrawer: (open: boolean) => void;
  setLearnOverlay: (open: boolean) => void;
  setActiveConceptCard: (id: string | null) => void;
  set3DMode: (mode: boolean) => void;
  setActiveScenario: (id: string | null) => void;
  setTemplateMenu: (open: boolean) => void;
  setHintsOpen: (open: boolean) => void;
  setExportPanel: (open: boolean) => void;
  toggleNarrator: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  metricsOpen: true,
  detailDrawerOpen: false,
  learnOverlayOpen: false,
  activeConceptCard: null,
  is3DMode: false,
  activeScenarioId: null,
  templateMenuOpen: false,
  hintsOpen: false,
  exportPanelOpen: false,
  narratorOpen: false,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleMetrics: () => set((s) => ({ metricsOpen: !s.metricsOpen })),
  setDetailDrawer: (open) => set({ detailDrawerOpen: open }),
  setLearnOverlay: (open) => set({ learnOverlayOpen: open }),
  setActiveConceptCard: (id) => set({ activeConceptCard: id }),
  set3DMode: (mode) => set({ is3DMode: mode }),
  setActiveScenario: (id) => set({ activeScenarioId: id }),
  setTemplateMenu: (open) => set({ templateMenuOpen: open }),
  setHintsOpen: (open) => set({ hintsOpen: open }),
  setExportPanel: (open) => set({ exportPanelOpen: open }),
  toggleNarrator: () => set((s) => ({ narratorOpen: !s.narratorOpen })),
}));
