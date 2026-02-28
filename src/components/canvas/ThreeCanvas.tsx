import React, { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useCanvasStore } from "../../store/canvasStore";

/**
 * 3D visualization of the system architecture using Three.js.
 * AI nodes use distinctive geometries; classical nodes are boxes.
 */
const ThreeCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);

  const getNodeColor = useCallback((node: any): number => {
    if (node.data?.isFailed) return 0xff3860;
    if (node.data?.isAI) {
      const type = node.data.componentType;
      if (
        type === "llm-inference" ||
        type === "prompt-cache" ||
        type === "model-router"
      )
        return 0xffd60a;
      if (type === "rag-pipeline") return 0x00ff88;
      if (
        type === "agent-orchestrator" ||
        type === "tool-executor" ||
        type === "llm-observability"
      )
        return 0x00f5ff;
      if (type === "guardrails" || type === "drift-detector") return 0xff3860;
      if (type === "training-cluster") return 0xffb800;
      return 0xc77dff; // default AI violet
    }
    const cat = node.data?.componentType;
    if (!cat) return 0x00f5ff;
    if (["web-client", "mobile-client", "api-consumer"].includes(cat))
      return 0x00f5ff;
    if (
      [
        "load-balancer",
        "api-gateway",
        "cdn",
        "reverse-proxy",
        "dns-server",
      ].includes(cat)
    )
      return 0x00ff88;
    if (
      [
        "web-server",
        "microservice",
        "serverless-function",
        "container-pod",
      ].includes(cat)
    )
      return 0xffb800;
    if (
      [
        "postgresql",
        "mysql",
        "mongodb",
        "cassandra",
        "dynamodb",
        "redis-cache",
        "memcached",
        "object-storage",
        "data-warehouse",
      ].includes(cat)
    )
      return 0x9d4edd;
    if (["message-queue", "event-stream", "pub-sub"].includes(cat))
      return 0xff3860;
    return 0x00f5ff;
  }, []);

  const createNodeMesh = useCallback(
    (node: any): THREE.Object3D => {
      const color = getNodeColor(node);
      const isAI = node.data?.isAI;

      if (!isAI) {
        const geo = new THREE.BoxGeometry(2, 1, 1.5);
        const mat = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.2,
          metalness: 0.7,
          roughness: 0.3,
        });
        return new THREE.Mesh(geo, mat);
      }

      const type = node.data.componentType;

      switch (type) {
        case "llm-inference": {
          const geo = new THREE.IcosahedronGeometry(1, 1);
          const mat = new THREE.MeshStandardMaterial({
            color: 0xffd60a,
            emissive: 0xffd60a,
            emissiveIntensity: 0.4,
            metalness: 0.3,
            roughness: 0.4,
          });
          const group = new THREE.Group();
          group.add(new THREE.Mesh(geo, mat));
          group.add(new THREE.PointLight(0xffd60a, 2, 5));
          return group;
        }

        case "vector-database": {
          const group = new THREE.Group();
          const coreMat = new THREE.MeshStandardMaterial({
            color: 0xc77dff,
            emissive: 0xc77dff,
            emissiveIntensity: 0.3,
          });
          group.add(
            new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), coreMat)
          );
          const orbitMat = new THREE.MeshStandardMaterial({
            color: 0x9d4edd,
            emissive: 0x9d4edd,
            emissiveIntensity: 0.5,
          });
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const small = new THREE.Mesh(
              new THREE.SphereGeometry(0.2, 8, 8),
              orbitMat
            );
            small.position.set(
              Math.cos(angle) * 1.2,
              Math.sin(angle) * 0.3,
              Math.sin(angle) * 1.2
            );
            group.add(small);
          }
          return group;
        }

        case "agent-orchestrator": {
          const group = new THREE.Group();
          const coreMat = new THREE.MeshStandardMaterial({
            color: 0x00f5ff,
            emissive: 0x00f5ff,
            emissiveIntensity: 0.4,
            wireframe: true,
          });
          group.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.8), coreMat));
          const agentMat = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            emissive: 0x00ff88,
            emissiveIntensity: 0.3,
          });
          for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const sat = new THREE.Mesh(
              new THREE.BoxGeometry(0.4, 0.4, 0.4),
              agentMat
            );
            sat.position.set(Math.cos(angle) * 1.5, 0, Math.sin(angle) * 1.5);
            group.add(sat);
          }
          return group;
        }

        case "rag-pipeline": {
          const geo = new THREE.TorusGeometry(0.7, 0.25, 8, 20);
          const mat = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            emissive: 0x00ff88,
            emissiveIntensity: 0.3,
            metalness: 0.5,
          });
          return new THREE.Mesh(geo, mat);
        }

        case "training-cluster": {
          const group = new THREE.Group();
          const gpuMat = new THREE.MeshStandardMaterial({
            color: 0xffb800,
            emissive: 0xffb800,
            emissiveIntensity: 0.4,
          });
          for (let x = 0; x < 3; x++) {
            for (let z = 0; z < 3; z++) {
              const gpu = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.3, 0.4),
                gpuMat
              );
              gpu.position.set((x - 1) * 0.6, 0, (z - 1) * 0.6);
              group.add(gpu);
            }
          }
          return group;
        }

        default: {
          const geo = new THREE.CylinderGeometry(0.6, 0.8, 1, 8);
          const mat = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.3,
          });
          return new THREE.Mesh(geo, mat);
        }
      }
    },
    [getNodeColor]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050d1a);

    const rect = container.getBoundingClientRect();
    const camera = new THREE.PerspectiveCamera(
      60,
      rect.width / rect.height,
      0.1,
      1000
    );
    camera.position.set(0, 8, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(rect.width, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0x334466, 2.0);
    const dirLight = new THREE.DirectionalLight(0x00f5ff, 3.0);
    dirLight.position.set(10, 10, 5);
    scene.add(ambient, dirLight);

    // Grid
    const grid = new THREE.GridHelper(40, 40, 0x0a1628, 0x0a1628);
    scene.add(grid);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1;

    // Create node meshes
    const nodeMeshMap = new Map<string, THREE.Object3D>();
    nodes.forEach((node) => {
      const mesh = createNodeMesh(node);
      mesh.position.set(node.position.x / 60, 0, node.position.y / 60);
      mesh.userData = { nodeId: node.id, isAI: node.data.isAI };
      scene.add(mesh);
      nodeMeshMap.set(node.id, mesh);
    });

    // Create edge tubes
    edges.forEach((edge) => {
      const sourceMesh = nodeMeshMap.get(edge.source);
      const targetMesh = nodeMeshMap.get(edge.target);
      if (!sourceMesh || !targetMesh) return;

      const isAIEdge = edge.data?.isAIEdge;
      const start = sourceMesh.position.clone();
      const end = targetMesh.position.clone();
      const mid = start.clone().add(end).multiplyScalar(0.5);
      mid.y += 1;

      const curve = new THREE.CatmullRomCurve3([start, mid, end]);
      const tubeGeo = new THREE.TubeGeometry(
        curve,
        20,
        isAIEdge ? 0.08 : 0.04,
        6,
        false
      );
      const tubeMat = new THREE.MeshBasicMaterial({
        color: isAIEdge ? 0xc77dff : 0x00f5ff,
        transparent: true,
        opacity: isAIEdge ? 0.8 : 0.5,
      });
      scene.add(new THREE.Mesh(tubeGeo, tubeMat));
    });

    // Labels
    // Using canvas-rendered sprites for node labels
    nodes.forEach((node) => {
      const mesh = nodeMeshMap.get(node.id);
      if (!mesh) return;

      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(0, 0, 256, 64);
      ctx.font = "bold 20px sans-serif";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.fillText(node.data.config.label, 128, 40);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(mesh.position.x, 1.5, mesh.position.z);
      sprite.scale.set(3, 0.75, 1);
      scene.add(sprite);
    });

    // Animation loop
    let t = 0;
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      t += 0.01;
      controls.update();

      // Pulse AI nodes
      nodeMeshMap.forEach((mesh, nodeId) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (node?.data.isAI) {
          mesh.rotation.y = t * 0.5;
          const scale = 1 + Math.sin(t * 2) * 0.03;
          mesh.scale.setScalar(scale);
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      const r = container.getBoundingClientRect();
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
      renderer.setSize(r.width, r.height);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    cleanupRef.current = () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };

    return () => {
      cleanupRef.current?.();
    };
  }, [nodes, edges, createNodeMesh]);

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full relative"
      style={{ width: "100%", height: "100%" }}
    >
      <div className="absolute top-3 left-3 z-10 text-[10px] font-mono text-white/30 bg-bg-surface/80 backdrop-blur-sm px-2 py-1 rounded border border-white/5">
        3D Mode · Drag to orbit · Scroll to zoom
      </div>
    </div>
  );
};

export default React.memo(ThreeCanvas);
