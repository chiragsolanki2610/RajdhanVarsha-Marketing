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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://localhost:56187";

const getToken = () =>
  localStorage.getItem("authToken") ??
  localStorage.getItem("token") ??
  sessionStorage.getItem("token") ??
  "";

interface TreeNode {
  id: string;
  name: string;
  sponsorId: string;
  sponsorName: string;
  idStatus: string;
  level: number;
  directCount: number;
  isEligibleForWithdrawal: boolean;
  calculatedBv: number;
  levelCommissionPercentage: number;
  estimatedEarnings: number;
  totalIncentive: number;
  hasChildren: boolean;
  children: TreeNode[];
}

interface WalletDto {
  planType: string;
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
}

async function fetchFullTree(): Promise<TreeNode> {
  const res = await fetch(`${API_URL}/api/Tree`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function fetchTotalEarned(): Promise<number> {
  try {
    const res = await fetch(`${API_URL}/api/wallet`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return 0;
    const wallets: WalletDto[] = await res.json();
    return wallets.reduce((sum, w) => sum + (w.totalEarned ?? 0), 0);
  } catch {
    return 0;
  }
}

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

function buildNodeMap(node: TreeNode, map: Map<string, TreeNode>) {
  map.set(node.id, node);
  node.children.forEach((c) => buildNodeMap(c, map));
}

const CustomUserNode = ({ data }: { data: any }) => {
  const requirementMet = data.directCount >= 3;
  const isRoot = data.level === 0;

  return (
    <div
      className={`select-text p-4 rounded-xl shadow-lg border-2 w-72 bg-white transition-all ${
        requirementMet
          ? "border-green-500 shadow-green-100"
          : "border-amber-500 shadow-amber-100"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Level {data.level}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              requirementMet
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {requirementMet ? "Withdrawal Active" : "Locked (Min 3 Directs)"}
          </span>
        </div>

        <h3 className="text-base font-bold text-slate-800 truncate flex items-center gap-2">
          {data.name}
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
              String(data.idStatus).toLowerCase() === "active"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {String(data.idStatus).toLowerCase() === "active" ? "Active" : "Inactive"}
          </span>
        </h3>
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
            {isRoot ? (
              <>
                <span>Total Earning:</span>
                <span className="text-green-600 font-bold">
                  ₹{Number(data.rootTotalEarned ?? 0).toFixed(2)}
                </span>
              </>
            ) : (
              <>
                <span>Commission to Parent:</span>
                <span className="text-green-600 font-bold">
                  ₹{Number(data.estimatedEarnings).toFixed(2)}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          {data.hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onExpand(data.id);
              }}
              className="flex-1 text-xs text-white bg-blue-500 hover:bg-blue-600 font-semibold py-1 px-2 rounded cursor-pointer border-none outline-none"
            >
              ▼ Expand
            </button>
          )}

          {data.canGoBack && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onBack(data.id);
              }}
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

function TreeCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fullTree = useRef<TreeNode | null>(null);
  const nodeMap = useRef<Map<string, TreeNode>>(new Map());
  const focusedNodeId = useRef<string | null>(null);
  const historyStack = useRef<string[]>([]);
  const rootTotalEarned = useRef<number>(0);
  const isInitialLoad = useRef<boolean>(true);

  const { fitView, setCenter } = useReactFlow();

  const renderView = useCallback(
    (
      focusNode: TreeNode | null,
      callbacks: { onExpand: (id: string) => void; onBack: (id: string) => void },
      shouldFitView = false
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
            rootTotalEarned: rootTotalEarned.current,
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
        const root = fullTree.current!;
        addNode(root);
        root.children.forEach((child) => addNode(child, root.id));
      } else {
        const stack = historyStack.current;

        const ancestorNodes: TreeNode[] = [];
        for (const histId of stack) {
          if (histId === "ROOT") {
            if (fullTree.current) ancestorNodes.push(fullTree.current);
          } else {
            const n = nodeMap.current.get(histId);
            if (n) ancestorNodes.push(n);
          }
        }

        let prevId: string | undefined = undefined;
        for (const ancestor of ancestorNodes) {
          addNode(ancestor, prevId);
          prevId = ancestor.id;
        }

        addNode(focusNode, prevId);
        focusNode.children.forEach((child) => addNode(child, focusNode.id));
      }

      const layouted = getLayoutedElements(allNodes, allEdges);
      setNodes(layouted.nodes);
      setEdges(layouted.edges);

      // Only fitView on initial load or when explicitly requested (back button)
      if (shouldFitView) {
        setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 60);
      }
    },
    [setNodes, setEdges, fitView]
  );

  const callbacksRef = useRef({
    onExpand: (id: string) => {},
    onBack: (id: string) => {},
  });

  const handleExpand = useCallback(
    (id: string) => {
      const node = nodeMap.current.get(id);
      if (!node || !node.hasChildren) return;
      if (id === focusedNodeId.current) return;

      historyStack.current.push(focusedNodeId.current ?? "ROOT");
      focusedNodeId.current = id;

      // No fitView on expand — keep current zoom level
      renderView(node, callbacksRef.current, false);
    },
    [renderView]
  );

  const handleBack = useCallback(
    (_id: string) => {
      const prev = historyStack.current.pop();
      if (prev === undefined) return;

      if (prev === "ROOT") {
        focusedNodeId.current = null;
        // fitView on back so user can see the full tree again
        renderView(null, callbacksRef.current, true);
      } else {
        const prevNode = nodeMap.current.get(prev);
        focusedNodeId.current = prev;
        renderView(prevNode ?? null, callbacksRef.current, true);
      }
    },
    [renderView]
  );

  useEffect(() => {
    callbacksRef.current = { onExpand: handleExpand, onBack: handleBack };
  }, [handleExpand, handleBack]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [tree, totalEarned] = await Promise.all([
          fetchFullTree(),
          fetchTotalEarned(),
        ]);
        fullTree.current = tree;
        rootTotalEarned.current = totalEarned;
        buildNodeMap(tree, nodeMap.current);
        // fitView only on first load
        renderView(null, callbacksRef.current, true);
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

      {historyStack.current.length > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow text-xs text-slate-500">
          <span
            className="cursor-pointer hover:text-blue-600"
            onClick={() => {
              historyStack.current = [];
              focusedNodeId.current = null;
              renderView(null, callbacksRef.current, true);
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
                    historyStack.current = historyStack.current.slice(0, i);
                    const targetId = id === "ROOT" ? null : id;
                    focusedNodeId.current = targetId;
                    const targetNode = targetId ? nodeMap.current.get(targetId) : null;
                    renderView(targetNode ?? null, callbacksRef.current, true);
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
          zoomable
          pannable
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