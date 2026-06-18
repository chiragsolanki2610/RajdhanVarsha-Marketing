"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";

import Sidebar from "@/components/Sidebar";
import LoginTopbar from "@/components/loginTopbar";

// ── JWT Token Helper ──────────────────────────────────────────────────────────
const getToken = () =>
  localStorage.getItem("token") ??
  sessionStorage.getItem("token") ??
  "";

// --- Custom Styled Node Component ---
const CustomUserNode = ({ data }: { data: any }) => {
  const requirementMet = data.directCount >= 3;

  return (
    <div className={`select-text p-4 rounded-xl shadow-lg border-2 w-72 bg-white transition-all ${
      requirementMet ? "border-green-500 shadow-green-100" : "border-amber-500 shadow-amber-100"
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Level {data.level}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            requirementMet ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}>
            {requirementMet ? "Withdrawal Active" : "Locked (Min 3 Directs)"}
          </span>
        </div>

        <h3 className="text-base font-bold text-slate-800 truncate">{data.name}</h3>
        <p className="text-xs text-slate-400 font-mono">ID: {data.id}</p>

        <div className="mt-2 bg-slate-50 p-2 rounded-lg text-xs space-y-1 text-slate-700 border border-slate-100">
          <div className="flex justify-between">
            <span>Direct Downlines:</span>
            <span className="font-bold">{data.directCount} / 10</span>
          </div>
          <div className="flex justify-between">
            <span>Business Volume:</span>
            <span className="font-semibold text-blue-600">{data.calculatedBv} BV</span>
          </div>
          <div className="flex justify-between border-t border-slate-200/60 pt-1 mt-1 font-medium">
            <span>Incentive ({data.levelCommissionPercentage}%):</span>
            <span className="text-green-600 font-bold">₹{data.estimatedEarnings}</span>
          </div>
        </div>

        {data.hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onExpand(data.id, data.level);
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline mt-2 text-center w-full cursor-pointer bg-transparent border-none outline-none"
          >
            Expand Level Downlines
          </button>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </div>
  );
};

const nodeTypes = { userNode: CustomUserNode };

const CANVAS_WIDTH = 3000;
const CANVAS_HEIGHT = 2200;

// --- Dagre Layout Engine ---
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: "TB", nodesep: 70, ranksep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 290, height: 160 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 145,
        y: nodeWithPosition.y - 80,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// --- Main Tree Component ---
export default function DreamTreeView() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(false);

  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  // ── Fetch downline children (expand node click) ───────────────────────────
  const fetchDownlineData = useCallback(async (userId: string, currentLevel: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:56188/api/Tree?currentLevel=${currentLevel}`,
        {
          headers: {
            "Authorization": `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Network response breakdown");

      const data = await response.json();
      return data.children || [];
    } catch (err) {
      console.error("Failed to sync matrix downline nodes from C# ledger:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Expand node handler ───────────────────────────────────────────────────
  const handleExpandNode = useCallback(async (nodeId: string, currentLevel: number) => {
    const downlineData = await fetchDownlineData(nodeId, currentLevel);
    if (!downlineData.length) return;

    const currentNodes = [...nodesRef.current];
    const currentEdges = [...edgesRef.current];

    downlineData.forEach((child: any) => {
      if (!currentNodes.some((n) => n.id === child.id)) {
        currentNodes.push({
          id: child.id,
          type: "userNode",
          data: { ...child, onExpand: handleExpandNode },
          position: { x: 0, y: 0 },
        });
      }

      const edgeId = `e-${nodeId}-${child.id}`;
      if (!currentEdges.some((e) => e.id === edgeId)) {
        currentEdges.push({
          id: edgeId,
          source: nodeId,
          target: child.id,
          animated: true,
          style: { stroke: "#94a3b8", strokeWidth: 2 },
        });
      }
    });

    const layouted = getLayoutedElements(currentNodes, currentEdges);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [fetchDownlineData, setNodes, setEdges]);

  // ── Initial root node load ────────────────────────────────────────────────
  useEffect(() => {
    const initTree = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:56188/api/Tree?currentLevel=0`,
          {
            headers: {
              "Authorization": `Bearer ${getToken()}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (!response.ok) throw new Error("Failed to load root node");

        const rootData = await response.json();

        const initialNodes: Node[] = [
          {
            id: rootData.id,
            type: "userNode",
            data: { ...rootData, onExpand: handleExpandNode },
            position: { x: 450, y: 80 },
          },
        ];

        setNodes(initialNodes);
      } catch (err) {
        console.error("Initialization failed:", err);
      } finally {
        setLoading(false);
      }
    };
    initTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 h-full overflow-hidden relative">
        <LoginTopbar />

        <div className="relative flex-1 w-full h-full bg-white overflow-hidden">
          <ReactFlowProvider>

            {loading && (
              <div className="absolute top-4 right-4 z-50 bg-blue-600 text-white font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg animate-pulse">
                Syncing Live Ledger Database Matrix...
              </div>
            )}

            <div className="w-full h-full overflow-auto select-none bg-white">
              <div className="select-none bg-white" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodeTypes={nodeTypes}
                  nodesDraggable={false}
                  panOnScroll={false}
                  zoomOnScroll={false}
                  zoomOnPinch={true}
                  maxZoom={1.5}
                  minZoom={0.2}
                  style={{ width: "100%", height: "100%" }}
                >
                  <Background color="#cbd5e1" gap={20} size={1} />
                </ReactFlow>
              </div>
            </div>

            <Controls className="!absolute !left-4 !bottom-4 bg-white rounded-lg shadow border border-slate-200" />
            <MiniMap
              className="!absolute !right-4 !bottom-4 !m-0 rounded-lg shadow border border-slate-200"
              style={{ width: 180, height: 120, backgroundColor: "#f8fafc" }}
              zoomable
              pannable
              nodeColor="#94a3b8"
              maskColor="rgba(148, 163, 184, 0.2)"
              nodeClassName={(n) => n.type || ""}
            />

          </ReactFlowProvider>
        </div>
      </div>
    </div>
  );
}