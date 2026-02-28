import React, { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Triangle,
  Sliders,
  GitBranch,
  LayoutGrid,
  Network,
  AlertOctagon,
} from "lucide-react";
import { useUIStore } from "../../store/uiStore";

interface ConceptCardData {
  id: string;
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}

const concepts: ConceptCardData[] = [
  {
    id: "cap",
    icon: <Triangle className="w-5 h-5" />,
    title: "CAP Theorem",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-white/60">
          The CAP theorem states that a distributed data store can only provide
          two of three guarantees simultaneously:
        </p>
        <div className="flex justify-center py-4">
          <svg viewBox="0 0 300 260" className="w-64 h-56">
            <polygon
              points="150,20 30,240 270,240"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="2"
            />
            <circle
              cx="150"
              cy="20"
              r="30"
              fill="rgba(0,245,255,0.1)"
              stroke="#00f5ff"
              strokeWidth="1.5"
            />
            <text
              x="150"
              y="15"
              textAnchor="middle"
              fill="#00f5ff"
              fontSize="10"
              fontFamily="Syne"
            >
              Consistency
            </text>
            <text
              x="150"
              y="28"
              textAnchor="middle"
              fill="rgba(255,255,255,0.4)"
              fontSize="8"
              fontFamily="Fira Code"
            >
              Every read gets latest write
            </text>
            <circle
              cx="30"
              cy="240"
              r="30"
              fill="rgba(0,255,136,0.1)"
              stroke="#00ff88"
              strokeWidth="1.5"
            />
            <text
              x="30"
              y="235"
              textAnchor="middle"
              fill="#00ff88"
              fontSize="10"
              fontFamily="Syne"
            >
              Availability
            </text>
            <text
              x="30"
              y="248"
              textAnchor="middle"
              fill="rgba(255,255,255,0.4)"
              fontSize="8"
              fontFamily="Fira Code"
            >
              Every request gets response
            </text>
            <circle
              cx="270"
              cy="240"
              r="30"
              fill="rgba(157,78,221,0.1)"
              stroke="#9d4edd"
              strokeWidth="1.5"
            />
            <text
              x="270"
              y="235"
              textAnchor="middle"
              fill="#9d4edd"
              fontSize="10"
              fontFamily="Syne"
            >
              Partition
            </text>
            <text
              x="270"
              y="248"
              textAnchor="middle"
              fill="rgba(255,255,255,0.4)"
              fontSize="8"
              fontFamily="Fira Code"
            >
              Tolerance
            </text>
            {/* Edge labels */}
            <text
              x="80"
              y="125"
              textAnchor="middle"
              fill="#ffb800"
              fontSize="9"
              fontFamily="Syne"
              transform="rotate(-60, 80, 125)"
            >
              CA
            </text>
            <text
              x="220"
              y="125"
              textAnchor="middle"
              fill="#ffb800"
              fontSize="9"
              fontFamily="Syne"
              transform="rotate(60, 220, 125)"
            >
              CP
            </text>
            <text
              x="150"
              y="255"
              textAnchor="middle"
              fill="#ffb800"
              fontSize="9"
              fontFamily="Syne"
            >
              AP
            </text>
          </svg>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-accent-cyan/5 border border-accent-cyan/10 rounded-lg p-3">
            <h4 className="text-xs font-heading font-bold text-accent-cyan mb-1">
              CP Systems
            </h4>
            <p className="text-[10px] text-white/40">
              PostgreSQL, MySQL, HBase
            </p>
            <p className="text-[10px] text-white/50 mt-1">
              Sacrifices availability for consistency during partitions.
            </p>
          </div>
          <div className="bg-accent-green/5 border border-accent-green/10 rounded-lg p-3">
            <h4 className="text-xs font-heading font-bold text-accent-green mb-1">
              AP Systems
            </h4>
            <p className="text-[10px] text-white/40">
              Cassandra, DynamoDB, CouchDB
            </p>
            <p className="text-[10px] text-white/50 mt-1">
              Stays available but may return stale data during partitions.
            </p>
          </div>
          <div className="bg-accent-amber/5 border border-accent-amber/10 rounded-lg p-3">
            <h4 className="text-xs font-heading font-bold text-accent-amber mb-1">
              CA Systems
            </h4>
            <p className="text-[10px] text-white/40">
              Traditional RDBMS (single node)
            </p>
            <p className="text-[10px] text-white/50 mt-1">
              Not partition tolerant — only works in a single datacenter.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "consistency",
    icon: <Sliders className="w-5 h-5" />,
    title: "Consistency Models",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-white/60">
          Consistency models define the contract between a data store and its
          clients regarding when changes become visible.
        </p>
        <div className="relative h-16 bg-bg-elevated rounded-xl border border-white/10 px-6 flex items-center">
          <div className="absolute inset-x-6 top-1/2 h-px bg-white/10" />
          <div className="absolute left-6 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent-green border-2 border-accent-green/30" />
          <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-accent-amber border-2 border-accent-amber/30" />
          <div className="absolute right-6 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent-red border-2 border-accent-red/30" />
          <span className="absolute left-6 top-2 text-[9px] font-mono text-accent-green">
            Eventual
          </span>
          <span className="absolute left-1/2 -translate-x-1/2 top-2 text-[9px] font-mono text-accent-amber">
            Causal
          </span>
          <span className="absolute right-6 top-2 text-[9px] font-mono text-accent-red">
            Strong
          </span>
          <span className="absolute left-6 bottom-2 text-[8px] font-mono text-white/30">
            Low latency
          </span>
          <span className="absolute right-6 bottom-2 text-[8px] font-mono text-white/30">
            High latency
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-[10px]">
          <div className="bg-accent-green/5 border border-accent-green/10 rounded-lg p-3">
            <h4 className="font-heading font-bold text-accent-green mb-1">
              Eventual
            </h4>
            <p className="text-white/40">
              Replicas converge over time. Reads may return stale data. Best for
              high availability.
            </p>
          </div>
          <div className="bg-accent-amber/5 border border-accent-amber/10 rounded-lg p-3">
            <h4 className="font-heading font-bold text-accent-amber mb-1">
              Causal
            </h4>
            <p className="text-white/40">
              Causally related operations are seen in order. Concurrent writes
              may diverge.
            </p>
          </div>
          <div className="bg-accent-red/5 border border-accent-red/10 rounded-lg p-3">
            <h4 className="font-heading font-bold text-accent-red mb-1">
              Strong
            </h4>
            <p className="text-white/40">
              Every read returns the latest write. Higher latency. Required for
              financial transactions.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "replication",
    icon: <GitBranch className="w-5 h-5" />,
    title: "Replication Patterns",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-white/60">
          Data replication strategies determine how data is copied across nodes
          for availability and performance.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-bg-elevated rounded-lg border border-white/10 p-3">
            <h4 className="text-xs font-heading font-bold text-accent-cyan mb-2">
              Leader-Follower
            </h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-accent-cyan/20 border border-accent-cyan/30 flex items-center justify-center text-[8px] font-mono text-accent-cyan">
                  W
                </div>
                <span className="text-[9px] text-white/30">
                  → writes only to leader
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[8px] font-mono text-white/40">
                  R
                </div>
                <span className="text-[9px] text-white/30">
                  → reads from followers
                </span>
              </div>
            </div>
            <p className="text-[9px] text-white/30 mt-2">
              Used by: PostgreSQL, MySQL
            </p>
          </div>
          <div className="bg-bg-elevated rounded-lg border border-white/10 p-3">
            <h4 className="text-xs font-heading font-bold text-accent-amber mb-2">
              Multi-Leader
            </h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-accent-amber/20 border border-accent-amber/30 flex items-center justify-center text-[8px] font-mono text-accent-amber">
                  W
                </div>
                <span className="text-[9px] text-white/30">
                  → writes to any node
                </span>
              </div>
              <div className="flex items-center gap-2 text-[9px] text-accent-red/60">
                ⚠️ Conflict resolution needed
              </div>
            </div>
            <p className="text-[9px] text-white/30 mt-2">
              Used by: CouchDB, Galera
            </p>
          </div>
          <div className="bg-bg-elevated rounded-lg border border-white/10 p-3">
            <h4 className="text-xs font-heading font-bold text-accent-green mb-2">
              Leaderless
            </h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-accent-green/20 border border-accent-green/30 flex items-center justify-center text-[8px] font-mono text-accent-green">
                  RW
                </div>
                <span className="text-[9px] text-white/30">
                  → quorum-based R/W
                </span>
              </div>
            </div>
            <p className="text-[9px] text-white/30 mt-2">
              Used by: Cassandra, DynamoDB
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "sharding",
    icon: <LayoutGrid className="w-5 h-5" />,
    title: "Sharding Strategies",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-white/60">
          Sharding distributes data across multiple database instances to handle
          datasets larger than a single machine.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-bg-elevated rounded-lg border border-white/10 p-3">
            <h4 className="text-xs font-heading font-bold text-accent-cyan mb-2">
              Hash-Based
            </h4>
            <p className="text-[10px] text-white/40 mb-2">
              shard = hash(key) % N
            </p>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex-1 h-4 rounded bg-accent-cyan/10 border border-accent-cyan/20"
                />
              ))}
            </div>
            <p className="text-[9px] text-accent-green mt-2">
              ✓ Even distribution
            </p>
            <p className="text-[9px] text-accent-red">✗ Hard to reshard</p>
          </div>
          <div className="bg-bg-elevated rounded-lg border border-white/10 p-3">
            <h4 className="text-xs font-heading font-bold text-accent-amber mb-2">
              Range-Based
            </h4>
            <p className="text-[10px] text-white/40 mb-2">
              A-F → shard 1, G-M → shard 2...
            </p>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex-1 h-4 rounded bg-accent-amber/10 border border-accent-amber/20"
                  style={{ opacity: 0.3 + i * 0.2 }}
                />
              ))}
            </div>
            <p className="text-[9px] text-accent-green mt-2">
              ✓ Range queries efficient
            </p>
            <p className="text-[9px] text-accent-red">✗ Hot spots possible</p>
          </div>
          <div className="bg-bg-elevated rounded-lg border border-white/10 p-3">
            <h4 className="text-xs font-heading font-bold text-accent-purple mb-2">
              Directory-Based
            </h4>
            <p className="text-[10px] text-white/40 mb-2">
              Lookup table maps keys → shards
            </p>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex-1 h-4 rounded bg-accent-purple/10 border border-accent-purple/20"
                />
              ))}
            </div>
            <p className="text-[9px] text-accent-green mt-2">✓ Flexible</p>
            <p className="text-[9px] text-accent-red">✗ Lookup overhead</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "pacelc",
    icon: <Network className="w-5 h-5" />,
    title: "PACELC Theorem",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-white/60">
          PACELC extends CAP: if there IS a Partition, choose A or C; ELSE (no
          partition), choose Latency or Consistency.
        </p>
        <div className="bg-bg-elevated rounded-xl border border-white/10 p-4">
          <div className="text-center text-sm font-mono text-white/70 mb-3">
            <span className="text-accent-cyan">P</span>artition →
            <span className="text-accent-green"> A</span>vailability or
            <span className="text-accent-red"> C</span>onsistency ;
            <span className="text-accent-amber"> E</span>lse →
            <span className="text-accent-green"> L</span>atency or
            <span className="text-accent-red"> C</span>onsistency
          </div>
          <div className="grid grid-cols-2 gap-3 text-[10px]">
            <div className="bg-accent-green/5 border border-accent-green/10 rounded p-2">
              <span className="font-heading font-bold text-accent-green">
                PA/EL
              </span>
              <p className="text-white/40 mt-1">
                Cassandra, DynamoDB — always choose availability and low latency
              </p>
            </div>
            <div className="bg-accent-red/5 border border-accent-red/10 rounded p-2">
              <span className="font-heading font-bold text-accent-red">
                PC/EC
              </span>
              <p className="text-white/40 mt-1">
                PostgreSQL, HBase — always choose consistency
              </p>
            </div>
            <div className="bg-accent-amber/5 border border-accent-amber/10 rounded p-2">
              <span className="font-heading font-bold text-accent-amber">
                PA/EC
              </span>
              <p className="text-white/40 mt-1">
                MongoDB (default) — available during partition, consistent
                otherwise
              </p>
            </div>
            <div className="bg-accent-purple/5 border border-accent-purple/10 rounded p-2">
              <span className="font-heading font-bold text-accent-purple">
                PC/EL
              </span>
              <p className="text-white/40 mt-1">
                Rare — consistent during partition, low latency otherwise
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "failures",
    icon: <AlertOctagon className="w-5 h-5" />,
    title: "Failure Modes",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-white/60">
          Understanding failure modes is critical for building resilient
          distributed systems.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-bg-elevated rounded-lg border border-white/10 p-3">
            <h4 className="text-xs font-heading font-bold text-accent-red mb-2">
              Cascade Failure
            </h4>
            <p className="text-[10px] text-white/40 mb-2">
              When one component fails and overloads others, causing a chain
              reaction of failures.
            </p>
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded bg-accent-green/20 border border-accent-green/30 text-[7px] text-center leading-5 font-mono">
                OK
              </div>
              <span className="text-white/20">→</span>
              <div className="w-5 h-5 rounded bg-accent-red/20 border border-accent-red/30 text-[7px] text-center leading-5 font-mono">
                💀
              </div>
              <span className="text-white/20">→</span>
              <div className="w-5 h-5 rounded bg-accent-red/20 border border-accent-red/30 text-[7px] text-center leading-5 font-mono">
                💀
              </div>
              <span className="text-white/20">→</span>
              <div className="w-5 h-5 rounded bg-accent-red/20 border border-accent-red/30 text-[7px] text-center leading-5 font-mono">
                💀
              </div>
            </div>
          </div>
          <div className="bg-bg-elevated rounded-lg border border-white/10 p-3">
            <h4 className="text-xs font-heading font-bold text-accent-green mb-2">
              Circuit Breaker
            </h4>
            <p className="text-[10px] text-white/40 mb-2">
              Stops calling a failing service to let it recover. Three states:
              Closed → Open → Half-Open.
            </p>
            <div className="flex items-center gap-1">
              <div className="px-1.5 py-0.5 rounded bg-accent-green/10 border border-accent-green/20 text-[8px] font-mono text-accent-green">
                Closed
              </div>
              <span className="text-white/20">→</span>
              <div className="px-1.5 py-0.5 rounded bg-accent-red/10 border border-accent-red/20 text-[8px] font-mono text-accent-red">
                Open
              </div>
              <span className="text-white/20">→</span>
              <div className="px-1.5 py-0.5 rounded bg-accent-amber/10 border border-accent-amber/20 text-[8px] font-mono text-accent-amber">
                Half
              </div>
            </div>
          </div>
          <div className="bg-bg-elevated rounded-lg border border-white/10 p-3">
            <h4 className="text-xs font-heading font-bold text-accent-amber mb-2">
              Thundering Herd
            </h4>
            <p className="text-[10px] text-white/40">
              Many clients retry simultaneously after a failure, overwhelming
              the recovering service.
            </p>
          </div>
          <div className="bg-bg-elevated rounded-lg border border-white/10 p-3">
            <h4 className="text-xs font-heading font-bold text-accent-purple mb-2">
              Split Brain
            </h4>
            <p className="text-[10px] text-white/40">
              Network partition causes two groups of nodes to think they're the
              leader, causing data divergence.
            </p>
          </div>
        </div>
      </div>
    ),
  },
];

const ConceptOverlay: React.FC = () => {
  const learnOverlayOpen = useUIStore((s) => s.learnOverlayOpen);
  const setLearnOverlay = useUIStore((s) => s.setLearnOverlay);
  const activeCard = useUIStore((s) => s.activeConceptCard);
  const setActiveCard = useUIStore((s) => s.setActiveConceptCard);

  const handleClose = useCallback(() => {
    setActiveCard(null);
    setLearnOverlay(false);
  }, [setActiveCard, setLearnOverlay]);

  if (!learnOverlayOpen) return null;

  const activeConcept = concepts.find((c) => c.id === activeCard);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-bg-primary/90 backdrop-blur-lg flex"
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-5 h-5 text-white/60" />
        </button>

        {/* Concept nav */}
        <div className="w-64 border-r border-white/5 p-4 space-y-2">
          <h2 className="text-sm font-heading font-bold text-white/90 mb-4">
            📚 Concepts
          </h2>
          {concepts.map((concept) => (
            <button
              key={concept.id}
              onClick={() => setActiveCard(concept.id)}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left
                transition-colors
                ${
                  activeCard === concept.id
                    ? "bg-accent-purple/15 text-accent-purple border border-accent-purple/30"
                    : "text-white/50 hover:bg-white/5 hover:text-white/70 border border-transparent"
                }
              `}
            >
              <span className="flex-shrink-0">{concept.icon}</span>
              <span className="text-xs font-heading font-bold">
                {concept.title}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeConcept ? (
            <motion.div
              key={activeConcept.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto"
            >
              <h1 className="text-2xl font-heading font-bold text-white mb-6">
                {activeConcept.title}
              </h1>
              {activeConcept.content}
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-full text-white/20 text-sm font-mono">
              Select a concept from the left to learn.
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ConceptOverlay;
