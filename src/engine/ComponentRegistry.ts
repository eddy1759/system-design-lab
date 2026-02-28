import type { ComponentDefinition } from "../types/components";
import { COMPONENT_MAP } from "../constants/componentDefinitions";

export {
  COMPONENT_MAP,
  COMPONENT_DEFINITIONS,
  getComponentDefinition,
  getComponentsByCategory,
} from "../constants/componentDefinitions";

export function getDefinition(type: string): ComponentDefinition {
  const def = COMPONENT_MAP.get(type as never);
  if (!def) throw new Error(`Unknown component type: ${type}`);
  return def;
}
