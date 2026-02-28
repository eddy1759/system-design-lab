import { useCallback } from "react";
import type { ComponentType } from "../types/components";
import { isAIComponentType } from "../types/components";
import { useCanvasStore } from "../store/canvasStore";
import { useSimulationStore } from "../store/simulationStore";
import { COMPONENT_MAP } from "../constants/componentDefinitions";

/**
 * Hook for drag-and-drop from sidebar to canvas.
 * Reads component type from dataTransfer (not ref) and uses
 * screenToFlowPosition correctly with raw clientX/clientY.
 */
export function useDragDrop() {
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (
      e: React.DragEvent,
      screenToFlowPosition: (pos: { x: number; y: number }) => {
        x: number;
        y: number;
      }
    ) => {
      e.preventDefault();

      // Read type from dataTransfer — the correct approach
      const type =
        e.dataTransfer.getData("application/reactflow") ||
        e.dataTransfer.getData("text/plain");
      if (!type) return;

      // Validate the type exists in our definitions
      const def = COMPONENT_MAP.get(type as ComponentType);
      if (!def) {
        console.warn(`[DragDrop] Unknown component type: "${type}"`);
        return;
      }

      // Use raw clientX/clientY — screenToFlowPosition handles the conversion
      const position = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      const isAI = isAIComponentType(type);

      useCanvasStore.getState().addNode(type as ComponentType, position, isAI);
    },
    []
  );

  return { onDragOver, onDrop };
}
