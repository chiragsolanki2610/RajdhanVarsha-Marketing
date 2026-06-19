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
  useReactFlow,
  Node,
  Edge,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";

import Sidebar from "@/components/Sidebar";
import LoginTopbar from "@/components/loginTopbar";

const getToken = () =>
  localStorage.getItem("token") ?? sessionStorage.getItem("token") ?? "";

interface TreeNode {
  id: string;
  name: string;
  sponsorId: string;
  sponsorName: string;
  level: number;
  directCount: number;
  isEligibleForWithdrawal: boolean;
  calculatedBv: number;
  levelCommissionPercentage: number;
  estimatedEarnings: number;
  hasChildren: boolean;
  children: TreeNode[];
}

async function fetchFullTree(): Promise<TreeNode> {
  const res = await fetch("http://localhost:56188/api/Tree", {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── Dagre Layout ──────────────────────────────────────────────────────────────
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 130 });
  nodes.forEach((n) => g.setNode(n.id, { width: 290, height: 200 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return {
    nodes: nodes.map((n) => {
      const pos = g.node(n.id);
      return { ...n, position: { x: pos.x - 145, y: pos.y - 100 } };
    }),
    edges,
  };
};

// ── Build a map of nodeId → TreeNode for quick lookup ─────────────────────────
function buildNodeMap(node: TreeNode, map: Map<string, TreeNode>) {
  map.set(node.id, node);
  node.children.forEach((c) => buildNodeMap(c, map));
}

// ── Get all ancestor IDs of a node (path from root to node) ──────────────────
function getAncestorIds(nodeId: string, nodeMap: Map<string, TreeNode>): Set<string> {
  const ancestors = new Set<string>();
  const node = nodeMap.get(nodeId);
  if (!node) return ancestors;

  // Walk up via sponsorId
  let current: TreeNode | undefined = node;
  while (current && current.sponsorId) {
    const parent = nodeMap.get(current.sponsorId);
    if (!parent) break;
    ancestors.add(parent.id);
    current = parent;
  }
  return ancestors;
}

// ── Collect all IDs in a subtree ─────────────────────────────────────────────
function getSubtreeIds(node: TreeNode): Set<string> {
  const ids = new Set<string>();
  const walk = (n: TreeNode) => {
    ids.add(n.id);
    n.children.forEach(walk);
  };
  walk(node);
  return ids;
}

// ── Custom Node ───────────────────────────────────────────────────────────────
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
            <span className="text-green-600 font-bold">
              ₹{Number(data.estimatedEarnings).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          {/* Expand: focus into this node's subtree, hide siblings */}
          {data.hasChildren && (
            <button
              onClick={(e) => { e.stopPropagation(); data.onExpand(data.id); }}
              className="flex-1 text-xs text-white bg-blue-500 hover:bg-blue-600 font-semibold py-1 px-2 rounded cursor-pointer border-none outline-none"
            >
              ▼ Expand
            </button>
          )}

          {/* Back: go up one level (show parent's siblings again) */}
          {data.canGoBack && (
            <button
              onClick={(e) => { e.stopPropagation(); data.onBack(data.id); }}
              className="flex-1 text-xs text-white bg-slate-500 hover:bg-slate-600 font-semibold py-1 px-2 rounded cursor-pointer border-none outline-none"
            >
              ← Back
            </button>
          )}
        </div>

        {data.hasChildren && !data.expanded && (
          <p className="text-[10px] text-slate-400 text-center">
            {data.childCount} downline(s) below
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </div>
  );
};

const nodeTypes = { userNode: CustomUserNode };

// ── Tree Canvas ───────────────────────────────────────────────────────────────
function TreeCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Full tree from API — never mutated
  const fullTree = useRef<TreeNode | null>(null);
  // Map of id → TreeNode for O(1) lookup
  const nodeMap = useRef<Map<string, TreeNode>>(new Map());
  // Current focused node id (null = show root + level 1)
  const focusedNodeId = useRef<string | null>(null);
  // Stack of previously focused node ids for "Back" navigation
  const historyStack = useRef<string[]>([]);

  const { fitView } = useReactFlow();

  // ── Render a specific subtree into ReactFlow ────────────────────────────────
  const renderView = useCallback(
    (
      focusNode: TreeNode | null,
      callbacks: { onExpand: (id: string) => void; onBack: (id: string) => void }
    ) => {
      const allNodes: Node[] = [];
      const allEdges: Edge[] = [];

      const canGoBack = historyStack.current.length > 0;

      const addNode = (n: TreeNode, parentId?: string) => {
        allNodes.push({
          id: n.id,
          type: "userNode",
          data: {
            ...n,
            childCount: n.children.length,
            canGoBack: canGoBack && n.id === focusNode?.id,
            onExpand: callbacks.onExpand,
            onBack: callbacks.onBack,
          },
          position: { x: 0, y: 0 },
        });

        if (parentId) {
          allEdges.push({
            id: `e-${parentId}-${n.id}`,
            source: parentId,
            target: n.id,
            animated: true,
            style: { stroke: "#94a3b8", strokeWidth: 2 },
          });
        }
      };

      if (!focusNode) {
        // Root view: show root + its direct children only
        const root = fullTree.current!;
        addNode(root);
        root.children.forEach((child) => addNode(child, root.id));
      } else {
        // Focused view: show FULL ANCESTOR CHAIN → focused node → focused node's children
        // Build ancestor list from history stack (oldest → newest)
        const stack = historyStack.current;

        // Resolve each history entry to a TreeNode
        const ancestorNodes: TreeNode[] = [];
        for (const histId of stack) {
          if (histId === "ROOT") {
            if (fullTree.current) ancestorNodes.push(fullTree.current);
          } else {
            const n = nodeMap.current.get(histId);
            if (n) ancestorNodes.push(n);
          }
        }

        // Render ancestor chain as a vertical spine (no siblings)
        let prevId: string | undefined = undefined;
        for (const ancestor of ancestorNodes) {
          addNode(ancestor, prevId);
          prevId = ancestor.id;
        }

        // Render focused node connected to last ancestor
        addNode(focusNode, prevId);

        // Render focused node's children
        focusNode.children.forEach((child) => addNode(child, focusNode.id));
      }

      const layouted = getLayoutedElements(allNodes, allEdges);
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
      setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 60);
    },
    [setNodes, setEdges, fitView]
  );

  // ── Callbacks (stable refs to avoid stale closures) ────────────────────────
  const callbacksRef = useRef({
    onExpand: (id: string) => {},
    onBack: (id: string) => {},
  });

  const handleExpand = useCallback((id: string) => {
    const node = nodeMap.current.get(id);
    if (!node || !node.hasChildren) return;

    // Push current focus onto history stack
    historyStack.current.push(focusedNodeId.current ?? "ROOT");
    focusedNodeId.current = id;

    renderView(node, callbacksRef.current);
  }, [renderView]);

  const handleBack = useCallback((_id: string) => {
    const prev = historyStack.current.pop();
    if (prev === undefined) return;

    if (prev === "ROOT") {
      focusedNodeId.current = null;
      renderView(null, callbacksRef.current);
    } else {
      const prevNode = nodeMap.current.get(prev);
      focusedNodeId.current = prev;
      renderView(prevNode ?? null, callbacksRef.current);
    }
  }, [renderView]);

  // Keep callbacksRef up to date
  useEffect(() => {
    callbacksRef.current = { onExpand: handleExpand, onBack: handleBack };
  }, [handleExpand, handleBack]);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const tree = await fetchFullTree();
        fullTree.current = tree;
        buildNodeMap(tree, nodeMap.current);
        // Start with root view
        renderView(null, callbacksRef.current);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex-1 w-full h-full bg-white overflow-hidden">

      {/* Breadcrumb trail */}
      {historyStack.current.length > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow text-xs text-slate-500">
          <span
            className="cursor-pointer hover:text-blue-600"
            onClick={() => {
              historyStack.current = [];
              focusedNodeId.current = null;
              renderView(null, callbacksRef.current);
            }}
          >
            🌳 Root
          </span>
          {historyStack.current.map((id, i) => {
            const n = id === "ROOT" ? fullTree.current : nodeMap.current.get(id);
            return (
              <React.Fragment key={i}>
                <span className="text-slate-300">›</span>
                <span
                  className="cursor-pointer hover:text-blue-600 font-medium text-slate-700"
                  onClick={() => {
                    // Navigate back to this breadcrumb level
                    historyStack.current = historyStack.current.slice(0, i);
                    const targetId = id === "ROOT" ? null : id;
                    focusedNodeId.current = targetId;
                    const targetNode = targetId ? nodeMap.current.get(targetId) : null;
                    renderView(targetNode ?? null, callbacksRef.current);
                  }}
                >
                  {n?.name ?? id}
                </span>
              </React.Fragment>
            );
          })}
          <span className="text-slate-300">›</span>
          <span className="font-semibold text-blue-600">
            {nodeMap.current.get(focusedNodeId.current ?? "")?.name ?? "Current"}
          </span>
        </div>
      )}

      {loading && (
        <div className="absolute top-4 right-4 z-50 bg-blue-600 text-white font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg animate-pulse">
          Syncing Live Ledger Database Matrix...
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900 border border-red-500 text-red-200 font-mono text-xs px-4 py-2 rounded-lg shadow-lg max-w-md text-center">
          ❌ {error}
        </div>
      )}

      {!loading && !error && nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 z-10">
          <div className="text-5xl mb-4">🌳</div>
          <div className="text-lg font-semibold">No network data found</div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        panOnScroll={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        maxZoom={1.5}
        minZoom={0.05}
        style={{ width: "100%", height: "100%" }}
      >
        <Background color="#cbd5e1" gap={20} size={1} />
        <Controls className="!left-4 !bottom-4 bg-white rounded-lg shadow border border-slate-200" />
        <MiniMap
          className="!right-4 !bottom-4 !m-0 rounded-lg shadow border border-slate-200"
          style={{ width: 180, height: 120, backgroundColor: "#f8fafc" }}
          zoomable pannable
          nodeColor="#94a3b8"
          maskColor="rgba(148, 163, 184, 0.2)"
          nodeClassName={(n) => n.type || ""}
        />
      </ReactFlow>
    </div>
  );
}

export default function DreamTreeView() {
  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 h-full overflow-hidden relative">
        <LoginTopbar />
        <ReactFlowProvider>
          <TreeCanvas />
        </ReactFlowProvider>
      </div>
    </div>
  );
}