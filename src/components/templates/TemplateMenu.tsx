import React, { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutTemplate, ChevronDown, X } from "lucide-react";
import { useCanvasStore } from "../../store/canvasStore";
import type { ComponentType } from "../../types/components";

interface TemplateNode {
  type: ComponentType;
  position: { x: number; y: number };
}
interface TemplateEdge {
  sourceIdx: number;
  targetIdx: number;
}
interface Template {
  name: string;
  description: string;
  nodes: TemplateNode[];
  edges: TemplateEdge[];
}

const templates: Template[] = [
  {
    name: "Monolith",
    description: "Single server + single DB",
    nodes: [
      { type: "web-client", position: { x: 300, y: 50 } },
      { type: "web-server", position: { x: 300, y: 200 } },
      { type: "postgresql", position: { x: 300, y: 380 } },
    ],
    edges: [
      { sourceIdx: 0, targetIdx: 1 },
      { sourceIdx: 1, targetIdx: 2 },
    ],
  },
  {
    name: "Layered Monolith + Cache",
    description: "Server with caching layer",
    nodes: [
      { type: "web-client", position: { x: 300, y: 50 } },
      { type: "load-balancer", position: { x: 300, y: 170 } },
      { type: "web-server", position: { x: 300, y: 300 } },
      { type: "redis-cache", position: { x: 500, y: 400 } },
      { type: "postgresql", position: { x: 300, y: 500 } },
    ],
    edges: [
      { sourceIdx: 0, targetIdx: 1 },
      { sourceIdx: 1, targetIdx: 2 },
      { sourceIdx: 2, targetIdx: 3 },
      { sourceIdx: 2, targetIdx: 4 },
    ],
  },
  {
    name: "Basic Microservices",
    description: "3 services + API Gateway + shared DB",
    nodes: [
      { type: "web-client", position: { x: 300, y: 30 } },
      { type: "api-gateway", position: { x: 300, y: 150 } },
      { type: "microservice", position: { x: 100, y: 300 } },
      { type: "microservice", position: { x: 300, y: 300 } },
      { type: "microservice", position: { x: 500, y: 300 } },
      { type: "postgresql", position: { x: 300, y: 460 } },
    ],
    edges: [
      { sourceIdx: 0, targetIdx: 1 },
      { sourceIdx: 1, targetIdx: 2 },
      { sourceIdx: 1, targetIdx: 3 },
      { sourceIdx: 1, targetIdx: 4 },
      { sourceIdx: 2, targetIdx: 5 },
      { sourceIdx: 3, targetIdx: 5 },
      { sourceIdx: 4, targetIdx: 5 },
    ],
  },
  {
    name: "Event-Driven",
    description: "Services + Kafka + consumers",
    nodes: [
      { type: "web-client", position: { x: 300, y: 30 } },
      { type: "api-gateway", position: { x: 300, y: 140 } },
      { type: "web-server", position: { x: 300, y: 260 } },
      { type: "event-stream", position: { x: 300, y: 390 } },
      { type: "microservice", position: { x: 120, y: 520 } },
      { type: "microservice", position: { x: 480, y: 520 } },
      { type: "postgresql", position: { x: 120, y: 650 } },
      { type: "mongodb", position: { x: 480, y: 650 } },
    ],
    edges: [
      { sourceIdx: 0, targetIdx: 1 },
      { sourceIdx: 1, targetIdx: 2 },
      { sourceIdx: 2, targetIdx: 3 },
      { sourceIdx: 3, targetIdx: 4 },
      { sourceIdx: 3, targetIdx: 5 },
      { sourceIdx: 4, targetIdx: 6 },
      { sourceIdx: 5, targetIdx: 7 },
    ],
  },
  {
    name: "CQRS + Event Sourcing",
    description: "Separate read/write paths",
    nodes: [
      { type: "web-client", position: { x: 300, y: 30 } },
      { type: "load-balancer", position: { x: 300, y: 140 } },
      { type: "web-server", position: { x: 150, y: 270 } },
      { type: "web-server", position: { x: 450, y: 270 } },
      { type: "event-stream", position: { x: 300, y: 400 } },
      { type: "postgresql", position: { x: 150, y: 530 } },
      { type: "redis-cache", position: { x: 450, y: 530 } },
    ],
    edges: [
      { sourceIdx: 0, targetIdx: 1 },
      { sourceIdx: 1, targetIdx: 2 },
      { sourceIdx: 1, targetIdx: 3 },
      { sourceIdx: 2, targetIdx: 4 },
      { sourceIdx: 4, targetIdx: 5 },
      { sourceIdx: 4, targetIdx: 6 },
      { sourceIdx: 3, targetIdx: 6 },
    ],
  },
  {
    name: "Serverless",
    description: "Functions + Object Storage + CDN",
    nodes: [
      { type: "web-client", position: { x: 300, y: 30 } },
      { type: "cdn", position: { x: 300, y: 140 } },
      { type: "api-gateway", position: { x: 300, y: 260 } },
      { type: "serverless-function", position: { x: 150, y: 380 } },
      { type: "serverless-function", position: { x: 450, y: 380 } },
      { type: "dynamodb", position: { x: 300, y: 500 } },
      { type: "object-storage", position: { x: 500, y: 140 } },
    ],
    edges: [
      { sourceIdx: 0, targetIdx: 1 },
      { sourceIdx: 1, targetIdx: 2 },
      { sourceIdx: 2, targetIdx: 3 },
      { sourceIdx: 2, targetIdx: 4 },
      { sourceIdx: 3, targetIdx: 5 },
      { sourceIdx: 4, targetIdx: 5 },
      { sourceIdx: 0, targetIdx: 6 },
    ],
  },
  {
    name: "Multi-Region Active-Active",
    description: "Global deployment with DNS routing",
    nodes: [
      { type: "web-client", position: { x: 300, y: 30 } },
      { type: "dns-server", position: { x: 300, y: 130 } },
      { type: "load-balancer", position: { x: 120, y: 250 } },
      { type: "load-balancer", position: { x: 480, y: 250 } },
      { type: "web-server", position: { x: 120, y: 380 } },
      { type: "web-server", position: { x: 480, y: 380 } },
      { type: "postgresql", position: { x: 120, y: 510 } },
      { type: "postgresql", position: { x: 480, y: 510 } },
    ],
    edges: [
      { sourceIdx: 0, targetIdx: 1 },
      { sourceIdx: 1, targetIdx: 2 },
      { sourceIdx: 1, targetIdx: 3 },
      { sourceIdx: 2, targetIdx: 4 },
      { sourceIdx: 3, targetIdx: 5 },
      { sourceIdx: 4, targetIdx: 6 },
      { sourceIdx: 5, targetIdx: 7 },
    ],
  },
];

const TemplateMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const clearCanvas = useCanvasStore((s) => s.clearCanvas);
  const addNode = useCanvasStore((s) => s.addNode);
  const addEdge = useCanvasStore((s) => s.addEdge);

  const loadTemplate = useCallback(
    (template: Template) => {
      clearCanvas();
      setOpen(false);

      const nodeIds: string[] = [];

      // Stagger-add nodes
      template.nodes.forEach((tn, i) => {
        setTimeout(() => {
          const id = addNode(tn.type, tn.position);
          nodeIds[i] = id;

          // After all nodes are added, create edges
          if (i === template.nodes.length - 1) {
            setTimeout(() => {
              template.edges.forEach((te) => {
                const source = nodeIds[te.sourceIdx];
                const target = nodeIds[te.targetIdx];
                if (source && target) {
                  addEdge({
                    source,
                    target,
                    sourceHandle: null,
                    targetHandle: null,
                  });
                }
              });
            }, 200);
          }
        }, i * 150);
      });
    },
    [clearCanvas, addNode, addEdge]
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-heading font-bold text-white/50 hover:text-white/70 hover:bg-white/5 transition-colors"
      >
        <LayoutTemplate className="w-3.5 h-3.5" />
        Templates
        <ChevronDown className="w-3 h-3" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className="absolute top-full left-0 mt-1 z-40 w-72 bg-bg-surface border border-white/10 rounded-lg shadow-2xl overflow-hidden"
            >
              <div className="px-3 py-2 border-b border-white/5">
                <span className="text-[10px] font-heading font-bold text-white/40 uppercase tracking-wider">
                  Architecture Templates
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {templates.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => loadTemplate(template)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center flex-shrink-0">
                      <LayoutTemplate className="w-4 h-4 text-accent-purple/60" />
                    </div>
                    <div>
                      <p className="text-xs font-heading font-bold text-white/80">
                        {template.name}
                      </p>
                      <p className="text-[10px] text-white/30">
                        {template.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(TemplateMenu);
