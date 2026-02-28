# System Design Learning Platform (AI-Native Edition)

An interactive, visual system design simulator and learning environment built with React. Design, simulate, and export complex cloud architectures featuring both classical computing infrastructure and modern AI/ML pipelines.

![System Design Simulator - Engineering Dark Room Theme](https://i.imgur.com/iDRn0zv.jpeg)



## 🌟 Key Features

### 1. Interactive Architecture Canvas

- **Drag & Drop Editor:** Build complex topologies using a robust toolkit of 30+ components across 6 categories (Compute, Database, Caching, Messaging, Observation, and AI).
- **Intelligent Routing:** Node connections automatically adapt, visually indicating data flow and potential bottlenecks.
- **Dark Room Aesthetic:** A highly polished "Engineering Dark Room" theme with glowing accents, designed for extended focused learning sessions.

### 2. Live Simulation Engine

- **Real-time Metrics:** Adjust the traffic load (req/s) and watch the simulation dynamically calculate Availability, P99 Latency, Component Load, and estimated Monthly Cost.
- **Dynamic Bottleneck Detection:** The engine continuously evaluates component throughput vs. traffic, highlighting single points of failure (SPOFs) and cascading bottlenecks.
- **CAP Theorem Analysis:** Automatically aligns your architecture to CP, AP, or CA models based on your database and caching choices.

### 3. AI-First Components

Unlike traditional diagramming tools, this platform treats AI infrastructure as first-class citizens.

- **LLM Inference Servers** (tracking Time-to-First-Token, GPU Memory Pressure)
- **RAG Pipelines & Vector Databases** (tracking Retrieval Accuracy)
- **Agent Orchestrators** (tracking Agent Step counts)
- **AI Guardrails & Model Routers**

### 4. Context-Aware Architecture Validator

A scale-intelligent validation engine that grades your architecture (A to F) based on current traffic and complexity:

- Doesn't blindly penalize a 100 req/s monolith for lacking multi-AZ read replicas.
- Strictly enforces enterprise patterns (load balancers, caching, strict observability, HA) only at "Scale" or "Enterprise" tiers (50K+ req/s).
- Assesses 6 dimensions: Reliability, Performance, Data Integrity, Security, Observability, and AI Best Practices.

### 5. Infrastructure as Code (IaC) Export

Translate your visual diagram directly into deployable code:

- **Docker Compose:** Generates multi-container local testing environments with automatic volume mapping, dependency resolution (`depends_on`), and sidecar injection (e.g., Zookeeper for Kafka).
- **Terraform (AWS):** Scaffolds production-grade AWS HCL resources (ALB, ECS Fargate, RDS, ElastiCache, MSK, OpenSearch, S3, CloudFront, SageMaker) mapping to your architecture.

### 6. 🎤 The Interview Narrator

Prepare for system design interviews by hearing your architecture explained back to you.

- **Deterministic Storytelling:** Converts the current canvas graph state into a structured, first-person narrative, stepping through the Ingress, Compute, Caching, Database, and Data pipelines.
- **Text-to-Speech:** Uses the browser's Web Speech API to read the explanation aloud like a senior engineer.
- **Tradeoff Highlighting:** Explicitly calls out why certain decisions were made and where the current system falls short (SPOFs, single AZ, missing observability).

### 7. Document & PDF Exporter

Generate a comprehensive, shareable Markdown or printable PDF document detailing:

- Bill of Materials (component count, traffic tiers)
- Network Topology & Flow
- Cost Breakdown
- SLA / SLO Targets

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

---

## 🛠️ Tech Stack

- **Framework:** [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Canvas Engine:** [React Flow](https://reactflow.dev/)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **PDF/Image Generation:** `html-to-image`
- **Language:** [TypeScript](https://www.typescriptlang.org/)

---

---

## 🧪 Educational Philosophy

This simulator isn't just a drawing tool; it is an active feedback loop. When a user drags a Redis Cache in front of a Postgres database, they shouldn't just see a line connect—they should immediately see P99 latency drop, cache hit rates rise, read load on the database fall, and the architecture validator reward them with higher reliability marks.

_"Don't just draw the architecture. Simulate it."_
